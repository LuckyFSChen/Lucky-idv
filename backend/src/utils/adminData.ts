/**
 * Admin 寫入路徑的資料轉換（zod 驗證後的輸入 → Prisma 的 data）與輸出序列化。
 *
 * 這些函式原本寫在 backend/src/routes/admin.ts 內。抽出來的原因：
 * Express（本機開發）與 Cloudflare Worker（production）兩套 handler 都需要它們，
 * 若各自複製一份，日後改了其中一邊就會造成「同一個 API 在本機與線上行為不同」
 * —— 這正是 CLOUDFLARE_MIGRATION_PLAN.md 最想避免的靜默破壞。
 *
 * ⚠️ 本模組必須維持「純函式、零框架依賴」：Worker 端沒有 express、也沒有 node:*。
 */

import type { z } from 'zod'
import type {
  certificationCreateSchema,
  certificationUpdateSchema,
  engineeringCaseCreateSchema,
  engineeringCaseUpdateSchema,
  experienceCreateSchema,
  experienceUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
} from '../schemas/admin.js'
import { parseArchitectureSteps, parseStringArray } from './json.js'

/**
 * Prisma 的 unique constraint 衝突（P2002）。
 *
 * 這裡以 error.code 判斷而不是 `instanceof Prisma.PrismaClientKnownRequestError`：
 * Worker 打包的是 Prisma 的 edge/driver-adapter 版本，instanceof 會因為
 * 載入到不同的 class identity 而失效，改用 error code 兩邊行為一致。
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

export function toExperienceUpdateData(data: z.infer<typeof experienceUpdateSchema>) {
  const { highlightsZh, highlightsEn, startDate, endDate, ...rest } = data
  return {
    ...rest,
    ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
    ...(endDate !== undefined ? { endDate: endDate === null ? null : new Date(endDate) } : {}),
    ...(highlightsZh !== undefined ? { highlightsZh: JSON.stringify(highlightsZh) } : {}),
    ...(highlightsEn !== undefined ? { highlightsEn: JSON.stringify(highlightsEn) } : {}),
  }
}

export function toExperienceCreateData(data: z.infer<typeof experienceCreateSchema>) {
  const { highlightsZh, highlightsEn, startDate, endDate, ...rest } = data
  return {
    ...rest,
    startDate: new Date(startDate),
    endDate: endDate == null ? null : new Date(endDate),
    highlightsZh: JSON.stringify(highlightsZh),
    highlightsEn: JSON.stringify(highlightsEn),
  }
}

export function serializeExperience(experience: {
  highlightsZh: string | null
  highlightsEn: string | null
  [key: string]: unknown
}) {
  return {
    ...experience,
    highlightsZh: parseStringArray(experience.highlightsZh),
    highlightsEn: parseStringArray(experience.highlightsEn),
  }
}

export function toProjectUpdateData(data: z.infer<typeof projectUpdateSchema>) {
  const { highlightsZh, highlightsEn, techStack, ...rest } = data
  return {
    ...rest,
    ...(highlightsZh !== undefined ? { highlightsZh: JSON.stringify(highlightsZh) } : {}),
    ...(highlightsEn !== undefined ? { highlightsEn: JSON.stringify(highlightsEn) } : {}),
    ...(techStack !== undefined ? { techStack: JSON.stringify(techStack) } : {}),
  }
}

export function toProjectCreateData(data: z.infer<typeof projectCreateSchema>) {
  const { highlightsZh, highlightsEn, techStack, ...rest } = data
  return {
    ...rest,
    highlightsZh: JSON.stringify(highlightsZh),
    highlightsEn: JSON.stringify(highlightsEn),
    techStack: techStack !== undefined ? JSON.stringify(techStack) : null,
  }
}

export function serializeProject(project: {
  highlightsZh: string | null
  highlightsEn: string | null
  techStack: string | null
  [key: string]: unknown
}) {
  return {
    ...project,
    highlightsZh: parseStringArray(project.highlightsZh),
    highlightsEn: parseStringArray(project.highlightsEn),
    techStack: parseStringArray(project.techStack),
  }
}

export function toEngineeringCaseUpdateData(data: z.infer<typeof engineeringCaseUpdateSchema>) {
  const { architecture, techStack, ...rest } = data
  return {
    ...rest,
    ...(architecture !== undefined ? { architecture: JSON.stringify(architecture) } : {}),
    ...(techStack !== undefined ? { techStack: JSON.stringify(techStack) } : {}),
  }
}

export function toEngineeringCaseCreateData(data: z.infer<typeof engineeringCaseCreateSchema>) {
  const { architecture, techStack, ...rest } = data
  return {
    ...rest,
    architecture: architecture !== undefined ? JSON.stringify(architecture) : null,
    techStack: techStack !== undefined ? JSON.stringify(techStack) : null,
  }
}

export function serializeEngineeringCase(engineeringCase: {
  architecture: string | null
  techStack: string | null
  [key: string]: unknown
}) {
  return {
    ...engineeringCase,
    architecture: parseArchitectureSteps(engineeringCase.architecture),
    techStack: parseStringArray(engineeringCase.techStack),
  }
}

export function toCertificationUpdateData(data: z.infer<typeof certificationUpdateSchema>) {
  const { issuedAt, ...rest } = data
  return {
    ...rest,
    ...(issuedAt !== undefined ? { issuedAt: issuedAt === null ? null : new Date(issuedAt) } : {}),
  }
}

export function toCertificationCreateData(data: z.infer<typeof certificationCreateSchema>) {
  const { issuedAt, ...rest } = data
  return {
    ...rest,
    issuedAt: issuedAt == null ? null : new Date(issuedAt),
  }
}
