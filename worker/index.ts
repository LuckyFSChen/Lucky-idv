import { getPrisma } from '../backend/src/db/client.js'
import { parseContactLinks, parseStringArray } from '../backend/src/utils/json.js'

export interface Env {
  DB?: D1Database
  API_PROXY_ORIGIN?: string
}

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
} as const

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname } = url

    // Health check
    if (pathname === '/api/health' && request.method === 'GET') {
      return json({ status: 'ok' })
    }

    const isApi = pathname.startsWith('/api/')
    const isUploads = pathname.startsWith('/uploads/')

    // 本機開發仍保留 Express proxy 行為
    if ((isApi || isUploads) && env.API_PROXY_ORIGIN) {
      const target = new URL(pathname + url.search, env.API_PROXY_ORIGIN)
      return fetch(new Request(target, request))
    }

    // Production uploads 尚未搬到 R2
    if (isUploads) {
      return new Response('Not Found', { status: 404 })
    }

    // 後面的 public API 都需要 D1
    if (
      request.method === 'GET' &&
      (
        pathname === '/api/profile' ||
        pathname === '/api/skills' ||
        pathname === '/api/experience' ||
        pathname === '/api/projects'
      )
    ) {
      if (!env.DB) {
        return json({ error: 'D1 database binding DB is not configured.' }, 500)
      }

      try {
        const prisma = getPrisma(env)

        if (pathname === '/api/profile') {
          const profile = await prisma.profile.findFirst({
            orderBy: { id: 'asc' },
          })

          if (!profile) {
            return json({ error: '找不到個人資料' }, 404)
          }

          return json({
            ...profile,
            contactLinks: parseContactLinks(profile.contactLinks),
          })
        }

        if (pathname === '/api/skills') {
          const categories = await prisma.skillCategory.findMany({
            orderBy: { sortOrder: 'asc' },
            include: {
              skills: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          })

          return json(categories)
        }

        if (pathname === '/api/experience') {
          const experiences = await prisma.experience.findMany({
            orderBy: { sortOrder: 'asc' },
          })

          return json(
            experiences.map((experience) => ({
              ...experience,
              highlightsZh: parseStringArray(experience.highlightsZh),
              highlightsEn: parseStringArray(experience.highlightsEn),
            })),
          )
        }

        if (pathname === '/api/projects') {
          const projects = await prisma.project.findMany({
            orderBy: { sortOrder: 'asc' },
          })

          return json(
            projects.map((project) => ({
              ...project,
              highlightsZh: parseStringArray(project.highlightsZh),
              highlightsEn: parseStringArray(project.highlightsEn),
              techStack: parseStringArray(project.techStack),
            })),
          )
        }
      } catch (error) {
        console.error('Public API failed:', error)

        return json(
          {
            error: '資料載入失敗',
          },
          500,
        )
      }
    }

    // 其他尚未搬移的 API，例如 /api/admin/*
    if (isApi) {
      return json(
        {
          error: '此 API 尚未遷移至 Cloudflare Workers。',
        },
        501,
      )
    }

    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>