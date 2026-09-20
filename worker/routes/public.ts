/**
 * 公開 API（免驗證的 GET），對應 backend/src/routes/public.ts。
 *
 * ⚠️ PUBLIC_API_PATHS 必須與 frontend/src/api/client.ts 及 stores/portfolio.ts 的
 *    fetchAll() 保持一致。portfolio store 以 Promise.all 併發抓取，只要**任何一條**
 *    沒被這裡處理而掉進 index.ts 的 501 分支，整個首頁就會顯示
 *    「資料載入失敗，請稍後重新整理頁面。」—— 新增前端 API 時請同步更新此處。
 */

import type { PrismaClient } from '../../backend/src/db/client.js'
import {
  serializeEngineeringCase,
  serializeExperience,
  serializeProject,
} from '../../backend/src/utils/adminData.js'
import { parseContactLinks } from '../../backend/src/utils/json.js'
import { json } from '../lib/http.js'

/** GET /api/engineering-cases/:slug —— slug 不得再含 '/'。 */
const ENGINEERING_CASE_SLUG_PATTERN = /^\/api\/engineering-cases\/([^/]+)$/

const PUBLIC_API_PATHS = new Set([
  '/api/profile',
  '/api/skills',
  '/api/experience',
  '/api/projects',
  '/api/engineering-cases',
  '/api/certifications',
])

export function isPublicApiPath(method: string, pathname: string): boolean {
  if (method !== 'GET') return false
  return PUBLIC_API_PATHS.has(pathname) || ENGINEERING_CASE_SLUG_PATTERN.test(pathname)
}

export async function handlePublicApi(prisma: PrismaClient, pathname: string): Promise<Response | null> {
  if (pathname === '/api/profile') {
    const profile = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })
    if (!profile) return json({ error: '找不到個人資料' }, 404)
    return json({ ...profile, contactLinks: parseContactLinks(profile.contactLinks) })
  }

  if (pathname === '/api/skills') {
    const categories = await prisma.skillCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { skills: { orderBy: { sortOrder: 'asc' } } },
    })
    return json(categories)
  }

  if (pathname === '/api/experience') {
    const experiences = await prisma.experience.findMany({ orderBy: { sortOrder: 'asc' } })
    return json(experiences.map(serializeExperience))
  }

  if (pathname === '/api/projects') {
    const projects = await prisma.project.findMany({ orderBy: { sortOrder: 'asc' } })
    return json(projects.map(serializeProject))
  }

  if (pathname === '/api/engineering-cases') {
    const cases = await prisma.engineeringCase.findMany({
      where: { published: true },
      orderBy: { sortOrder: 'asc' },
    })
    return json(cases.map(serializeEngineeringCase))
  }

  if (pathname === '/api/certifications') {
    const certifications = await prisma.certification.findMany({ orderBy: { sortOrder: 'asc' } })
    return json(certifications)
  }

  const slugMatch = ENGINEERING_CASE_SLUG_PATTERN.exec(pathname)
  if (slugMatch) {
    const slug = decodeURIComponent(slugMatch[1])
    const engineeringCase = await prisma.engineeringCase.findFirst({ where: { slug, published: true } })
    if (!engineeringCase) return json({ error: '找不到指定的工程案例。' }, 404)
    return json(serializeEngineeringCase(engineeringCase))
  }

  return null
}
