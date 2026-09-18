import path from 'node:path'
import crypto from 'node:crypto'
import multer from 'multer'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const uploadsDir = path.join(process.cwd(), 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = ALLOWED_MIME_TYPES[file.mimetype] ?? path.extname(file.originalname)
    cb(null, `avatar-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  },
})

const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB ?? 5)

export const avatarUpload = multer({
  storage,
  limits: { fileSize: maxSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new Error('僅允許上傳 jpg、png 或 webp 格式的圖片。'))
      return
    }
    cb(null, true)
  },
})
