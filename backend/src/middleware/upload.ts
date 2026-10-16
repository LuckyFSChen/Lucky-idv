import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'

// Worker 不可匯入此 Node 模組；worker/routes/admin.ts 的白名單須與此保持一致。
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const uploadsDir = path.join(process.cwd(), 'uploads')

const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB ?? 5)

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(new Error('僅允許上傳 jpg、png 或 webp 格式的圖片。'))
    return
  }
  cb(null, true)
}

function createImageUpload(prefix: string) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir)
    },
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? path.extname(file.originalname)
      cb(null, `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
    },
  })

  return multer({
    storage,
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter,
  })
}

export const avatarUpload = createImageUpload('avatar')
export const projectImageUpload = createImageUpload('project')
