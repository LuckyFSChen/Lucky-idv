import path from 'node:path'
import 'dotenv/config'
import cors from 'cors'
import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { adminRouter } from './routes/admin.js'
import { publicRouter } from './routes/public.js'

const app = express()

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
app.use(express.json())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err)
    return
  }
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: '檔案上傳失敗：' + err.message })
    return
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message })
    return
  }
  res.status(500).json({ error: '伺服器發生未預期的錯誤。' })
})

export default app
