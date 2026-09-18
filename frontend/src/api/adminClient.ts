import type { ContactLink, Experience, Profile, Project, Skill, SkillCategory } from '@/types/api'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class AdminApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
  }
}

async function adminRequest<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (!res.ok) {
    let message = `請求失敗（${res.status}）`
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // ignore body parse failure, fall back to default message
    }
    throw new AdminApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function adminLogin(email: string, password: string): Promise<{ token: string }> {
  return adminRequest<{ token: string }>('/api/admin/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export interface ProfileInput {
  displayName: string
  preferredName: string
  titleZh: string
  titleEn: string
  introZh: string
  introEn: string
  contactEmail: string | null
  contactLinks: ContactLink[]
}

export interface SkillCategoryInput {
  nameZh: string
  nameEn: string
  sortOrder?: number
}

export interface SkillInput {
  categoryId: number
  nameZh: string
  nameEn: string
  sortOrder?: number
}

export interface ExperienceInput {
  companyZh: string
  companyEn: string
  roleZh: string
  roleEn: string
  locationZh?: string | null
  locationEn?: string | null
  startDate: string
  endDate?: string | null
  summaryZh: string
  summaryEn: string
  highlightsZh: string[]
  highlightsEn: string[]
  sortOrder?: number
}

export interface ProjectInput {
  nameZh: string
  nameEn: string
  summaryZh: string
  summaryEn: string
  highlightsZh: string[]
  highlightsEn: string[]
  techStack?: string[]
  link?: string | null
  imageUrl?: string | null
  sortOrder?: number
}

export const adminApi = {
  updateProfile: (token: string | null, data: Partial<ProfileInput>) =>
    adminRequest<Profile>('/api/admin/profile', token, { method: 'PUT', body: JSON.stringify(data) }),

  uploadAvatar: (token: string | null, file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return adminRequest<Profile>('/api/admin/avatar', token, { method: 'POST', body: formData })
  },

  createSkillCategory: (token: string | null, data: SkillCategoryInput) =>
    adminRequest<SkillCategory>('/api/admin/skill-categories', token, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSkillCategory: (token: string | null, id: number, data: Partial<SkillCategoryInput>) =>
    adminRequest<SkillCategory>(`/api/admin/skill-categories/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSkillCategory: (token: string | null, id: number) =>
    adminRequest<void>(`/api/admin/skill-categories/${id}`, token, { method: 'DELETE' }),

  createSkill: (token: string | null, data: SkillInput) =>
    adminRequest<Skill>('/api/admin/skills', token, { method: 'POST', body: JSON.stringify(data) }),

  updateSkill: (token: string | null, id: number, data: Partial<SkillInput>) =>
    adminRequest<Skill>(`/api/admin/skills/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),

  deleteSkill: (token: string | null, id: number) =>
    adminRequest<void>(`/api/admin/skills/${id}`, token, { method: 'DELETE' }),

  createExperience: (token: string | null, data: ExperienceInput) =>
    adminRequest<Experience>('/api/admin/experience', token, { method: 'POST', body: JSON.stringify(data) }),

  updateExperience: (token: string | null, id: number, data: Partial<ExperienceInput>) =>
    adminRequest<Experience>(`/api/admin/experience/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteExperience: (token: string | null, id: number) =>
    adminRequest<void>(`/api/admin/experience/${id}`, token, { method: 'DELETE' }),

  createProject: (token: string | null, data: ProjectInput) =>
    adminRequest<Project>('/api/admin/projects', token, { method: 'POST', body: JSON.stringify(data) }),

  updateProject: (token: string | null, id: number, data: Partial<ProjectInput>) =>
    adminRequest<Project>(`/api/admin/projects/${id}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProject: (token: string | null, id: number) =>
    adminRequest<void>(`/api/admin/projects/${id}`, token, { method: 'DELETE' }),
}
