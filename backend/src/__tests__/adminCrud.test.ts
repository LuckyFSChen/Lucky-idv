import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { prisma } from '../db.js'

const TEST_ADMIN_EMAIL = 'test-admin-crud@example.com'
const TEST_ADMIN_PASSWORD = 'Test-Password-456!'

let token: string
let originalProfile: Awaited<ReturnType<typeof prisma.profile.findFirst>>
const uploadedFiles: string[] = []

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10)
  await prisma.adminUser.upsert({
    where: { email: TEST_ADMIN_EMAIL },
    update: { passwordHash },
    create: { email: TEST_ADMIN_EMAIL, passwordHash },
  })

  const loginRes = await request(app)
    .post('/api/admin/login')
    .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
  token = loginRes.body.token as string

  originalProfile = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })
})

afterAll(async () => {
  if (originalProfile) {
    await prisma.profile.update({
      where: { id: originalProfile.id },
      data: {
        displayName: originalProfile.displayName,
        preferredName: originalProfile.preferredName,
        titleZh: originalProfile.titleZh,
        titleEn: originalProfile.titleEn,
        introZh: originalProfile.introZh,
        introEn: originalProfile.introEn,
        avatarUrl: originalProfile.avatarUrl,
        contactEmail: originalProfile.contactEmail,
        contactLinks: originalProfile.contactLinks,
      },
    })
  }
  for (const filename of uploadedFiles) {
    const filePath = path.join(process.cwd(), 'uploads', filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  await prisma.adminUser.delete({ where: { email: TEST_ADMIN_EMAIL } })
  await prisma.$disconnect()
})

describe('admin profile CRUD', () => {
  it('updates the profile and reflects on the public API', async () => {
    const res = await request(app)
      .put('/api/admin/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Lucky Test',
        contactEmail: 'lucky-test@example.com',
        contactLinks: [{ label: 'GitHub', url: 'https://github.com/example' }],
      })
    expect(res.status).toBe(200)
    expect(res.body.displayName).toBe('Lucky Test')
    expect(res.body.contactLinks).toEqual([{ label: 'GitHub', url: 'https://github.com/example' }])

    const publicRes = await request(app).get('/api/profile')
    expect(publicRes.body.displayName).toBe('Lucky Test')
  })
})

describe('admin skill category & skill CRUD', () => {
  it('creates, updates and deletes a skill category with a nested skill', async () => {
    const createCategoryRes = await request(app)
      .post('/api/admin/skill-categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ nameZh: '測試分類', nameEn: 'Test Category', sortOrder: 99 })
    expect(createCategoryRes.status).toBe(201)
    const categoryId = createCategoryRes.body.id as number

    const updateCategoryRes = await request(app)
      .put(`/api/admin/skill-categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nameZh: '測試分類更新' })
    expect(updateCategoryRes.status).toBe(200)
    expect(updateCategoryRes.body.nameZh).toBe('測試分類更新')

    const createSkillRes = await request(app)
      .post('/api/admin/skills')
      .set('Authorization', `Bearer ${token}`)
      .send({ categoryId, nameZh: '測試技能', nameEn: 'Test Skill' })
    expect(createSkillRes.status).toBe(201)
    const skillId = createSkillRes.body.id as number

    const updateSkillRes = await request(app)
      .put(`/api/admin/skills/${skillId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nameZh: '測試技能更新' })
    expect(updateSkillRes.status).toBe(200)
    expect(updateSkillRes.body.nameZh).toBe('測試技能更新')

    const deleteSkillRes = await request(app)
      .delete(`/api/admin/skills/${skillId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(deleteSkillRes.status).toBe(204)

    const deleteCategoryRes = await request(app)
      .delete(`/api/admin/skill-categories/${categoryId}`)
      .set('Authorization', `Bearer ${token}`)
    expect(deleteCategoryRes.status).toBe(204)
  })
})

describe('admin experience CRUD', () => {
  it('creates, updates and deletes an experience entry', async () => {
    const createRes = await request(app)
      .post('/api/admin/experience')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyZh: '測試公司',
        companyEn: 'Test Co.',
        roleZh: '測試工程師',
        roleEn: 'Test Engineer',
        startDate: '2020-01-01T00:00:00.000Z',
        endDate: null,
        summaryZh: '摘要',
        summaryEn: 'Summary',
        highlightsZh: ['重點一'],
        highlightsEn: ['Highlight one'],
      })
    expect(createRes.status).toBe(201)
    expect(createRes.body.highlightsZh).toEqual(['重點一'])
    const id = createRes.body.id as number

    const updateRes = await request(app)
      .put(`/api/admin/experience/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ highlightsZh: ['重點一', '重點二'] })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.highlightsZh).toEqual(['重點一', '重點二'])

    const deleteRes = await request(app)
      .delete(`/api/admin/experience/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(deleteRes.status).toBe(204)
  })
})

describe('admin project CRUD', () => {
  it('creates, updates and deletes a project entry', async () => {
    const createRes = await request(app)
      .post('/api/admin/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nameZh: '測試專案',
        nameEn: 'Test Project',
        summaryZh: '摘要',
        summaryEn: 'Summary',
        highlightsZh: ['特色一'],
        highlightsEn: ['Feature one'],
        techStack: ['Node.js'],
      })
    expect(createRes.status).toBe(201)
    expect(createRes.body.techStack).toEqual(['Node.js'])
    const id = createRes.body.id as number

    const updateRes = await request(app)
      .put(`/api/admin/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ techStack: ['Node.js', 'TypeScript'] })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.techStack).toEqual(['Node.js', 'TypeScript'])

    const deleteRes = await request(app)
      .delete(`/api/admin/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(deleteRes.status).toBe(204)
  })

  it('creates a project with category/subtitle/featured/githubUrl fields', async () => {
    const createRes = await request(app)
      .post('/api/admin/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nameZh: '測試專案二',
        nameEn: 'Test Project Two',
        categoryZh: 'SaaS 產品',
        categoryEn: 'SaaS Product',
        subtitleZh: '副標題',
        subtitleEn: 'Subtitle',
        summaryZh: '摘要',
        summaryEn: 'Summary',
        highlightsZh: ['特色一'],
        highlightsEn: ['Feature one'],
        githubUrl: 'https://github.com/example/test-project',
        featured: true,
      })
    expect(createRes.status).toBe(201)
    expect(createRes.body.categoryZh).toBe('SaaS 產品')
    expect(createRes.body.subtitleEn).toBe('Subtitle')
    expect(createRes.body.githubUrl).toBe('https://github.com/example/test-project')
    expect(createRes.body.featured).toBe(true)
    const id = createRes.body.id as number

    const deleteRes = await request(app)
      .delete(`/api/admin/projects/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(deleteRes.status).toBe(204)
  })
})

const validEngineeringCasePayload = {
  slug: 'test-engineering-case',
  titleZh: '測試工程案例',
  titleEn: 'Test Engineering Case',
  categoryZh: '測試分類',
  categoryEn: 'Test Category',
  summaryZh: '摘要',
  summaryEn: 'Summary',
  problemZh: '問題',
  problemEn: 'Problem',
  contextZh: '背景',
  contextEn: 'Context',
  investigationZh: '調查',
  investigationEn: 'Investigation',
  solutionZh: '解法',
  solutionEn: 'Solution',
  validationZh: '驗證',
  validationEn: 'Validation',
  resultZh: '結果',
  resultEn: 'Result',
  architecture: [{ labelZh: '步驟一', labelEn: 'Step One' }],
  techStack: ['TypeScript'],
  featured: false,
  sortOrder: 5,
}

describe('admin engineering case CRUD', () => {
  it('rejects creation without authentication', async () => {
    const res = await request(app).post('/api/admin/engineering-cases').send(validEngineeringCasePayload)
    expect(res.status).toBe(401)
  })

  it('rejects creation with missing required fields', async () => {
    const res = await request(app)
      .post('/api/admin/engineering-cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ slug: 'incomplete-case', titleZh: '不完整案例' })
    expect(res.status).toBe(400)
  })

  it('rejects creation with an invalid slug format', async () => {
    const res = await request(app)
      .post('/api/admin/engineering-cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validEngineeringCasePayload, slug: 'Invalid Slug!' })
    expect(res.status).toBe(400)
  })

  it('creates, updates, is visible on the public API, and deletes an engineering case', async () => {
    const createRes = await request(app)
      .post('/api/admin/engineering-cases')
      .set('Authorization', `Bearer ${token}`)
      .send(validEngineeringCasePayload)
    expect(createRes.status).toBe(201)
    expect(createRes.body.architecture).toEqual([{ labelZh: '步驟一', labelEn: 'Step One' }])
    expect(createRes.body.techStack).toEqual(['TypeScript'])
    const id = createRes.body.id as number

    const publicRes = await request(app).get(`/api/engineering-cases/${validEngineeringCasePayload.slug}`)
    expect(publicRes.status).toBe(200)
    expect(publicRes.body.titleZh).toBe('測試工程案例')

    const updateRes = await request(app)
      .put(`/api/admin/engineering-cases/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ titleZh: '測試工程案例更新', featured: true })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.titleZh).toBe('測試工程案例更新')
    expect(updateRes.body.featured).toBe(true)

    const deleteRes = await request(app)
      .delete(`/api/admin/engineering-cases/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(deleteRes.status).toBe(204)

    const afterDeleteRes = await request(app).get(`/api/engineering-cases/${validEngineeringCasePayload.slug}`)
    expect(afterDeleteRes.status).toBe(404)
  })

  it('rejects creating a duplicate slug', async () => {
    const firstRes = await request(app)
      .post('/api/admin/engineering-cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validEngineeringCasePayload, slug: 'duplicate-case-slug' })
    expect(firstRes.status).toBe(201)
    const id = firstRes.body.id as number

    const duplicateRes = await request(app)
      .post('/api/admin/engineering-cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validEngineeringCasePayload, slug: 'duplicate-case-slug' })
    expect(duplicateRes.status).toBe(409)

    await request(app).delete(`/api/admin/engineering-cases/${id}`).set('Authorization', `Bearer ${token}`)
  })

  it('excludes unpublished cases from the public API but keeps them visible to admin', async () => {
    const createRes = await request(app)
      .post('/api/admin/engineering-cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validEngineeringCasePayload, slug: 'unpublished-case', published: false })
    expect(createRes.status).toBe(201)
    expect(createRes.body.published).toBe(false)
    const id = createRes.body.id as number

    const publicListRes = await request(app).get('/api/engineering-cases')
    expect(publicListRes.status).toBe(200)
    expect(publicListRes.body.some((item: { slug: string }) => item.slug === 'unpublished-case')).toBe(false)

    const publicDetailRes = await request(app).get('/api/engineering-cases/unpublished-case')
    expect(publicDetailRes.status).toBe(404)

    const adminListRes = await request(app)
      .get('/api/admin/engineering-cases')
      .set('Authorization', `Bearer ${token}`)
    expect(adminListRes.status).toBe(200)
    expect(adminListRes.body.some((item: { slug: string }) => item.slug === 'unpublished-case')).toBe(true)

    const publishRes = await request(app)
      .put(`/api/admin/engineering-cases/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ published: true })
    expect(publishRes.status).toBe(200)
    expect(publishRes.body.published).toBe(true)

    const publicDetailAfterPublishRes = await request(app).get('/api/engineering-cases/unpublished-case')
    expect(publicDetailAfterPublishRes.status).toBe(200)

    await request(app).delete(`/api/admin/engineering-cases/${id}`).set('Authorization', `Bearer ${token}`)
  })

  it('rejects fetching the admin engineering case list without authentication', async () => {
    const res = await request(app).get('/api/admin/engineering-cases')
    expect(res.status).toBe(401)
  })
})

describe('admin certification CRUD', () => {
  it('rejects creation with missing required fields', async () => {
    const res = await request(app)
      .post('/api/admin/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({ nameZh: '測試證照' })
    expect(res.status).toBe(400)
  })

  it('creates, updates, is visible on the public API, and deletes a certification', async () => {
    const createRes = await request(app)
      .post('/api/admin/certifications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nameZh: '測試證照',
        nameEn: 'Test Certification',
        issuerZh: '測試機構',
        issuerEn: 'Test Issuer',
        sortOrder: 10,
      })
    expect(createRes.status).toBe(201)
    const id = createRes.body.id as number

    const publicRes = await request(app).get('/api/certifications')
    expect(publicRes.body.some((item: { nameZh: string }) => item.nameZh === '測試證照')).toBe(true)

    const updateRes = await request(app)
      .put(`/api/admin/certifications/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nameZh: '測試證照更新' })
    expect(updateRes.status).toBe(200)
    expect(updateRes.body.nameZh).toBe('測試證照更新')

    const deleteRes = await request(app)
      .delete(`/api/admin/certifications/${id}`)
      .set('Authorization', `Bearer ${token}`)
    expect(deleteRes.status).toBe(204)

    const afterDeleteRes = await request(app).get('/api/certifications')
    expect(afterDeleteRes.body.some((item: { id: number }) => item.id === id)).toBe(false)
  })
})

describe('admin avatar upload', () => {
  it('rejects disallowed file types', async () => {
    const res = await request(app)
      .post('/api/admin/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from('not an image'), { filename: 'avatar.txt', contentType: 'text/plain' })
    expect(res.status).toBe(400)
  })

  it('rejects files larger than the configured limit', async () => {
    const oversized = Buffer.alloc(6 * 1024 * 1024, 1)
    const res = await request(app)
      .post('/api/admin/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', oversized, { filename: 'avatar.jpg', contentType: 'image/jpeg' })
    expect(res.status).toBe(400)
  })

  it('accepts a valid image and updates the profile avatarUrl', async () => {
    const res = await request(app)
      .post('/api/admin/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
    expect(res.status).toBe(200)
    expect(typeof res.body.avatarUrl).toBe('string')
    expect(res.body.avatarUrl).toMatch(/^\/uploads\//)
    uploadedFiles.push(path.basename(res.body.avatarUrl as string))

    const publicRes = await request(app).get('/api/profile')
    expect(publicRes.body.avatarUrl).toBe(res.body.avatarUrl)
  })

  it('rejects avatar upload without authentication', async () => {
    const res = await request(app)
      .post('/api/admin/avatar')
      .attach('avatar', Buffer.from([0xff, 0xd8, 0xff, 0xd9]), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
    expect(res.status).toBe(401)
  })
})
