/**
 * 由本機 SQLite（DATABASE_URL）匯出「內容資料」為 D1 可套用的 SQL。
 *
 *   npm run d1:seed:sql           # 產生 INSERT（適用於全新的空 D1）
 *   npm run d1:seed:sql -- --reset  # 前面加上 DELETE，用於重置既有 D1（破壞性，需明示）
 *
 * 設計理由：
 *   - **單一事實來源仍是 `prisma/seed.ts`**。先照常跑 `npm run db:setup` 把本機
 *     SQLite 種好，再由本腳本匯出，避免把 13 個分類 / 43 項技能手動抄成 SQL
 *     而產生不一致。
 *   - **刻意不含 AdminUser**。管理者帳號含密碼雜湊，屬 secret，由
 *     `d1-admin-sql.ts` 依環境變數另外產生，絕不寫死在版控檔案裡。
 *   - 預設**非破壞性**：只產生 INSERT。要清空既有資料必須顯式加 `--reset`。
 *
 * ⚠️ DateTime 欄位一律輸出為 **整數（epoch 毫秒）**，與 Prisma SQLite connector
 *    的實際儲存格式一致（已對 dev.db 實測確認 typeof = integer）。
 *    若改輸出 ISO 字串，Prisma 讀回時會解析失敗。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const reset = process.argv.includes('--reset')

/** SQL 字面值：null / 數字 / 日期 / 字串。字串中的單引號以 '' 跳脫。 */
function lit(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "''")}'`
  }
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  return `'${String(value).replace(/'/g, "''")}'`
}

function insert(table: string, columns: string[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return `-- ${table}: 無資料\n`
  const cols = columns.map((c) => `"${c}"`).join(', ')
  const values = rows
    .map((row) => `  (${columns.map((c) => lit(row[c])).join(', ')})`)
    .join(',\n')
  return `INSERT INTO "${table}" (${cols}) VALUES\n${values};\n`
}

async function main(): Promise<void> {
  const [profiles, categories, skills, experiences, projects, engineeringCases, certifications] =
    await Promise.all([
      prisma.profile.findMany({ orderBy: { id: 'asc' } }),
      prisma.skillCategory.findMany({ orderBy: { id: 'asc' } }),
      prisma.skill.findMany({ orderBy: { id: 'asc' } }),
      prisma.experience.findMany({ orderBy: { id: 'asc' } }),
      prisma.project.findMany({ orderBy: { id: 'asc' } }),
      prisma.engineeringCase.findMany({ orderBy: { id: 'asc' } }),
      prisma.certification.findMany({ orderBy: { id: 'asc' } }),
    ])

  const parts: string[] = [
    '-- idv-web 內容種子資料',
    `-- 由 backend/scripts/d1-export-seed.ts 於 ${new Date().toISOString()} 匯出`,
    '-- 來源：本機 SQLite（DATABASE_URL）',
    '--',
    '-- ⚠️ 本檔案不含 AdminUser（管理者帳號含密碼雜湊，請用 d1-admin-sql.ts 另行產生）。',
    '',
  ]

  if (reset) {
    parts.push(
      '-- ⚠️ 破壞性：清空既有內容資料（--reset）。AdminUser 不在清單內，不會被刪除。',
      'DELETE FROM "Skill";',
      'DELETE FROM "SkillCategory";',
      'DELETE FROM "Experience";',
      'DELETE FROM "Project";',
      'DELETE FROM "EngineeringCase";',
      'DELETE FROM "Certification";',
      'DELETE FROM "Profile";',
      '',
    )
  }

  // 先分類後技能，維持 FK 順序
  parts.push(
    insert(
      'Profile',
      [
        'id', 'displayName', 'preferredName', 'titleZh', 'titleEn',
        'introZh', 'introEn', 'avatarUrl', 'contactEmail', 'contactLinks', 'updatedAt',
      ],
      profiles,
    ),
    insert('SkillCategory', ['id', 'nameZh', 'nameEn', 'sortOrder'], categories),
    insert('Skill', ['id', 'nameZh', 'nameEn', 'sortOrder', 'categoryId'], skills),
    insert(
      'Experience',
      [
        'id', 'companyZh', 'companyEn', 'roleZh', 'roleEn', 'locationZh', 'locationEn',
        'startDate', 'endDate', 'summaryZh', 'summaryEn',
        'highlightsZh', 'highlightsEn', 'sortOrder',
      ],
      experiences,
    ),
    insert(
      'Project',
      [
        'id', 'nameZh', 'nameEn', 'categoryZh', 'categoryEn', 'subtitleZh', 'subtitleEn',
        'summaryZh', 'summaryEn', 'highlightsZh', 'highlightsEn', 'techStack',
        'link', 'githubUrl', 'imageUrl', 'featured', 'sortOrder',
      ],
      projects,
    ),
    insert(
      'EngineeringCase',
      [
        'id', 'slug', 'titleZh', 'titleEn', 'categoryZh', 'categoryEn',
        'summaryZh', 'summaryEn', 'problemZh', 'problemEn', 'contextZh', 'contextEn',
        'investigationZh', 'investigationEn', 'solutionZh', 'solutionEn',
        'validationZh', 'validationEn', 'resultZh', 'resultEn',
        'architecture', 'techStack', 'githubUrl', 'projectUrl',
        'featured', 'published', 'sortOrder', 'createdAt', 'updatedAt',
      ],
      engineeringCases,
    ),
    insert(
      'Certification',
      [
        'id', 'nameZh', 'nameEn', 'issuerZh', 'issuerEn',
        'descriptionZh', 'descriptionEn', 'credential', 'issuedAt', 'link', 'sortOrder',
      ],
      certifications,
    ),
  )

  const outPath = join(process.cwd(), '.generated', 'd1-seed.sql')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, parts.join('\n'), 'utf8')

  console.log(`已輸出：${outPath}`)
  console.log(
    `內容：Profile ${profiles.length}、SkillCategory ${categories.length}、` +
      `Skill ${skills.length}、Experience ${experiences.length}、Project ${projects.length}、` +
      `EngineeringCase ${engineeringCases.length}、Certification ${certifications.length}` +
      (reset ? '（含 --reset 的 DELETE）' : ''),
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
