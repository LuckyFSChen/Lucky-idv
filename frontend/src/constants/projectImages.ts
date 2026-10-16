export const MAX_PROJECT_IMAGES = 3
export const MAX_PROJECT_IMAGE_SIZE_MB = 5
export const MAX_PROJECT_IMAGE_SIZE_BYTES = MAX_PROJECT_IMAGE_SIZE_MB * 1024 * 1024
export const PROJECT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const PROJECT_IMAGE_ACCEPT = PROJECT_IMAGE_MIME_TYPES.join(',')
