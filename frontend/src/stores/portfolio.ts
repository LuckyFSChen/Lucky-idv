import { defineStore } from 'pinia'
import { fetchJson } from '@/api/client'
import type { Experience, Profile, Project, SkillCategory } from '@/types/api'

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export const usePortfolioStore = defineStore('portfolio', {
  state: () => ({
    profile: null as Profile | null,
    skillCategories: [] as SkillCategory[],
    experiences: [] as Experience[],
    projects: [] as Project[],
    status: 'idle' as FetchStatus,
    error: null as string | null,
  }),
  actions: {
    async fetchAll() {
      this.status = 'loading'
      this.error = null
      try {
        const [profile, skillCategories, experiences, projects] = await Promise.all([
          fetchJson<Profile>('/api/profile'),
          fetchJson<SkillCategory[]>('/api/skills'),
          fetchJson<Experience[]>('/api/experience'),
          fetchJson<Project[]>('/api/projects'),
        ])
        this.profile = profile
        this.skillCategories = skillCategories
        this.experiences = experiences
        this.projects = projects
        this.status = 'success'
      } catch (err) {
        this.error = err instanceof Error ? err.message : '資料載入失敗，請稍後再試。'
        this.status = 'error'
      }
    },
  },
})
