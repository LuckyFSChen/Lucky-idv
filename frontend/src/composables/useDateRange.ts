import type { Locale } from '@/stores/locale'

const zhFormatter = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: '2-digit' })
const enFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short' })

export function formatDateRange(startDate: string, endDate: string | null, locale: Locale): string {
  const formatter = locale === 'zh' ? zhFormatter : enFormatter
  const start = formatter.format(new Date(startDate))
  const end = endDate ? formatter.format(new Date(endDate)) : locale === 'zh' ? '至今' : 'Present'
  return `${start} – ${end}`
}
