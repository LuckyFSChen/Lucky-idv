import { Router } from 'express'
import { prisma } from '../db.js'
import { parseArchitectureSteps, parseContactLinks, parseStringArray } from '../utils/json.js'

export const publicRouter = Router()

publicRouter.get('/profile', async (_req, res) => {
  const profile = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })
  if (!profile) {
    res.status(404).json({ error: '尚未設定個人資料。' })
    return
  }
  res.json({
    ...profile,
    contactLinks: parseContactLinks(profile.contactLinks),
  })
})

publicRouter.get('/skills', async (_req, res) => {
  const categories = await prisma.skillCategory.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { skills: { orderBy: { sortOrder: 'asc' } } },
  })
  res.json(categories)
})

publicRouter.get('/experience', async (_req, res) => {
  const experiences = await prisma.experience.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json(
    experiences.map((experience) => ({
      ...experience,
      highlightsZh: parseStringArray(experience.highlightsZh),
      highlightsEn: parseStringArray(experience.highlightsEn),
    })),
  )
})

publicRouter.get('/projects', async (_req, res) => {
  const projects = await prisma.project.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json(
    projects.map((project) => ({
      ...project,
      highlightsZh: parseStringArray(project.highlightsZh),
      highlightsEn: parseStringArray(project.highlightsEn),
      techStack: parseStringArray(project.techStack),
    })),
  )
})

publicRouter.get('/engineering-cases', async (_req, res) => {
  const cases = await prisma.engineeringCase.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json(
    cases.map((engineeringCase) => ({
      ...engineeringCase,
      architecture: parseArchitectureSteps(engineeringCase.architecture),
      techStack: parseStringArray(engineeringCase.techStack),
    })),
  )
})

publicRouter.get('/engineering-cases/:slug', async (req, res) => {
  const engineeringCase = await prisma.engineeringCase.findUnique({ where: { slug: req.params.slug } })
  if (!engineeringCase) {
    res.status(404).json({ error: '找不到指定的工程案例。' })
    return
  }
  res.json({
    ...engineeringCase,
    architecture: parseArchitectureSteps(engineeringCase.architecture),
    techStack: parseStringArray(engineeringCase.techStack),
  })
})

publicRouter.get('/certifications', async (_req, res) => {
  const certifications = await prisma.certification.findMany({ orderBy: { sortOrder: 'asc' } })
  res.json(certifications)
})
