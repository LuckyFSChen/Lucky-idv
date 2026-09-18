import type { NextFunction, Request, Response } from 'express'
import { verifyAdminToken, type AdminTokenPayload } from '../utils/jwt.js'

declare module 'express-serve-static-core' {
  interface Request {
    admin?: AdminTokenPayload
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '未授權，請先登入。' })
    return
  }

  const token = header.slice('Bearer '.length)
  try {
    req.admin = verifyAdminToken(token)
    next()
  } catch {
    res.status(401).json({ error: 'Token 無效或已過期，請重新登入。' })
  }
}
