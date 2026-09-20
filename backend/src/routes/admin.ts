import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { avatarUpload } from '../middleware/upload.js'
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
} from '../schemas/admin.js'
import { signAdminToken } from '../utils/jwt.js'
import { parseArchitectureSteps, parseContactLinks, parseStringArray } from '../utils/json.js'

export const adminRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '登入嘗試次數過多，請稍後再試。' },
})

function idParam(req: { params: { id: string } }): number | null {
  const id = Number(req.params.id)
  return Number.isInteger(id) ? id : null
}

adminRouter.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '請輸入正確的 email 與密碼。' })
    return
  }

  const { email, password } = parsed.data
  const admin = await prisma.adminUser.findUnique({ where: { email } })
  if (!admin) {
    res.status(401).json({ error: '帳號或密碼錯誤。' })
    return
  }

  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid) {
    res.status(401).json({ error: '帳號或密碼錯誤。' })
    return
  }

  const token = signAdminToken({ sub: admin.id, email: admin.email })
  res.json({ token })
})

adminRouter.use(requireAuth)

adminRouter.put('/profile', async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '個人資料格式不正確。', details: parsed.error.flatten() })
    return
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

  res.json({ ...profile, contactLinks: parseContactLinks(profile.contactLinks) })
})

adminRouter.post('/avatar', avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: '請選擇要上傳的圖片。' })
    return
  }

  const avatarUrl = `/uploads/${req.file.filename}`
  const existing = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })
  if (!existing) {
    res.status(404).json({ error: '尚未建立個人資料，請先建立個人資料。' })
    return
  }

  const profile = await prisma.profile.update({ where: { id: existing.id }, data: { avatarUrl } })
  res.json({ ...profile, contactLinks: parseContactLinks(profile.contactLinks) })
})

adminRouter.post('/skill-categories', async (req, res) => {
  const parsed = skillCategoryCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '技能分類格式不正確。', details: parsed.error.flatten() })
    return
  }
  const category = await prisma.skillCategory.create({ data: parsed.data })
  res.status(201).json(category)
})

adminRouter.put('/skill-categories/:id', async (req, res) => {
  const id = idParam(req)
  const parsed = skillCategoryUpdateSchema.safeParse(req.body)
  if (id === null || !parsed.success) {
    res.status(400).json({ error: '技能分類格式不正確。' })
    return
  }
  try {
    const category = await prisma.skillCategory.update({ where: { id }, data: parsed.data })
    res.json(category)
  } catch {
    res.status(404).json({ error: '找不到指定的技能分類。' })
  }
})

adminRouter.delete('/skill-categories/:id', async (req, res) => {
  const id = idParam(req)
  if (id === null) {
    res.status(400).json({ error: '參數格式不正確。' })
    return
  }
  try {
    await prisma.skillCategory.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: '找不到指定的技能分類。' })
  }
})

adminRouter.post('/skills', async (req, res) => {
  const parsed = skillCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '技能格式不正確。', details: parsed.error.flatten() })
    return
  }
  try {
    const skill = await prisma.skill.create({ data: parsed.data })
    res.status(201).json(skill)
  } catch {
    res.status(400).json({ error: '找不到指定的技能分類。' })
  }
})

adminRouter.put('/skills/:id', async (req, res) => {
  const id = idParam(req)
  const parsed = skillUpdateSchema.safeParse(req.body)
  if (id === null || !parsed.success) {
    res.status(400).json({ error: '技能格式不正確。' })
    return
  }
  try {
    const skill = await prisma.skill.update({ where: { id }, data: parsed.data })
    res.json(skill)
  } catch {
    res.status(404).json({ error: '找不到指定的技能。' })
  }
})

adminRouter.delete('/skills/:id', async (req, res) => {
  const id = idParam(req)
  if (id === null) {
    res.status(400).json({ error: '參數格式不正確。' })
    return
  }
  try {
    await prisma.skill.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: '找不到指定的技能。' })
  }
})

function toExperienceUpdateData(data: z.infer<typeof experienceUpdateSchema>) {
  const { highlightsZh, highlightsEn, startDate, endDate, ...rest } = data
  return {
    ...rest,
    ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
    ...(endDate !== undefined ? { endDate: endDate === null ? null : new Date(endDate) } : {}),
    ...(highlightsZh !== undefined ? { highlightsZh: JSON.stringify(highlightsZh) } : {}),
    ...(highlightsEn !== undefined ? { highlightsEn: JSON.stringify(highlightsEn) } : {}),
  }
}

function toExperienceCreateData(data: z.infer<typeof experienceCreateSchema>) {
  const { highlightsZh, highlightsEn, startDate, endDate, ...rest } = data
  return {
    ...rest,
    startDate: new Date(startDate),
    endDate: endDate == null ? null : new Date(endDate),
    highlightsZh: JSON.stringify(highlightsZh),
    highlightsEn: JSON.stringify(highlightsEn),
  }
}

adminRouter.post('/experience', async (req, res) => {
  const parsed = experienceCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '工作經歷格式不正確。', details: parsed.error.flatten() })
    return
  }
  const experience = await prisma.experience.create({ data: toExperienceCreateData(parsed.data) })
  res.status(201).json({
    ...experience,
    highlightsZh: parseStringArray(experience.highlightsZh),
    highlightsEn: parseStringArray(experience.highlightsEn),
  })
})

adminRouter.put('/experience/:id', async (req, res) => {
  const id = idParam(req)
  const parsed = experienceUpdateSchema.safeParse(req.body)
  if (id === null || !parsed.success) {
    res.status(400).json({ error: '工作經歷格式不正確。' })
    return
  }
  try {
    const experience = await prisma.experience.update({ where: { id }, data: toExperienceUpdateData(parsed.data) })
    res.json({
      ...experience,
      highlightsZh: parseStringArray(experience.highlightsZh),
      highlightsEn: parseStringArray(experience.highlightsEn),
    })
  } catch {
    res.status(404).json({ error: '找不到指定的工作經歷。' })
  }
})

adminRouter.delete('/experience/:id', async (req, res) => {
  const id = idParam(req)
  if (id === null) {
    res.status(400).json({ error: '參數格式不正確。' })
    return
  }
  try {
    await prisma.experience.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: '找不到指定的工作經歷。' })
  }
})

function toProjectUpdateData(data: z.infer<typeof projectUpdateSchema>) {
  const { highlightsZh, highlightsEn, techStack, ...rest } = data
  return {
    ...rest,
    ...(highlightsZh !== undefined ? { highlightsZh: JSON.stringify(highlightsZh) } : {}),
    ...(highlightsEn !== undefined ? { highlightsEn: JSON.stringify(highlightsEn) } : {}),
    ...(techStack !== undefined ? { techStack: JSON.stringify(techStack) } : {}),
  }
}

function toProjectCreateData(data: z.infer<typeof projectCreateSchema>) {
  const { highlightsZh, highlightsEn, techStack, ...rest } = data
  return {
    ...rest,
    highlightsZh: JSON.stringify(highlightsZh),
    highlightsEn: JSON.stringify(highlightsEn),
    techStack: techStack !== undefined ? JSON.stringify(techStack) : null,
  }
}

adminRouter.post('/projects', async (req, res) => {
  const parsed = projectCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '專案格式不正確。', details: parsed.error.flatten() })
    return
  }
  const project = await prisma.project.create({ data: toProjectCreateData(parsed.data) })
  res.status(201).json({
    ...project,
    highlightsZh: parseStringArray(project.highlightsZh),
    highlightsEn: parseStringArray(project.highlightsEn),
    techStack: parseStringArray(project.techStack),
  })
})

adminRouter.put('/projects/:id', async (req, res) => {
  const id = idParam(req)
  const parsed = projectUpdateSchema.safeParse(req.body)
  if (id === null || !parsed.success) {
    res.status(400).json({ error: '專案格式不正確。' })
    return
  }
  try {
    const project = await prisma.project.update({ where: { id }, data: toProjectUpdateData(parsed.data) })
    res.json({
      ...project,
      highlightsZh: parseStringArray(project.highlightsZh),
      highlightsEn: parseStringArray(project.highlightsEn),
      techStack: parseStringArray(project.techStack),
    })
  } catch {
    res.status(404).json({ error: '找不到指定的專案。' })
  }
})

adminRouter.delete('/projects/:id', async (req, res) => {
  const id = idParam(req)
  if (id === null) {
    res.status(400).json({ error: '參數格式不正確。' })
    return
  }
  try {
    await prisma.project.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: '找不到指定的專案。' })
  }
})

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function toEngineeringCaseUpdateData(data: z.infer<typeof engineeringCaseUpdateSchema>) {
  const { architecture, techStack, ...rest } = data
  return {
    ...rest,
    ...(architecture !== undefined ? { architecture: JSON.stringify(architecture) } : {}),
    ...(techStack !== undefined ? { techStack: JSON.stringify(techStack) } : {}),
  }
}

function toEngineeringCaseCreateData(data: z.infer<typeof engineeringCaseCreateSchema>) {
  const { architecture, techStack, ...rest } = data
  return {
    ...rest,
    architecture: architecture !== undefined ? JSON.stringify(architecture) : null,
    techStack: techStack !== undefined ? JSON.stringify(techStack) : null,
  }
}

function serializeEngineeringCase(engineeringCase: {
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

adminRouter.get('/engineering-cases', async (_req, res) => {
  const cases = await prisma.engineeringCase.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json(cases.map(serializeEngineeringCase))
})

adminRouter.post('/engineering-cases', async (req, res) => {
  const parsed = engineeringCaseCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '工程案例格式不正確。', details: parsed.error.flatten() })
    return
  }
  try {
    const engineeringCase = await prisma.engineeringCase.create({ data: toEngineeringCaseCreateData(parsed.data) })
    res.status(201).json(serializeEngineeringCase(engineeringCase))
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: 'slug 已被使用，請更換其他 slug。' })
      return
    }
    throw error
  }
})

adminRouter.put('/engineering-cases/:id', async (req, res) => {
  const id = idParam(req)
  const parsed = engineeringCaseUpdateSchema.safeParse(req.body)
  if (id === null || !parsed.success) {
    res.status(400).json({ error: '工程案例格式不正確。' })
    return
  }
  try {
    const engineeringCase = await prisma.engineeringCase.update({
      where: { id },
      data: toEngineeringCaseUpdateData(parsed.data),
    })
    res.json(serializeEngineeringCase(engineeringCase))
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      res.status(409).json({ error: 'slug 已被使用，請更換其他 slug。' })
      return
    }
    res.status(404).json({ error: '找不到指定的工程案例。' })
  }
})

adminRouter.delete('/engineering-cases/:id', async (req, res) => {
  const id = idParam(req)
  if (id === null) {
    res.status(400).json({ error: '參數格式不正確。' })
    return
  }
  try {
    await prisma.engineeringCase.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: '找不到指定的工程案例。' })
  }
})

function toCertificationUpdateData(data: z.infer<typeof certificationUpdateSchema>) {
  const { issuedAt, ...rest } = data
  return {
    ...rest,
    ...(issuedAt !== undefined ? { issuedAt: issuedAt === null ? null : new Date(issuedAt) } : {}),
  }
}

function toCertificationCreateData(data: z.infer<typeof certificationCreateSchema>) {
  const { issuedAt, ...rest } = data
  return {
    ...rest,
    issuedAt: issuedAt == null ? null : new Date(issuedAt),
  }
}

adminRouter.post('/certifications', async (req, res) => {
  const parsed = certificationCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: '認證格式不正確。', details: parsed.error.flatten() })
    return
  }
  const certification = await prisma.certification.create({ data: toCertificationCreateData(parsed.data) })
  res.status(201).json(certification)
})

adminRouter.put('/certifications/:id', async (req, res) => {
  const id = idParam(req)
  const parsed = certificationUpdateSchema.safeParse(req.body)
  if (id === null || !parsed.success) {
    res.status(400).json({ error: '認證格式不正確。' })
    return
  }
  try {
    const certification = await prisma.certification.update({ where: { id }, data: toCertificationUpdateData(parsed.data) })
    res.json(certification)
  } catch {
    res.status(404).json({ error: '找不到指定的認證。' })
  }
})

adminRouter.delete('/certifications/:id', async (req, res) => {
  const id = idParam(req)
  if (id === null) {
    res.status(400).json({ error: '參數格式不正確。' })
    return
  }
  try {
    await prisma.certification.delete({ where: { id } })
    res.status(204).send()
  } catch {
    res.status(404).json({ error: '找不到指定的認證。' })
  }
})
