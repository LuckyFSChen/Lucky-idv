import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { afterAll, describe, expect, it } from 'vitest'

const prisma = new PrismaClient()

afterAll(async () => {
  await prisma.$disconnect()
})

describe('seed data', () => {
  it('populates profile, skills, experience, projects and admin user', async () => {
    const [profileCount, skillCategoryCount, skillCount, experienceCount, projectCount, adminCount] =
      await Promise.all([
        prisma.profile.count(),
        prisma.skillCategory.count(),
        prisma.skill.count(),
        prisma.experience.count(),
        prisma.project.count(),
        prisma.adminUser.count(),
      ])

    expect(profileCount).toBe(1)
    expect(skillCategoryCount).toBe(13)
    expect(skillCount).toBe(43)
    expect(experienceCount).toBe(1)
    expect(projectCount).toBe(1)
    expect(adminCount).toBe(1)
  })
})
