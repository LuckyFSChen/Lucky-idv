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
  summaryZh: string
  summaryEn: string
  highlightsZh: string[]
  highlightsEn: string[]
  techStack: string[]
  link: string | null
  imageUrl: string | null
  sortOrder: number
}
