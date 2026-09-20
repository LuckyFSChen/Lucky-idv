<script setup lang="ts">
/**
 * 大頭貼裁切對話框。
 *
 * 設計重點：**預覽與輸出共用同一個 draw()**。
 * 預覽不是用 CSS transform 疊出來的，而是直接畫在 canvas 上，輸出時只是換一個
 * 解析度再畫一次。這樣就不可能出現「預覽看起來對、存檔後位置跑掉」的經典錯位。
 *
 * 狀態以「預覽框邏輯尺寸（VIEW）」為單位保存，與實際 CSS 寬度、devicePixelRatio
 * 無關，因此在任何螢幕上結果都一致。
 *
 * 輸出固定為 512×512，格式優先 webp、退回 jpeg，體積遠低於後端 5MB 上限
 * —— 也就是說，裁切流程同時解決了「原圖太大被拒絕」的問題。
 */

import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

const props = defineProps<{ file: File }>()
const emit = defineEmits<{ cancel: []; apply: [file: File] }>()

/** 預覽框的邏輯尺寸；所有位移／縮放狀態都以此為單位。 */
const VIEW = 320
/** 輸出邊長（正方形）。 */
const OUTPUT = 512
const MAX_ZOOM = 5

interface LoadedImage {
  source: ImageBitmap | HTMLImageElement
  width: number
  height: number
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
const image = shallowRef<LoadedImage | null>(null)
const loadError = ref<string | null>(null)
const busy = ref(false)

const zoom = ref(1)
const rotation = ref(0)
const offsetX = ref(0)
const offsetY = ref(0)

/** 需要主動釋放的資源（ImageBitmap / objectURL）。 */
let objectUrl: string | null = null

/** 旋轉 90 度的奇數倍時，寬高互換。 */
const rotatedSize = computed(() => {
  const img = image.value
  if (!img) return { width: 1, height: 1 }
  const swapped = Math.abs(rotation.value % 180) === 90
  return swapped ? { width: img.height, height: img.width } : { width: img.width, height: img.height }
})

/** zoom = 1 時剛好填滿裁切框（cover）。 */
const coverScale = computed(() => {
  const { width, height } = rotatedSize.value
  return Math.max(VIEW / width, VIEW / height)
})

function clampOffsets() {
  const scale = coverScale.value * zoom.value
  const maxX = Math.max(0, (rotatedSize.value.width * scale - VIEW) / 2)
  const maxY = Math.max(0, (rotatedSize.value.height * scale - VIEW) / 2)
  offsetX.value = Math.min(maxX, Math.max(-maxX, offsetX.value))
  offsetY.value = Math.min(maxY, Math.max(-maxY, offsetY.value))
}

/**
 * 把目前狀態畫到指定 context。
 *
 * @param size 目標畫布邊長（像素）。狀態以 VIEW 為單位，因此先換算比例 k。
 */
function draw(ctx: CanvasRenderingContext2D, size: number) {
  const img = image.value
  ctx.clearRect(0, 0, size, size)

  // 先鋪白底：來源若是含透明區域的 PNG，輸出成 webp/jpeg 時才不會變成黑塊。
  // 預覽同樣鋪白底，維持所見即所得。
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)

  if (!img) return

  const k = size / VIEW
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.translate(offsetX.value * k, offsetY.value * k)
  ctx.rotate((rotation.value * Math.PI) / 180)
  const scale = coverScale.value * zoom.value * k
  ctx.scale(scale, scale)
  ctx.drawImage(img.source, -img.width / 2, -img.height / 2)
  ctx.restore()
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const pixelSize = Math.round(VIEW * dpr)
  if (canvas.width !== pixelSize) {
    canvas.width = pixelSize
    canvas.height = pixelSize
  }
  ctx.imageSmoothingQuality = 'high'
  draw(ctx, pixelSize)
}

watch([zoom, rotation, offsetX, offsetY, image], () => {
  clampOffsets()
  render()
})

// ─── 載入來源圖片 ────────────────────────────────────────────────────────────

async function loadImage(file: File): Promise<LoadedImage> {
  // createImageBitmap 會依 EXIF 自動轉正，手機直拍的照片才不會躺著。
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height }
    } catch {
      // 落回 <img>（部分瀏覽器不支援 imageOrientation 選項）
    }
  }

  objectUrl = URL.createObjectURL(file)
  const element = new Image()
  element.src = objectUrl
  await element.decode()
  return { source: element, width: element.naturalWidth, height: element.naturalHeight }
}

/**
 * Esc 關閉。
 *
 * ⚠️ 不能掛在 backdrop 的 @keydown.esc 上：那是個不可聚焦的 div，事件不會落到它身上。
 *    掛在 window 才是唯一可靠的做法。
 */
function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel')
}

onMounted(async () => {
  window.addEventListener('keydown', onWindowKeydown)
  // 開啟後把焦點移到畫布，方向鍵與 +/- 才能直接使用。
  canvasRef.value?.focus()
  try {
    image.value = await loadImage(props.file)
    render()
  } catch {
    loadError.value = '無法讀取這張圖片，請換一張試試。'
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  const source = image.value?.source
  if (source && 'close' in source) source.close()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})

// ─── 拖曳與縮放 ──────────────────────────────────────────────────────────────

const pointers = new Map<number, { x: number; y: number }>()
let pinchStartDistance = 0
let pinchStartZoom = 1

/** 畫面上的 CSS 像素換算成 VIEW 單位。 */
function toViewUnits(value: number): number {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return value
  return (value * VIEW) / rect.width
}

function pointerDistance(): number {
  const [a, b] = [...pointers.values()]
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function onPointerDown(event: PointerEvent) {
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2) {
    pinchStartDistance = pointerDistance()
    pinchStartZoom = zoom.value
  }
}

function onPointerMove(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  if (!previous) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (pointers.size === 1) {
    offsetX.value += toViewUnits(event.clientX - previous.x)
    offsetY.value += toViewUnits(event.clientY - previous.y)
    return
  }

  if (pointers.size === 2 && pinchStartDistance > 0) {
    const ratio = pointerDistance() / pinchStartDistance
    zoom.value = Math.min(MAX_ZOOM, Math.max(1, pinchStartZoom * ratio))
  }
}

function onPointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId)
  if (pointers.size < 2) pinchStartDistance = 0
}

function onWheel(event: WheelEvent) {
  event.preventDefault()
  const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
  zoom.value = Math.min(MAX_ZOOM, Math.max(1, zoom.value * factor))
}

/** 鍵盤操作：方向鍵微調位置、+ / - 縮放。 */
function onKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 20 : 5
  const actions: Record<string, () => void> = {
    ArrowLeft: () => (offsetX.value -= step),
    ArrowRight: () => (offsetX.value += step),
    ArrowUp: () => (offsetY.value -= step),
    ArrowDown: () => (offsetY.value += step),
    '+': () => (zoom.value = Math.min(MAX_ZOOM, zoom.value * 1.1)),
    '=': () => (zoom.value = Math.min(MAX_ZOOM, zoom.value * 1.1)),
    '-': () => (zoom.value = Math.max(1, zoom.value / 1.1)),
  }
  const action = actions[event.key]
  if (!action) return
  event.preventDefault()
  action()
}

function rotate(degrees: number) {
  rotation.value = (rotation.value + degrees + 360) % 360
  // 旋轉會改變可視範圍，位移沿用容易超出邊界，直接歸零最不容易讓人困惑。
  offsetX.value = 0
  offsetY.value = 0
}

function reset() {
  zoom.value = 1
  rotation.value = 0
  offsetX.value = 0
  offsetY.value = 0
}

// ─── 輸出 ────────────────────────────────────────────────────────────────────

/** 後端允許的格式（見 worker/routes/admin.ts 的 ALLOWED_AVATAR_TYPES）。 */
const ALLOWED_OUTPUT_TYPES = ['image/webp', 'image/jpeg', 'image/png']

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.92))
}

async function apply() {
  if (!image.value || busy.value) return
  busy.value = true
  try {
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no context')
    ctx.imageSmoothingQuality = 'high'
    draw(ctx, OUTPUT)

    // 不支援 webp 的瀏覽器，toBlob 會靜默退回 image/png —— 那也在允許清單內；
    // 若連型別都拿不到才明確改用 jpeg。
    let blob = await toBlob(canvas, 'image/webp')
    if (!blob || !ALLOWED_OUTPUT_TYPES.includes(blob.type)) {
      blob = await toBlob(canvas, 'image/jpeg')
    }
    if (!blob) throw new Error('toBlob failed')

    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
    emit('apply', new File([blob], `avatar.${extension}`, { type: blob.type }))
  } catch {
    loadError.value = '裁切失敗，請再試一次。'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div
    class="cropper__backdrop"
    @click.self="emit('cancel')"
  >
    <div
      class="cropper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cropper-title"
    >
      <h3
        id="cropper-title"
        class="cropper__title"
      >
        編輯大頭貼
      </h3>

      <p
        v-if="loadError"
        class="cropper__error"
      >
        {{ loadError }}
      </p>

      <div class="cropper__stage">
        <canvas
          ref="canvasRef"
          class="cropper__canvas"
          tabindex="0"
          aria-label="拖曳調整位置，捲動或使用縮放滑桿調整大小"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel="onWheel"
          @keydown="onKeydown"
        />
        <div
          class="cropper__mask"
          aria-hidden="true"
        />
      </div>

      <p class="cropper__hint">
        拖曳調整位置，捲動或雙指縮放。鍵盤：方向鍵移動、<kbd>+</kbd> / <kbd>-</kbd> 縮放。
      </p>

      <label class="cropper__zoom">
        <span>縮放</span>
        <input
          v-model.number="zoom"
          type="range"
          min="1"
          :max="MAX_ZOOM"
          step="0.01"
        >
      </label>

      <div class="cropper__tools">
        <button
          type="button"
          class="btn btn--secondary"
          @click="rotate(-90)"
        >
          向左旋轉
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          @click="rotate(90)"
        >
          向右旋轉
        </button>
        <button
          type="button"
          class="btn btn--secondary"
          @click="reset"
        >
          重設
        </button>
      </div>

      <div class="cropper__actions">
        <button
          type="button"
          class="btn btn--secondary"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          type="button"
          class="btn"
          :disabled="busy || !image"
          @click="apply"
        >
          {{ busy ? '處理中…' : '套用並上傳' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cropper__backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm);
  background: rgba(0, 0, 0, 0.55);
}

.cropper {
  width: min(420px, 100%);
  max-height: 100%;
  overflow-y: auto;
  padding: var(--space-md);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-card-hover);
}

.cropper__title {
  margin: 0 0 var(--space-sm);
  font-size: 1.125rem;
}

.cropper__error {
  margin: 0 0 var(--space-sm);
  color: var(--color-danger);
}

.cropper__stage {
  position: relative;
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-surface-alt);
}

.cropper__canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: grab;
  touch-action: none;
}

.cropper__canvas:active {
  cursor: grabbing;
}

.cropper__canvas:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}

/* 圓形遮罩：大頭貼在前台是圓的，這裡先讓人看到實際裁切結果。 */
.cropper__mask {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.45);
  -webkit-mask: radial-gradient(circle at center, transparent 49.5%, #000 50%);
  mask: radial-gradient(circle at center, transparent 49.5%, #000 50%);
}

.cropper__hint {
  margin: var(--space-xs) 0 0;
  color: var(--color-text-secondary);
  font-size: 0.8125rem;
  text-align: center;
}

.cropper__zoom {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-top: var(--space-sm);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.cropper__zoom input {
  flex: 1;
}

.cropper__tools,
.cropper__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  margin-top: var(--space-sm);
}

.cropper__actions {
  justify-content: flex-end;
  padding-top: var(--space-sm);
  border-top: 1px solid var(--color-border);
}
</style>
