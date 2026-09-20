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
  categoryZh: z.string().nullable().optional(),
  categoryEn: z.string().nullable().optional(),
  subtitleZh: z.string().nullable().optional(),
  subtitleEn: z.string().nullable().optional(),
  summaryZh: z.string().min(1),
  summaryEn: z.string().min(1),
  highlightsZh: z.array(z.string()),
  highlightsEn: z.array(z.string()),
  techStack: z.array(z.string()).optional(),
  link: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const projectCreateSchema = projectBaseSchema
export const projectUpdateSchema = projectBaseSchema.partial()

const architectureStepSchema = z.object({
  labelZh: z.string().min(1),
  labelEn: z.string().min(1),
})

const slugSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug 僅能包含小寫英數字與連字號。')

const engineeringCaseBaseSchema = z.object({
  slug: slugSchema,
  titleZh: z.string().min(1),
  titleEn: z.string().min(1),
  categoryZh: z.string().min(1),
  categoryEn: z.string().min(1),
  summaryZh: z.string().min(1),
  summaryEn: z.string().min(1),
  problemZh: z.string().min(1),
  problemEn: z.string().min(1),
  contextZh: z.string().min(1),
  contextEn: z.string().min(1),
  investigationZh: z.string().min(1),
  investigationEn: z.string().min(1),
  solutionZh: z.string().min(1),
  solutionEn: z.string().min(1),
  validationZh: z.string().min(1),
  validationEn: z.string().min(1),
  resultZh: z.string().min(1),
  resultEn: z.string().min(1),
  architecture: z.array(architectureStepSchema).optional(),
  techStack: z.array(z.string()).optional(),
  githubUrl: z.string().url().nullable().optional(),
  projectUrl: z.string().url().nullable().optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const engineeringCaseCreateSchema = engineeringCaseBaseSchema
export const engineeringCaseUpdateSchema = engineeringCaseBaseSchema.partial()

const certificationBaseSchema = z.object({
  nameZh: z.string().min(1),
  nameEn: z.string().min(1),
  issuerZh: z.string().min(1),
  issuerEn: z.string().min(1),
  descriptionZh: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  credential: z.string().nullable().optional(),
  issuedAt: z.string().datetime().or(z.string().min(1)).nullable().optional(),
  link: z.string().url().nullable().optional(),
  sortOrder: z.number().int().optional(),
})

export const certificationCreateSchema = certificationBaseSchema
export const certificationUpdateSchema = certificationBaseSchema.partial()
