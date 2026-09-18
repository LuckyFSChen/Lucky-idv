/**
 * D1 相容性測試（miniflare + @prisma/adapter-d1）。
 *
 * 目的：在**真正的 D1（本機 miniflare 實作）**上，而不是 SQLite 檔案上，
 * 驗證 schema 與 Prisma 查詢行為，涵蓋 CLOUDFLARE_MIGRATION_PLAN.md 點名的
 * 幾項 D1 風險：FK cascade、unique index、autoincrement、DateTime 往返，
 * 以及 public API 實際使用的巢狀 include 查詢形狀。
 *
 * 這些測試不碰任何本機 SQLite 檔案，可與既有的 supertest 測試並存。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { D1Database } from '@cloudflare/workers-types'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '@prisma/client'
import { Miniflare } from 'miniflare'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

let mf: Miniflare
let prisma: PrismaClient

/** 把 migration 檔拆成單句（本專案的 SQL 不含字串內分號，可安全以 ; 切割）。 */
function splitStatements(sql: string): string[] {
  return sql
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

beforeAll(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default { fetch() { return new Response("ok") } };',
    d1Databases: { DB: 'idv-web-test' },
    // ⚠️ 必須 <= 已安裝的 workerd binary 所支援的最新日期，否則 runtime 會拒絕啟動：
    //   "This Worker requires compatibility date X, but the newest date supported
    //    by this server binary is Y."
    // 與 wrangler.jsonc 的 compatibility_date 保持一致；升級 wrangler 後可一併調高。
    // D1 的 SQL 語意不受此日期影響，這裡只是為了讓 miniflare 能啟動。
    compatibilityDate: '2026-08-06',
  })

  const db = (await mf.getD1Database('DB')) as unknown as D1Database

  const migration = readFileSync(join(process.cwd(), 'migrations', '0001_init.sql'), 'utf8')
  for (const statement of splitStatements(migration)) {
    await db.prepare(statement).run()
  }

  prisma = new PrismaClient({ adapter: new PrismaD1(db) })
})

afterAll(async () => {
  await prisma?.$disconnect()
  await mf?.dispose()
})

describe('D1：schema 與基本 CRUD', () => {
  it('autoincrement 主鍵可正常配發', async () => {
    const a = await prisma.skillCategory.create({ data: { nameZh: '後端', nameEn: 'Backend' } })
    const b = await prisma.skillCategory.create({ data: { nameZh: 'API', nameEn: 'API' } })

    expect(Number.isInteger(a.id)).toBe(true)
    expect(b.id).toBeGreaterThan(a.id)
  })

  it('Profile 可往返，DateTime 與 JSON-as-String 欄位皆正確', async () => {
    const contactLinks = JSON.stringify([{ label: 'GitHub', url: 'https://example.com' }])

    const created = await prisma.profile.create({
      data: {
        displayName: 'Lucky',
        preferredName: 'Lucky',
        titleZh: '後端工程師',
        titleEn: 'Backend Engineer',
        introZh: '介紹\n\n含換行與 \'單引號\'',
        introEn: 'Intro',
        contactLinks,
      },
    })

    const found = await prisma.profile.findFirst({ orderBy: { id: 'asc' } })

    expect(found?.id).toBe(created.id)
    expect(found?.contactLinks).toBe(contactLinks)
    expect(found?.introZh).toContain("'單引號'")
    // @updatedAt 由 Prisma 在應用層填入，應往返為 Date
    expect(found?.updatedAt).toBeInstanceOf(Date)
  })

  it('Experience 的 DateTime（含 nullable endDate）往返正確', async () => {
    const startDate = new Date('2023-08-01T00:00:00.000Z')

    const created = await prisma.experience.create({
      data: {
        companyZh: '公司', companyEn: 'Company',
        roleZh: '工程師', roleEn: 'Engineer',
        startDate, endDate: null,
        summaryZh: '摘要', summaryEn: 'Summary',
        highlightsZh: JSON.stringify(['重點']),
        highlightsEn: JSON.stringify(['Highlight']),
      },
    })

    const found = await prisma.experience.findUnique({ where: { id: created.id } })

    expect(found?.startDate.getTime()).toBe(startDate.getTime())
    expect(found?.endDate).toBeNull()
  })
})

describe('D1：關聯與約束', () => {
  it('巢狀 include 可運作（對應 GET /api/skills 的查詢形狀）', async () => {
    const category = await prisma.skillCategory.create({
      data: {
        nameZh: '資料庫', nameEn: 'Database', sortOrder: 1,
        skills: {
          create: [
            { nameZh: 'MySQL', nameEn: 'MySQL', sortOrder: 0 },
            { nameZh: 'SQLite', nameEn: 'SQLite', sortOrder: 1 },
          ],
        },
      },
    })

    const categories = await prisma.skillCategory.findMany({
      where: { id: category.id },
      orderBy: { sortOrder: 'asc' },
      include: { skills: { orderBy: { sortOrder: 'asc' } } },
    })

    expect(categories).toHaveLength(1)
    expect(categories[0].skills.map((s) => s.nameEn)).toEqual(['MySQL', 'SQLite'])
  })

  it('onDelete: Cascade 生效 —— 刪除分類會一併刪除底下技能', async () => {
    const category = await prisma.skillCategory.create({
      data: {
        nameZh: '暫存', nameEn: 'Temp',
        skills: { create: [{ nameZh: 'A', nameEn: 'A' }, { nameZh: 'B', nameEn: 'B' }] },
      },
    })

    expect(await prisma.skill.count({ where: { categoryId: category.id } })).toBe(2)

    await prisma.skillCategory.delete({ where: { id: category.id } })

    expect(await prisma.skill.count({ where: { categoryId: category.id } })).toBe(0)
  })

  it('AdminUser.email 的 unique index 生效', async () => {
    const email = 'unique-probe@example.com'
    await prisma.adminUser.create({ data: { email, passwordHash: '$2a$10$x' } })

    await expect(
      prisma.adminUser.create({ data: { email, passwordHash: '$2a$10$y' } }),
    ).rejects.toThrow()
  })

  it('upsert 可運作（seed 建立管理者帳號所依賴的操作）', async () => {
    const email = 'upsert-probe@example.com'

    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash: '$2a$10$updated' },
      create: { email, passwordHash: '$2a$10$created' },
    })
    const first = await prisma.adminUser.findUnique({ where: { email } })
    expect(first?.passwordHash).toBe('$2a$10$created')

    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash: '$2a$10$updated' },
      create: { email, passwordHash: '$2a$10$created' },
    })
    const second = await prisma.adminUser.findUnique({ where: { email } })
    expect(second?.passwordHash).toBe('$2a$10$updated')
    expect(await prisma.adminUser.count({ where: { email } })).toBe(1)
  })
})
