/**
 * 管理後台 API（/api/admin/*），對應 backend/src/routes/admin.ts。
 *
 * 與 Express 版的差異（刻意為之，皆有原因）：
 *
 *   1. 密碼驗證改用 PBKDF2（見 backend/src/utils/password.ts）。
 *      bcryptjs 是純 JS，在 Workers 上會吃掉遠超單次請求上限的 CPU。
 *
 *   2. JWT 改用 Web Crypto 實作的 HS256（見 ../lib/jwt.ts），
 *      避免為了 jsonwebtoken 而開啟 nodejs_compat。
 *
 *   3. rate limit 改用 Cloudflare 的 Rate Limiting binding。
 *      express-rate-limit 把計數放在單一 process 的記憶體中，
 *      在 Workers 的多 isolate 模型下形同虛設。
 *      ⚠️ 該 binding 的 period 只支援 10 或 60 秒，因此原本的
 *         「15 分鐘 10 次」在此變成「60 秒 10 次」。
 *
 *   4. POST /avatar 改寫入 R2（Workers 沒有檔案系統，multer + 磁碟路徑不適用）。
 *      驗證規則（允許的 MIME、大小上限、檔名產生方式）與 middleware/upload.ts 一致。
 *
 * 資料轉換、序列化與 zod schema 全部沿用 backend/src 下的同一份實作，
 * 以確保本機 Express 與線上 Worker 的 API contract 完全一致。
 */

import type { PrismaClient } from '../../backend/src/db/client.js'
import {
  certificationCreateSchema,
  certificationUpdateSchema,
  engineeringCaseCreateSchema,
  engineeringCaseUpdateSchema,
  experienceCreateSchema,
  experienceUpdateSchema,
  loginSchema,
  profileUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  skillCategoryCreateSchema,
  skillCategoryUpdateSchema,
  skillCreateSchema,
  skillUpdateSchema,
} from '../../backend/src/schemas/admin.js'
import {
  isUniqueConstraintError,
  serializeEngineeringCase,
  serializeExperience,
  serializeProject,
  toCertificationCreateData,
  toCertificationUpdateData,
  toEngineeringCaseCreateData,
  toEngineeringCaseUpdateData,
  toExperienceCreateData,
  toExperienceUpdateData,
  toProjectCreateData,
  toProjectUpdateData,
} from '../../backend/src/utils/adminData.js'
import { parseContactLinks } from '../../backend/src/utils/json.js'
import { isLegacyBcryptHash, verifyPassword } from '../../backend/src/utils/password.js'
import type { Env } from '../env.js'
import { json, jsonError, noContent, readJsonBody } from '../lib/http.js'
import { parseExpiresInSeconds, signAdminToken, verifyAdminToken } from '../lib/jwt.js'

const ADMIN_PREFIX = '/api/admin/'

/** 與 backend/src/middleware/upload.ts 的 ALLOWED_MIME_TYPES 保持一致。 */
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

/** 與 Express 端 UPLOAD_MAX_SIZE_MB 的預設值一致。 */
const AVATAR_MAX_SIZE_MB = 5

export function isAdminApiPath(pathname: string): boolean {
  return pathname === '/api/admin' || pathname.startsWith(ADMIN_PREFIX)
}

/**
 * 只描述本模組用得到的 Prisma delegate 形狀。
 *
 * 這裡刻意做一次型別擦除：六個資源的 delegate（skillCategory、skill、experience…）
 * 各有不同的 model 型別，無法放進同一張設定表。輸入端的型別安全由
 * defineCrud() 的泛型在「定義處」保證（schema 的 output 必須對得上 toCreateData
 * 的參數），這裡只負責把已驗證的資料交給 Prisma。
 */
interface CrudDelegate {
  findMany(args?: { orderBy?: Record<string, unknown> }): Promise<Record<string, unknown>[]>
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>
  update(args: { where: { id: number }; data: Record<string, unknown> }): Promise<Record<string, unknown>>
  delete(args: { where: { id: number } }): Promise<unknown>
}

/** zod schema 的最小結構；不直接綁 z.ZodType 以免受 zod 版本的泛型細節影響。 */
interface Validator<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { flatten(): unknown } }
}

interface CrudResource<TCreate, TUpdate> {
  delegate: (prisma: PrismaClient) => CrudDelegate
  createSchema: Validator<TCreate>
  updateSchema: Validator<TUpdate>
  toCreateData: (data: TCreate) => Record<string, unknown>
  toUpdateData: (data: TUpdate) => Record<string, unknown>
  serialize?: (row: Record<string, unknown>) => unknown
  /** 驗證失敗時的訊息，與 Express 版逐字相同。 */
  invalidMessage: string
  notFoundMessage: string
  /** 是否支援 GET 列表（目前只有 engineering-cases）。 */
  listable?: boolean
  /** create 失敗時的自訂回應；回 null 表示交由預設的 500 處理。 */
  onCreateError?: (error: unknown) => Response | null
  /** update 失敗時的自訂回應；回 null 表示回傳 notFoundMessage 的 404。 */
  onUpdateError?: (error: unknown) => Response | null
}

/**
 * 在「定義處」保留完整型別檢查，再擦除成統一形狀放進設定表。
 * 型別轉換只在這一個地方發生。
 */
function defineCrud<TCreate, TUpdate>(resource: CrudResource<TCreate, TUpdate>): CrudResource<unknown, unknown> {
  return resource as unknown as CrudResource<unknown, unknown>
}

const CRUD_RESOURCES: Record<string, CrudResource<unknown, unknown>> = {
  'skill-categories': defineCrud({
    delegate: (prisma) => prisma.skillCategory as unknown as CrudDelegate,
    createSchema: skillCategoryCreateSchema,
    updateSchema: skillCategoryUpdateSchema,
    toCreateData: (data) => ({ ...data }),
    toUpdateData: (data) => ({ ...data }),
    invalidMessage: '技能分類格式不正確。',
    notFoundMessage: '找不到指定的技能分類。',
  }),

  skills: defineCrud({
    delegate: (prisma) => prisma.skill as unknown as CrudDelegate,
    createSchema: skillCreateSchema,
    updateSchema: skillUpdateSchema,
    toCreateData: (data) => ({ ...data }),
    toUpdateData: (data) => ({ ...data }),
    invalidMessage: '技能格式不正確。',
    notFoundMessage: '找不到指定的技能。',
    // 建立失敗多半是 categoryId 指向不存在的分類（FK 失敗），與 Express 版一致回 400。
    onCreateError: () => jsonError('找不到指定的技能分類。', 400),
  }),

  experience: defineCrud({
    delegate: (prisma) => prisma.experience as unknown as CrudDelegate,
    createSchema: experienceCreateSchema,
    updateSchema: experienceUpdateSchema,
    toCreateData: toExperienceCreateData,
    toUpdateData: toExperienceUpdateData,
    serialize: (row) => serializeExperience(row as Parameters<typeof serializeExperience>[0]),
    invalidMessage: '工作經歷格式不正確。',
    notFoundMessage: '找不到指定的工作經歷。',
  }),

  projects: defineCrud({
    delegate: (prisma) => prisma.project as unknown as CrudDelegate,
    createSchema: projectCreateSchema,
    updateSchema: projectUpdateSchema,
    toCreateData: toProjectCreateData,
    toUpdateData: toProjectUpdateData,
    serialize: (row) => serializeProject(row as Parameters<typeof serializeProject>[0]),
    invalidMessage: '專案格式不正確。',
    notFoundMessage: '找不到指定的專案。',
  }),

  'engineering-cases': defineCrud({
    delegate: (prisma) => prisma.engineeringCase as unknown as CrudDelegate,
    createSchema: engineeringCaseCreateSchema,
    updateSchema: engineeringCaseUpdateSchema,
    toCreateData: toEngineeringCaseCreateData,
    toUpdateData: toEngineeringCaseUpdateData,
    serialize: (row) => serializeEngineeringCase(row as Parameters<typeof serializeEngineeringCase>[0]),
    invalidMessage: '工程案例格式不正確。',
    notFoundMessage: '找不到指定的工程案例。',
    listable: true,
    onCreateError: (error) =>
      isUniqueConstraintError(error) ? jsonError('slug 已被使用，請更換其他 slug。', 409) : null,
    onUpdateError: (error) =>
      isUniqueConstraintError(error) ? jsonError('slug 已被使用，請更換其他 slug。', 409) : null,
  }),

  certifications: defineCrud({
    delegate: (prisma) => prisma.certification as unknown as CrudDelegate,
    createSchema: certificationCreateSchema,
    updateSchema: certificationUpdateSchema,
    toCreateData: toCertificationCreateData,
    toUpdateData: toCertificationUpdateData,
    invalidMessage: '認證格式不正確。',
    notFoundMessage: '找不到指定的認證。',
  }),
}

function parseId(segment: string): number | null {
  const id = Number(segment)
  return Number.isInteger(id) ? id : null
}

// ─── 登入 ────────────────────────────────────────────────────────────────────

async function handleLogin(request: Request, env: Env, prisma: PrismaClient): Promise<Response> {
  if (!env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured')
    return jsonError('伺服器尚未設定 JWT_SECRET，請聯絡管理者。', 500)
  }

  // 以來源 IP 限流。取不到 IP（理論上不會發生在 Cloudflare 邊緣）時退回單一 key，
  // 寧可全域限流也不要整個略過保護。
  if (env.LOGIN_RATE_LIMIT) {
    const key = request.headers.get('cf-connecting-ip') ?? 'unknown'
    const { success } = await env.LOGIN_RATE_LIMIT.limit({ key })
    if (!success) {
      return jsonError('登入嘗試次數過多，請稍後再試。', 429)
    }
  }

  const parsed = loginSchema.safeParse(await readJsonBody(request))
  if (!parsed.success) {
    return jsonError('請輸入正確的 email 與密碼。', 400)
  }

  const { email, password } = parsed.data
  const admin = await prisma.adminUser.findUnique({ where: { email } })
  if (!admin) {
    return jsonError('帳號或密碼錯誤。', 401)
  }

  // 舊的 bcrypt 雜湊在 Workers 上已不支援。這不是「密碼打錯」，
  // 必須給出可操作的訊息，否則會被誤判成忘記密碼。
  if (isLegacyBcryptHash(admin.passwordHash)) {
    console.error('AdminUser.passwordHash 仍是 bcrypt 格式，需重新產生。')
    return jsonError('此帳號的密碼雜湊格式已過期，請重新產生後套用到資料庫。', 500)
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    return jsonError('帳號或密碼錯誤。', 401)
  }

  const token = await signAdminToken(
    { sub: admin.id, email: admin.email },
    env.JWT_SECRET,
    parseExpiresInSeconds(env.JWT_EXPIRES_IN),
  )

  return json({ token })
}

/** 驗證 Authorization header；通過回傳 null，未通過回傳要直接送出的 Response。 */
async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  if (!env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured')
    return jsonError('伺服器尚未設定 JWT_SECRET，請聯絡管理者。', 500)
  }

  const header = request.headers.get('authorization')
  if (!header?.startsWith('Bearer ')) {
    return jsonError('未授權，請先登入。', 401)
  }

  try {
    await verifyAdminToken(header.slice('Bearer '.length), env.JWT_SECRET)
    return null
  } catch {
    // 不區分「過期」與「偽造」，避免洩漏 token 狀態。
    return jsonError('Token 無效或已過期，請重新登入。', 401)
  }
}

// ─── 個人資料（非制式 CRUD，單列 upsert 語意） ───────────────────────────────

async function handleProfileUpdate(request: Request, prisma: PrismaClient): Promise<Response> {
  const parsed = profileUpdateSchema.safeParse(await readJsonBody(request))
  if (!parsed.success) {
    return jsonError('個人資料格式不正確。', 400, { details: parsed.error.flatten() })
  }

  const existing = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })
  const { contactLinks, ...rest } = parsed.data
  const data = {
    ...rest,
    ...(contactLinks !== undefined ? { contactLinks: JSON.stringify(contactLinks) } : {}),
  }

  const profile = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data })
    : await prisma.profile.create({
        data: {
          displayName: data.displayName ?? '',
          preferredName: data.preferredName ?? '',
          titleZh: data.titleZh ?? '',
          titleEn: data.titleEn ?? '',
          introZh: data.introZh ?? '',
          introEn: data.introEn ?? '',
          contactEmail: data.contactEmail ?? null,
          contactLinks: data.contactLinks ?? null,
        },
      })

  return json({ ...profile, contactLinks: parseContactLinks(profile.contactLinks) })
}

/**
 * POST /api/admin/avatar —— multipart/form-data，欄位名 avatar。
 *
 * 與 Express 版的差異：檔案寫入 R2 而非本機磁碟。回傳的 avatarUrl 仍是
 * `/uploads/<key>`，因此前端的 resolveAssetUrl() 完全不需要改動。
 */
async function handleAvatarUpload(request: Request, env: Env, prisma: PrismaClient): Promise<Response> {
  if (!env.UPLOADS) {
    return jsonError('尚未設定 R2 儲存（UPLOADS binding），無法上傳頭像。', 501)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return jsonError('檔案上傳失敗：請以 multipart/form-data 送出。', 400)
  }

  const file = form.get('avatar')
  if (!(file instanceof File)) {
    return jsonError('請選擇要上傳的圖片。', 400)
  }

  const extension = ALLOWED_AVATAR_TYPES[file.type]
  if (!extension) {
    return jsonError('僅允許上傳 jpg、png 或 webp 格式的圖片。', 400)
  }

  if (file.size > AVATAR_MAX_SIZE_MB * 1024 * 1024) {
    return jsonError(`檔案大小不得超過 ${AVATAR_MAX_SIZE_MB} MB。`, 400)
  }

  // 先確認 Profile 存在再寫檔，避免留下沒有任何列引用的孤兒物件。
  const existing = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })
  if (!existing) {
    return jsonError('尚未建立個人資料，請先建立個人資料。', 404)
  }

  const random = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const key = `avatar-${Date.now()}-${random}${extension}`

  await env.UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  })

  // ⚠️ 與 Express 版一致，不刪除舊檔。舊的頭像物件會留在 R2 成為孤兒；
  //    若日後要清理，應另外寫一支對帳腳本，而不是在這裡直接刪
  //    （同一個 key 可能已被其他地方引用或快取）。
  const profile = await prisma.profile.update({
    where: { id: existing.id },
    data: { avatarUrl: `/uploads/${key}` },
  })

  return json({ ...profile, contactLinks: parseContactLinks(profile.contactLinks) })
}

// ─── 制式 CRUD ───────────────────────────────────────────────────────────────

async function handleCrud(
  request: Request,
  prisma: PrismaClient,
  resource: CrudResource<unknown, unknown>,
  idSegment: string | undefined,
): Promise<Response> {
  const delegate = resource.delegate(prisma)
  const serialize = resource.serialize ?? ((row: Record<string, unknown>) => row)

  // 集合層級：GET（列表）與 POST（建立）
  if (idSegment === undefined) {
    if (request.method === 'GET') {
      if (!resource.listable) return jsonError('不支援的 HTTP method。', 405)
      const rows = await delegate.findMany({ orderBy: { sortOrder: 'asc' } })
      return json(rows.map(serialize))
    }

    if (request.method !== 'POST') return jsonError('不支援的 HTTP method。', 405)

    const parsed = resource.createSchema.safeParse(await readJsonBody(request))
    if (!parsed.success) {
      return jsonError(resource.invalidMessage, 400, { details: parsed.error.flatten() })
    }

    try {
      const row = await delegate.create({ data: resource.toCreateData(parsed.data) })
      return json(serialize(row), 201)
    } catch (error) {
      const custom = resource.onCreateError?.(error)
      if (custom) return custom
      throw error
    }
  }

  // 單筆：PUT（更新）與 DELETE
  const id = parseId(idSegment)

  if (request.method === 'DELETE') {
    if (id === null) return jsonError('參數格式不正確。', 400)
    try {
      await delegate.delete({ where: { id } })
      return noContent()
    } catch {
      return jsonError(resource.notFoundMessage, 404)
    }
  }

  if (request.method !== 'PUT') return jsonError('不支援的 HTTP method。', 405)

  const parsed = resource.updateSchema.safeParse(await readJsonBody(request))
  if (id === null || !parsed.success) {
    return jsonError(resource.invalidMessage, 400)
  }

  try {
    const row = await delegate.update({ where: { id }, data: resource.toUpdateData(parsed.data) })
    return json(serialize(row))
  } catch (error) {
    return resource.onUpdateError?.(error) ?? jsonError(resource.notFoundMessage, 404)
  }
}

// ─── 進入點 ──────────────────────────────────────────────────────────────────

export async function handleAdminApi(
  request: Request,
  env: Env,
  prisma: PrismaClient,
  pathname: string,
): Promise<Response> {
  const rest = pathname.slice(ADMIN_PREFIX.length)
  const segments = rest.split('/').filter((segment) => segment.length > 0)
  const [resourceName, idSegment, ...extra] = segments

  if (resourceName === 'login') {
    if (request.method !== 'POST') return jsonError('不支援的 HTTP method。', 405)
    return handleLogin(request, env, prisma)
  }

  // login 以外一律需要驗證。
  const unauthorized = await requireAuth(request, env)
  if (unauthorized) return unauthorized

  if (extra.length > 0) return jsonError('找不到這個 API。', 404)

  if (resourceName === 'profile' && idSegment === undefined) {
    if (request.method !== 'PUT') return jsonError('不支援的 HTTP method。', 405)
    return handleProfileUpdate(request, prisma)
  }

  if (resourceName === 'avatar' && idSegment === undefined) {
    if (request.method !== 'POST') return jsonError('不支援的 HTTP method。', 405)
    return handleAvatarUpload(request, env, prisma)
  }

  const resource = resourceName ? CRUD_RESOURCES[resourceName] : undefined
  if (!resource) return jsonError('找不到這個 API。', 404)

  return handleCrud(request, prisma, resource, idSegment)
}
