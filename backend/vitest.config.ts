import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // 僅供測試簽發 token，不依賴開發或正式環境的憑證。
    env: {
      JWT_SECRET: 'taskflow-vitest-only-signing-key',
    },
    fileParallelism: false,
  },
})
