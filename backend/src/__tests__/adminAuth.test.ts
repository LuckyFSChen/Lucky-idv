import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import app from '../app.js'
import { prisma } from '../db.js'

const TEST_ADMIN_EMAIL = 'test-admin@example.com'
const TEST_ADMIN_PASSWORD = 'Test-Password-123!'

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10)
  await prisma.adminUser.upsert({
    where: { email: TEST_ADMIN_EMAIL },
    update: { passwordHash },
    create: { email: TEST_ADMIN_EMAIL, passwordHash },
  })
})

afterAll(async () => {
  await prisma.adminUser.delete({ where: { email: TEST_ADMIN_EMAIL } })
  await prisma.$disconnect()
})

describe('admin login', () => {
  it('rejects malformed login payloads', async () => {
    const res = await request(app).post('/api/admin/login').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: TEST_ADMIN_EMAIL, password: 'wrong-password' })
    expect(res.status).toBe(401)
  })

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: 'nobody@example.com', password: TEST_ADMIN_PASSWORD })
    expect(res.status).toBe(401)
  })

  it('issues a JWT for correct credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD })
    expect(res.status).toBe(200)
    expect(typeof res.body.token).toBe('string')
  })
})

describe('admin route protection', () => {
  it('rejects requests without a token', async () => {
    const res = await request(app).put('/api/admin/profile').send({ displayName: 'X' })
    expect(res.status).toBe(401)
  })

  it('rejects requests with an invalid token', async () => {
    const res = await request(app)
      .put('/api/admin/profile')
      .set('Authorization', 'Bearer not-a-real-token')
      .send({ displayName: 'X' })
    expect(res.status).toBe(401)
  })
})
