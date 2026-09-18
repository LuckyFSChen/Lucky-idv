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
})
