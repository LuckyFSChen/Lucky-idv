export interface ContactLink {
  label: string
  url: string
}

export interface Profile {
  id: number
  displayName: string
  preferredName: string
  titleZh: string
  titleEn: string
  introZh: string
  introEn: string
  avatarUrl: string | null
  contactEmail: string | null
  contactLinks: ContactLink[]
  updatedAt: string
}

export interface Skill {
  id: number
  nameZh: string
  nameEn: string
  sortOrder: number
  categoryId: number
}

export interface SkillCategory {
  id: number
  nameZh: string
  nameEn: string
  sortOrder: number
  skills: Skill[]
}

export interface Experience {
  id: number
  companyZh: string
  companyEn: string
  roleZh: string
  roleEn: string
  locationZh: string | null
  locationEn: string | null
  startDate: string
  endDate: string | null
  summaryZh: string
  summaryEn: string
  highlightsZh: string[]
  highlightsEn: string[]
  sortOrder: number
}

export interface Project {
  id: number
  nameZh: string
  nameEn: string
  categoryZh: string | null
  categoryEn: string | null
  subtitleZh: string | null
  subtitleEn: string | null
  summaryZh: string
  summaryEn: string
  highlightsZh: string[]
  highlightsEn: string[]
  techStack: string[]
  link: string | null
  githubUrl: string | null
  imageUrl: string | null
  featured: boolean
  sortOrder: number
}

export interface ArchitectureStep {
  labelZh: string
  labelEn: string
}

export interface EngineeringCase {
  id: number
  slug: string
  titleZh: string
  titleEn: string
  categoryZh: string
  categoryEn: string
  summaryZh: string
  summaryEn: string
  problemZh: string
  problemEn: string
  contextZh: string
  contextEn: string
  investigationZh: string
  investigationEn: string
  solutionZh: string
  solutionEn: string
  validationZh: string
  validationEn: string
  resultZh: string
  resultEn: string
  architecture: ArchitectureStep[]
  techStack: string[]
  githubUrl: string | null
  projectUrl: string | null
  featured: boolean
  published: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface Certification {
  id: number
  nameZh: string
  nameEn: string
  issuerZh: string
  issuerEn: string
  descriptionZh: string | null
  descriptionEn: string | null
  credential: string | null
  issuedAt: string | null
  link: string | null
  sortOrder: number
}
