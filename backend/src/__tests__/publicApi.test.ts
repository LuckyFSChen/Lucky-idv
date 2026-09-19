import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { prisma } from '../db.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('public read-only API', () => {
  it('GET /api/profile returns the seeded profile', async () => {
    const res = await request(app).get('/api/profile')
    expect(res.status).toBe(200)
    expect(res.body.displayName).toBe('Lucky')
    expect(Array.isArray(res.body.contactLinks)).toBe(true)
  })

  it('GET /api/skills returns categories with nested skills', async () => {
    const res = await request(app).get('/api/skills')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    expect(Array.isArray(res.body[0].skills)).toBe(true)
  })

  it('GET /api/experience returns experience entries with parsed highlights', async () => {
    const res = await request(app).get('/api/experience')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(Array.isArray(res.body[0].highlightsZh)).toBe(true)
    expect(res.body[0].highlightsZh.length).toBeGreaterThan(0)
  })

  it('GET /api/projects returns projects with parsed highlights and tech stack', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].nameZh).toBe('DineFlow')
    expect(Array.isArray(res.body[0].techStack)).toBe(true)
  })

  it('GET /api/projects includes the new category/subtitle/featured/githubUrl fields', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    const project = res.body[0]
    expect(project).toHaveProperty('categoryZh')
    expect(project).toHaveProperty('subtitleZh')
    expect(project).toHaveProperty('featured')
    expect(project).toHaveProperty('githubUrl')
    expect(project.featured).toBe(true)
  })

  it('GET /api/engineering-cases returns cases ordered with parsed architecture and tech stack', async () => {
    const res = await request(app).get('/api/engineering-cases')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThan(0)
    const featuredCase = res.body.find((item: { slug: string }) => item.slug === 'taskflow-multi-agent-pipeline')
    expect(featuredCase).toBeTruthy()
    expect(featuredCase.featured).toBe(true)
    expect(Array.isArray(featuredCase.architecture)).toBe(true)
    expect(featuredCase.architecture.length).toBeGreaterThan(0)
    expect(featuredCase.architecture[0]).toHaveProperty('labelZh')
    expect(featuredCase.architecture[0]).toHaveProperty('labelEn')
    expect(Array.isArray(featuredCase.techStack)).toBe(true)
    expect(featuredCase.techStack.length).toBeGreaterThan(0)
  })

  it('GET /api/engineering-cases/:slug returns the matching case', async () => {
    const res = await request(app).get('/api/engineering-cases/taskflow-multi-agent-pipeline')
    expect(res.status).toBe(200)
    expect(res.body.titleZh).toBeTruthy()
    expect(res.body.titleEn).toBeTruthy()
    expect(Array.isArray(res.body.architecture)).toBe(true)
  })

  it('GET /api/engineering-cases/:slug returns 404 for an unknown slug', async () => {
    const res = await request(app).get('/api/engineering-cases/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body.error).toBeTruthy()
  })

  it('GET /api/certifications returns the seeded ISO 27001 certification', async () => {
    const res = await request(app).get('/api/certifications')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    const iso = res.body.find((item: { nameZh: string }) => item.nameZh.includes('ISO 27001'))
    expect(iso).toBeTruthy()
    expect(iso.nameEn).toContain('ISO 27001')
  })
})
