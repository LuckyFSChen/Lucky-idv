import { mount } from '@vue/test-utils'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import CertificationSection from '@/components/CertificationSection.vue'
import { useLocaleStore } from '@/stores/locale'
import type { Certification } from '@/types/api'

const certifications: Certification[] = [
  {
    id: 1,
    nameZh: 'ISO 27001 主導稽核員',
    nameEn: 'ISO 27001 Lead Auditor',
    issuerZh: 'BSI',
    issuerEn: 'BSI',
    descriptionZh: '資訊安全管理系統主導稽核員資格。',
    descriptionEn: 'Lead auditor qualification for information security management systems.',
    credential: 'ISO27001-0001',
    issuedAt: '2024-01-01T00:00:00.000Z',
    link: 'https://example.com/certificate',
    sortOrder: 0,
  },
]

const unverifiedCertification: Certification = {
  id: 2,
  nameZh: 'ISO 27001:2022 資訊安全管理系統主導稽核員',
  nameEn: 'ISO 27001:2022 Information Security Management System Lead Auditor',
  issuerZh: 'BSI 英國標準協會',
  issuerEn: 'BSI (British Standards Institution)',
  descriptionZh: '取得 CQI & IRCA 認證之 ISO 27001:2022 資訊安全管理系統主導稽核員資格。',
  descriptionEn: 'Holds a CQI & IRCA certified ISO 27001:2022 Information Security Management System Lead Auditor qualification.',
  credential: 'CQI & IRCA Lead Auditor',
  issuedAt: null,
  link: null,
  sortOrder: 1,
}

describe('CertificationSection', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('renders the empty state message when there are no certifications', () => {
    const wrapper = mount(CertificationSection, {
      props: { certifications: [] },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.text()).toContain('尚未發佈任何認證。')
  })

  it('does not render certifications missing a verified issuedAt date, even if provided by the API', () => {
    const wrapper = mount(CertificationSection, {
      props: { certifications: [unverifiedCertification] },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.text()).not.toContain('ISO 27001:2022 資訊安全管理系統主導稽核員')
    expect(wrapper.text()).toContain('尚未發佈任何認證。')
  })

  it('filters out unverified entries while still rendering verified ones in a mixed list', () => {
    const wrapper = mount(CertificationSection, {
      props: { certifications: [...certifications, unverifiedCertification] },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.text()).toContain('ISO 27001 主導稽核員')
    expect(wrapper.text()).not.toContain('ISO 27001:2022 資訊安全管理系統主導稽核員')
    expect(wrapper.findAll('.certification__card')).toHaveLength(1)
  })

  it('renders certification name/issuer/description/credential and a link to the credential', () => {
    const wrapper = mount(CertificationSection, {
      props: { certifications },
      global: { plugins: [MotionPlugin] },
    })

    expect(wrapper.text()).toContain('ISO 27001 主導稽核員')
    expect(wrapper.text()).toContain('BSI')
    expect(wrapper.text()).toContain('資訊安全管理系統主導稽核員資格。')
    expect(wrapper.text()).toContain('ISO27001-0001')

    const link = wrapper.get('a.certification__link')
    expect(link.attributes('href')).toBe('https://example.com/certificate')
  })

  it('renders en name/issuer/description when the locale is switched to English', async () => {
    const wrapper = mount(CertificationSection, {
      props: { certifications },
      global: { plugins: [MotionPlugin] },
    })
    useLocaleStore().set('en')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('ISO 27001 Lead Auditor')
    expect(wrapper.text()).toContain('Lead auditor qualification for information security management systems.')
  })
})
