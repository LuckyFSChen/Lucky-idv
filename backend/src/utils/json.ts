export function parseStringArray(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

export interface ContactLink {
  label: string
  url: string
}

export function parseContactLinks(value: string | null): ContactLink[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is ContactLink =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ContactLink).label === 'string' &&
        typeof (item as ContactLink).url === 'string',
    )
  } catch {
    return []
  }
}

export interface ArchitectureStep {
  labelZh: string
  labelEn: string
}

export function parseArchitectureSteps(value: string | null): ArchitectureStep[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is ArchitectureStep =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ArchitectureStep).labelZh === 'string' &&
        typeof (item as ArchitectureStep).labelEn === 'string',
    )
  } catch {
    return []
  }
}
