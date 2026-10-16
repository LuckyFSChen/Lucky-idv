import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '../src/db/client.js'
import type { Env } from '../../worker/env.js'
import { handleAdminApi } from '../../worker/routes/admin.js'
import { handlePublicApi } from '../../worker/routes/public.js'
import { signAdminToken } from '../../worker/lib/jwt.js'

const env = { JWT_SECRET: 'worker-upload-test-only', UPLOADS: { put: vi.fn() } } as unknown as Env
const profile = { id: 1, contactLinks: null }
const prisma = {
  profile: { findFirst: vi.fn(), update: vi.fn() },
  project: { findMany: vi.fn() },
} as unknown as PrismaClient
let token: string

beforeEach(async () => {
  vi.resetAllMocks()
  vi.mocked(prisma.profile.findFirst).mockResolvedValue(profile as never)
  vi.mocked(prisma.profile.update).mockImplementation(async ({ data }) => ({ ...profile, ...data }) as never)
  token = await signAdminToken({ sub: 1, email: 'test@example.com' }, env.JWT_SECRET!, 60)
})

async function upload(type = 'image/png', size = 3, route = 'project-images', authorized = true, bindings = env) {
  const form = new FormData()
  if (size >= 0) form.set(route === 'avatar' ? 'avatar' : 'image', new File([new Uint8Array(size)], 'image', { type }))
  const path = `/api/admin/${route}`
  return handleAdminApi(new Request(`https://example.com${path}`, {
    method: 'POST', body: form, headers: authorized ? { authorization: `Bearer ${token}` } : {},
  }), bindings, prisma, path)
}

describe('Worker R2 image uploads', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('stores %s with project prefix and metadata', async (type) => {
    const response = await upload(type)
    expect(response.status).toBe(201)
    const { url } = await response.json() as { url: string }
    expect(url).toMatch(/^\/uploads\/project-\d+-[a-f0-9]{12}\.(jpg|png|webp)$/)
    expect(env.UPLOADS!.put).toHaveBeenCalledWith(url.slice(9), expect.any(ArrayBuffer), { httpMetadata: { contentType: type } })
  })
  it('requires authentication', async () => {
    expect((await upload('image/png', 3, 'project-images', false)).status).toBe(401)
    expect(env.UPLOADS!.put).not.toHaveBeenCalled()
  })
  it.each(['project-images', 'avatar'])('rejects invalid uploads for %s', async (route) => {
    for (const [type, size, error] of [
      ['text/plain', 3, '僅允許上傳 jpg、png 或 webp 格式的圖片。'],
      ['image/png', 5 * 1024 * 1024 + 1, '檔案大小不得超過 5 MB。'],
      ['image/png', -1, '請選擇要上傳的圖片。'],
    ] as const) {
      const response = await upload(type, size, route)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error })
    }
    expect(env.UPLOADS!.put).not.toHaveBeenCalled()
  })
  it('accepts exactly 5MB', async () => {
    expect((await upload('image/png', 5 * 1024 * 1024)).status).toBe(201)
  })
  it('returns 501 without R2', async () => {
    expect((await upload('image/png', 3, 'project-images', true, { JWT_SECRET: env.JWT_SECRET })).status).toBe(501)
  })
  it('rejects unsupported methods and nested routes', async () => {
    for (const [path, status] of [['/api/admin/project-images', 405], ['/api/admin/project-images/1', 404]] as const) {
      const response = await handleAdminApi(new Request(`https://example.com${path}`, { headers: { authorization: `Bearer ${token}` } }), env, prisma, path)
      expect(response.status).toBe(status)
    }
  })
  it('keeps avatar response and avoids orphan uploads without profile', async () => {
    const response = await upload('image/png', 3, 'avatar')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: 1, avatarUrl: expect.stringMatching(/^\/uploads\/avatar-/) })
    vi.mocked(env.UPLOADS!.put).mockClear()
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null)
    expect((await upload('image/png', 3, 'avatar')).status).toBe(404)
    expect(env.UPLOADS!.put).not.toHaveBeenCalled()
  })
  it('serializes project image lists and legacy nulls', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { imageUrls: '["/uploads/a","/uploads/b"]' }, { imageUrls: null },
    ] as never)
    const response = await handlePublicApi(prisma, '/api/projects')
    expect(await response!.json()).toMatchObject([{ imageUrls: ['/uploads/a', '/uploads/b'] }, { imageUrls: [] }])
  })
})
