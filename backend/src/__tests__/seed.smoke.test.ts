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
    expect(skillCategoryCount).toBe(6)
    expect(skillCount).toBe(34)
    expect(experienceCount).toBe(1)
    expect(projectCount).toBe(4)
    expect(adminCount).toBe(1)
  })

  it('populates exactly 9 engineering cases including the original multi-agent pipeline', async () => {
    const [engineeringCaseCount, certificationCount, featuredCase] = await Promise.all([
      prisma.engineeringCase.count(),
      prisma.certification.count(),
      prisma.engineeringCase.findUnique({ where: { slug: 'taskflow-multi-agent-pipeline' } }),
    ])

    expect(engineeringCaseCount).toBe(9)
    expect(certificationCount).toBeGreaterThanOrEqual(1)
    expect(featuredCase).toBeTruthy()
    expect(featuredCase?.featured).toBe(true)
    expect(featuredCase?.titleZh).toBeTruthy()
    expect(featuredCase?.titleEn).toBeTruthy()
  })

  it('includes all 8 newly added engineering case slugs', async () => {
    const slugs = [
      'git-repository-topology-detection',
      'deterministic-deployment-validation',
      'test-baseline-regression-detection',
      'ai-structured-output-recovery',
      'preview-runtime-lifecycle-management',
      'remote-ai-agent-infrastructure',
      'multi-region-ecommerce-integration',
      'payment-integration-order-state',
    ]
    const cases = await prisma.engineeringCase.findMany({ where: { slug: { in: slugs } } })
    expect(cases.length).toBe(slugs.length)
  })

  it('marks all engineering cases as published by default', async () => {
    const unpublishedCount = await prisma.engineeringCase.count({ where: { published: false } })
    expect(unpublishedCount).toBe(0)
  })

  it('marks the three Bento-featured engineering cases (Git Repository Topology, Deterministic Deployment Validation, Multi-region E-commerce Integration) as featured', async () => {
    const bentoSlugs = [
      'git-repository-topology-detection',
      'deterministic-deployment-validation',
      'multi-region-ecommerce-integration',
    ]
    const bentoCases = await prisma.engineeringCase.findMany({ where: { slug: { in: bentoSlugs } } })
    expect(bentoCases.length).toBe(bentoSlugs.length)
    expect(bentoCases.every((item) => item.featured)).toBe(true)
  })

  it('marks the seeded project as featured', async () => {
    const featuredProject = await prisma.project.findFirst({ where: { featured: true } })
    expect(featuredProject).toBeTruthy()
  })
})
