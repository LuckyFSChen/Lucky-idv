import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const contactLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
})

export const profileUpdateSchema = z
  .object({
    displayName: z.string().min(1),
    preferredName: z.string().min(1),
    titleZh: z.string().min(1),
    titleEn: z.string().min(1),
    introZh: z.string().min(1),
    introEn: z.string().min(1),
    contactEmail: z.string().email().nullable(),
    contactLinks: z.array(contactLinkSchema),
  })
  .partial()

export const skillCategoryCreateSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  sortOrder: z.number().int().optional(),
})

export const skillCategoryUpdateSchema = skillCategoryCreateSchema.partial()

export const skillCreateSchema = z.object({
  categoryId: z.number().int(),
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  sortOrder: z.number().int().optional(),
})

export const skillUpdateSchema = skillCreateSchema.partial()

const experienceBaseSchema = z.object({
  companyZh: z.string().min(1),
  companyEn: z.string().min(1),
  roleZh: z.string().min(1),
  roleEn: z.string().min(1),
  locationZh: z.string().nullable().optional(),
  locationEn: z.string().nullable().optional(),
  startDate: z.string().datetime().or(z.string().min(1)),
  endDate: z.string().datetime().or(z.string().min(1)).nullable().optional(),
  summaryZh: z.string().min(1),
  summaryEn: z.string().min(1),
  highlightsZh: z.array(z.string()),
  highlightsEn: z.array(z.string()),
  sortOrder: z.number().int().optional(),
})

export const experienceCreateSchema = experienceBaseSchema
export const experienceUpdateSchema = experienceBaseSchema.partial()

const projectBaseSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  summaryZh: z.string().min(1),
  summaryEn: z.string().min(1),
  highlightsZh: z.array(z.string()),
  highlightsEn: z.array(z.string()),
  techStack: z.array(z.string()).optional(),
  link: z.string().url().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export const projectCreateSchema = projectBaseSchema
export const projectUpdateSchema = projectBaseSchema.partial()
