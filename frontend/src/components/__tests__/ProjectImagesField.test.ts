import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProjectImagesField from '@/components/admin/ProjectImagesField.vue'
import { adminApi } from '@/api/adminClient'
import { MAX_PROJECT_IMAGE_SIZE_BYTES } from '@/constants/projectImages'

vi.mock('@/api/adminClient', () => ({ adminApi: { uploadProjectImage: vi.fn() } }))

const wrappers: ReturnType<typeof mount>[] = []
function render(images: string[] = []) {
  const wrapper = mount(ProjectImagesField, {
    props: { modelValue: images },
    global: { plugins: [createPinia()] },
  })
  wrappers.push(wrapper)
  return wrapper
}

async function selectFiles(wrapper: ReturnType<typeof render>, files: File[]) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: files, configurable: true })
  await input.trigger('change')
  await flushPromises()
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

describe('ProjectImagesField', () => {
  it('disables selection at three images and displays the limit', () => {
    const wrapper = render(['/one.jpg', '/two.jpg', '/three.jpg'])
    expect(wrapper.get('input').element.disabled).toBe(true)
    expect(wrapper.text()).toContain('最多 3 張圖片（每張 5MB 以內）')
    expect(wrapper.get('input').attributes('accept')).toBe('image/jpeg,image/png,image/webp')
  })

  it('rejects an oversized image before calling the API', async () => {
    const wrapper = render()
    const file = new File(['image'], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: MAX_PROJECT_IMAGE_SIZE_BYTES + 1 })
    await selectFiles(wrapper, [file])
    expect(adminApi.uploadProjectImage).not.toHaveBeenCalled()
    expect(wrapper.emitted('error')?.[0]?.[0]).toEqual(new Error('圖片大小不可超過 5MB。'))
  })

  it('validates the entire batch before uploading', async () => {
    const wrapper = render()
    await selectFiles(wrapper, [
      new File(['image'], 'valid.jpg', { type: 'image/jpeg' }),
      new File(['text'], 'invalid.txt', { type: 'text/plain' }),
    ])
    expect(adminApi.uploadProjectImage).not.toHaveBeenCalled()
    expect(wrapper.emitted('error')?.[0]?.[0]).toEqual(new Error('僅允許上傳 jpg、png 或 webp 格式的圖片。'))
  })

  it('rejects a batch exceeding the remaining slots', async () => {
    const wrapper = render(['/one.jpg', '/two.jpg'])
    await selectFiles(wrapper, [1, 2].map(i => new File(['image'], `${i}.png`, { type: 'image/png' })))
    expect(adminApi.uploadProjectImage).not.toHaveBeenCalled()
    expect(wrapper.emitted('error')?.[0]?.[0]).toEqual(new Error('最多 3 張圖片（每張 5MB 以內）。'))
  })

  it('accepts exactly 5MB and appends the returned URL', async () => {
    vi.mocked(adminApi.uploadProjectImage).mockResolvedValue({ url: '/uploads/project-new.jpg' })
    const wrapper = render(['/one.jpg'])
    const file = new File(['image'], 'new.jpg', { type: 'image/jpeg' })
    Object.defineProperty(file, 'size', { value: MAX_PROJECT_IMAGE_SIZE_BYTES })
    await selectFiles(wrapper, [file])
    expect(adminApi.uploadProjectImage).toHaveBeenCalledOnce()
    expect(wrapper.emitted('update:modelValue')).toEqual([[['/one.jpg', '/uploads/project-new.jpg']]])
    expect(wrapper.emitted('busy')).toEqual([[true], [false]])
  })

  it('forwards the original upload error and restores the input', async () => {
    const error = new Error('伺服器拒絕圖片')
    vi.mocked(adminApi.uploadProjectImage).mockRejectedValue(error)
    const wrapper = render()
    await selectFiles(wrapper, [new File(['image'], 'new.webp', { type: 'image/webp' })])
    expect(wrapper.emitted('error')?.[0]?.[0]).toBe(error)
    expect(wrapper.emitted('busy')).toEqual([[true], [false]])
    expect(wrapper.get('input').element.disabled).toBe(false)
  })
})
