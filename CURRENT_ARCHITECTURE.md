# CURRENT_ARCHITECTURE.md

> Lucky-idv（`idv-web`）現況架構盤點
> 盤點日期：2026-09-18
> 目的：作為遷移至 Cloudflare Workers / D1 / R2 / Static Assets 的基準文件（Phase 0 — 只盤點，不修改行為）
> 本文件不含任何 secret 真實值。

---

## 0. 專案總覽

```
v1/
├── backend/          Express 4 + Prisma 5 (SQLite) + JWT 單一管理者
│   ├── prisma/       schema.prisma, seed.ts, dev.db（無 migrations/）
│   ├── scripts/      ensure-prisma-client.cjs, hash-password.cjs
│   ├── src/          app.ts, index.ts, db.ts, routes/, middleware/, schemas/, utils/, __tests__/
│   ├── uploads/      本機頭貼檔案（.gitkeep 之外皆 gitignore）
│   └── dist/         tsc 產物
└── frontend/         Vue 3 + TypeScript + Vite 5 + Pinia + Vue Router 4
    ├── src/          api/, components/, views/, stores/, router/, i18n/, composables/, types/
    ├── public/       favicon.svg
    └── dist/         vite build 產物
```

執行模型：**兩個獨立 Node 程序**。前端 dev server（5173）透過 Vite proxy 將 `/api`、`/uploads` 轉發至後端（3001）；正式環境預期同源部署或以 `VITE_API_BASE_URL` 指向後端網域。

---

## 1. Frontend 盤點

| 項目 | 現況 |
| --- | --- |
| Framework | Vue 3.5（Composition API，`<script setup>`） |
| 語言 | TypeScript（`strict: true`, `noUnusedLocals`, `noUnusedParameters`） |
| Build tool | Vite ^5.4.10 + `@vitejs/plugin-vue` ^5.1.4 |
| 狀態管理 | Pinia ^2.2.6 |
| 路由 | vue-router ^4.4.5 |
| 動畫 | `@vueuse/motion` ^2.2.6 |
| 測試 | Vitest ^2.1.4 + `@vue/test-utils` + jsdom |
| Lint / Format | ESLint 9 flat config + `eslint-plugin-vue` + Prettier |

### 1.1 Build command / output

| 指令 | 內容 |
| --- | --- |
| `npm run dev` | `vite`（port 5173） |
| **`npm run build`** | **`vue-tsc -b && vite build`** |
| `npm run typecheck` | `vue-tsc --noEmit` |
| `npm run lint` | `eslint . --ext .vue,.ts,.tsx` |
| `npm run test` | `vitest run` |
| `npm run preview` | `vite preview` |

**Build output directory：`frontend/dist/`**
`vite.config.ts` 未覆寫 `build.outDir`，使用 Vite 預設值。實際產物已確認存在：`frontend/dist/index.html`、`frontend/dist/assets/`、`frontend/dist/favicon.svg`。

`vite.config.ts` 也未設定 `base`，即 `base: '/'`。

### 1.2 API base URL 設定方式

兩處定義，邏輯一致：

- `frontend/src/api/client.ts:1` — `const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''`
- `frontend/src/api/adminClient.ts:3` — 同上

行為：
- **未設定 `VITE_API_BASE_URL` 時，`API_BASE = ''`，所有請求走相對路徑**（`/api/...`、`/uploads/...`），即「同源」模式。
- 開發時由 `vite.config.ts` 的 `server.proxy` 補上：`/api` 與 `/uploads` → `http://localhost:3001`（`changeOrigin: true`）。
- 正式環境若前後端分離，需建立 `frontend/.env.production` 設定 `VITE_API_BASE_URL=https://api.example.com`（README 已記載）。
- 目前 repo 中 **不存在** `frontend/.env`、`frontend/.env.production` 等檔案，也未被 build 使用，故現況為純相對路徑模式。

靜態資源解析：`client.ts:11` 的 `resolveAssetUrl()`
```ts
if (!path) return null
if (/^https?:\/\//.test(path)) return path   // 已是完整 URL 則原樣回傳
return `${API_BASE}${path}`                  // 否則前綴 API_BASE
```
使用點：`HeroSection.vue`（avatar）、`admin/AdminProfileForm.vue`（avatar 預覽）。

### 1.3 Vue Router 模式

**使用 history mode。** `frontend/src/router/index.ts:5`
```ts
history: createWebHistory(import.meta.env.BASE_URL)
```
非 hash mode，因此**部署時必須提供 SPA fallback**。

### 1.4 需要 SPA fallback 的路由

| Path | Name | Component | 備註 |
| --- | --- | --- | --- |
| `/` | `home` | `HomeView.vue`（lazy） | 一般會命中 `index.html`，無 fallback 也可 |
| `/admin/login` | `admin-login` | `AdminLoginView.vue`（lazy） | **需要 fallback** |
| `/admin` | `admin-dashboard` | `AdminDashboardView.vue`（lazy） | **需要 fallback**，`meta.requiresAuth: true` |

- 無 catch-all（`/:pathMatch(.*)*`）路由，未知路徑會由 router 解析失敗、顯示空白畫面。
- `router.beforeEach` 守衛：`meta.requiresAuth` 為真且 `useAdminAuthStore().isAuthenticated` 為假時，導向 `{ name: 'admin-login', query: { redirect: to.fullPath } }`。
- **fallback 必須排除 `/api/*` 與 `/uploads/*`**，否則 API 的 404 會被吞成 `index.html`。

### 1.5 前端 Auth 現況（觀察，非 blocker）

`frontend/src/stores/adminAuth.ts`：token 僅存於 Pinia in-memory state，**沒有 localStorage / sessionStorage / cookie 持久化**。重新整理頁面即登出。此行為與 Cloudflare 遷移無關，但列入記錄。

---

## 2. Backend 盤點

| 項目 | 現況 |
| --- | --- |
| Runtime | Node.js（`"type": "module"`，TS 編譯為 ESM，`module: NodeNext`） |
| Framework | Express ^4.21.1 |
| ORM | Prisma ^5.21.1 / `@prisma/client` ^5.21.1 |
| 驗證 | `jsonwebtoken` ^9.0.2 + `bcryptjs` ^2.4.3 |
| 輸入驗證 | zod ^3.23.8 |
| 上傳 | multer ^1.4.5-lts.1（diskStorage） |
| CORS | cors ^2.8.5 |
| Rate limit | `express-rate-limit` ^7.4.1（僅 login） |
| 設定 | dotenv ^16.4.5 |
| 測試 | Vitest ^4.1.11 + supertest ^7.0.0 |
| Lint | ESLint 9 flat config + typescript-eslint 8 |

### 2.1 Express app 建立位置

**`backend/src/app.ts:9`** — `const app = express()`；檔案最後 `export default app`。
`app.ts` 不啟動伺服器，僅組裝 middleware 與路由（這對遷移是**有利**的結構）。

### 2.2 `app.listen()` 所在位置

**`backend/src/index.ts:5`**
```ts
import app from './app.js'
const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => { console.log(`backend listening on http://localhost:${port}`) })
```
`index.ts` 是唯一的 Node server 進入點（`npm start` → `node dist/index.js`）。
測試（`__tests__/*.test.ts`）直接 `import app from '../app.js'` 給 supertest，**不經過 `index.ts`**。

### 2.3 所有 API route

掛載方式（`app.ts`）：
```
app.get ('/api/health', ...)
app.use ('/api',        publicRouter)
app.use ('/api/admin',  adminRouter)
app.use ('/uploads',    express.static(path.join(process.cwd(), 'uploads')))
```

#### Public（無需驗證）

| Method | Path | 來源 | 說明 |
| --- | --- | --- | --- |
| GET | `/api/health` | `app.ts:15` | 回 `{ status: 'ok' }` |
| GET | `/api/profile` | `routes/public.ts:7` | 取第一筆 Profile（`orderBy: { id: 'asc' }`）；無資料回 404。`contactLinks` 由 JSON 字串解析為陣列 |
| GET | `/api/skills` | `routes/public.ts:19` | SkillCategory + 巢狀 skills，皆依 `sortOrder` 排序 |
| GET | `/api/experience` | `routes/public.ts:27` | Experience 依 `sortOrder`；`highlightsZh/En` 解析為 `string[]` |
| GET | `/api/projects` | `routes/public.ts:38` | Project 依 `sortOrder`；`highlightsZh/En`、`techStack` 解析為 `string[]` |

#### Admin（`routes/admin.ts`）

| Method | Path | 驗證 | 其他 middleware | 說明 |
| --- | --- | --- | --- | --- |
| POST | `/api/admin/login` | — | `loginLimiter` | zod `loginSchema` → `prisma.adminUser.findUnique` → `bcrypt.compare` → 回 `{ token }` |
| PUT | `/api/admin/profile` | ✅ | — | 存在則 update，否則 create；`contactLinks` 以 `JSON.stringify` 存入 |
| POST | `/api/admin/avatar` | ✅ | `avatarUpload.single('avatar')` | **multipart**；寫檔後更新 `Profile.avatarUrl` |
| POST | `/api/admin/skill-categories` | ✅ | — | 201 |
| PUT | `/api/admin/skill-categories/:id` | ✅ | — | 失敗回 404 |
| DELETE | `/api/admin/skill-categories/:id` | ✅ | — | 204；cascade 刪除底下 Skill |
| POST | `/api/admin/skills` | ✅ | — | 201 |
| PUT | `/api/admin/skills/:id` | ✅ | — | |
| DELETE | `/api/admin/skills/:id` | ✅ | — | 204 |
| POST | `/api/admin/experience` | ✅ | — | 201；日期字串 → `new Date()`；highlights → JSON 字串 |
| PUT | `/api/admin/experience/:id` | ✅ | — | |
| DELETE | `/api/admin/experience/:id` | ✅ | — | 204 |
| POST | `/api/admin/projects` | ✅ | — | 201；highlights / techStack → JSON 字串 |
| PUT | `/api/admin/projects/:id` | ✅ | — | |
| DELETE | `/api/admin/projects/:id` | ✅ | — | 204 |

`adminRouter.use(requireAuth)` 位於 `/login` 之後（`admin.ts:62`），因此**除 login 外全部需要 Bearer token**。

#### 靜態

| Method | Path | 說明 |
| --- | --- | --- |
| GET | `/uploads/*` | `express.static(path.join(process.cwd(), 'uploads'))` |

### 2.4 Middleware 清單

| 順序 | Middleware | 位置 | 說明 |
| --- | --- | --- | --- |
| 1 | `cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' })` | `app.ts:11` | 單一來源；未設定 `credentials`、`methods`、`allowedHeaders`（採預設） |
| 2 | `express.json()` | `app.ts:12` | JSON body parser，未指定 `limit`（預設 100kb） |
| 3 | `express.static('uploads')` | `app.ts:13` | 掛在 `/uploads` |
| 4 | `publicRouter` / `adminRouter` | `app.ts:19-20` | |
| 5 | `requireAuth` | `middleware/requireAuth.ts` | router 層，只套用在 admin（login 之後） |
| 6 | `avatarUpload.single('avatar')` | `middleware/upload.ts` | 只套用在 `POST /api/admin/avatar` |
| 7 | `loginLimiter` | `routes/admin.ts:25` | `windowMs: 15min`, `limit: 10`, `standardHeaders: true`, `legacyHeaders: false` |
| 8 | 錯誤處理 middleware | `app.ts:22-38` | `MulterError` → 400；`Error` → 400（帶 `err.message`）；其他 → 500 |

**沒有** `express.urlencoded()`、cookie-parser、helmet、compression、morgan/logger。

### 2.5 JWT 驗證方式

`backend/src/utils/jwt.ts`

```ts
interface AdminTokenPayload { sub: number; email: string }
getSecret()  → process.env.JWT_SECRET，未設定時 throw new Error('JWT_SECRET is not set')
signAdminToken(payload)   → jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN ?? '12h' })
verifyAdminToken(token)   → jwt.verify(token, secret) as AdminTokenPayload
```

- **演算法未顯式指定 → `jsonwebtoken` 預設 HS256（對稱）。**
- 無 `issuer` / `audience` / `algorithms` 白名單設定。
- `middleware/requireAuth.ts`：讀 `Authorization` header，必須以 `Bearer ` 開頭，否則 401「未授權，請先登入。」；`verify` 失敗回 401「Token 無效或已過期，請重新登入。」;成功則把 payload 掛到 `req.admin`（透過 `declare module 'express-serve-static-core'` 擴充 `Request`）。
- Token 傳遞：前端 `adminClient.ts` 以 `headers.set('Authorization', \`Bearer ${token}\`)`。無 cookie、無 refresh token。

密碼驗證：`bcryptjs.compare(password, admin.passwordHash)`；hash 由 `scripts/hash-password.cjs`（`bcrypt.hashSync(password, 10)`，cost = 10）離線產生並寫入 `.env` 的 `ADMIN_PASSWORD_HASH`，seed 時 upsert 進 `AdminUser`。

### 2.6 CORS 設定

`app.ts:11` 單行：
```ts
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173' }))
```
- 單一 origin（非陣列、非函式、非 `*`）。
- 未開啟 `credentials`（前端也未使用 cookie，故一致）。
- preflight 由 `cors` 套件自動處理（預設 `OPTIONS` 回 204）。

### 2.7 Body parser

- `express.json()`（`app.ts:12`）— 唯一的 body parser，預設 limit 100kb。
- multipart 由 multer 在該路由自行處理（multer 會跳過 `express.json`，因為 content-type 不同）。
- **無** `express.urlencoded()`。

### 2.8 Multipart upload

`backend/src/middleware/upload.ts`

```ts
ALLOWED_MIME_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
uploadsDir = path.join(process.cwd(), 'uploads')

multer.diskStorage({
  destination: cb(null, uploadsDir),
  filename:    cb(null, `avatar-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
})

avatarUpload = multer({
  storage,
  limits: { fileSize: Number(process.env.UPLOAD_MAX_SIZE_MB ?? 5) * 1024 * 1024 },
  fileFilter: 不在 allowlist → cb(new Error('僅允許上傳 jpg、png 或 webp 格式的圖片。'))
})
```

僅用於 `POST /api/admin/avatar`，欄位名 `avatar`，單檔。

### 2.9 Static uploads serving

`app.ts:13` — `app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))`
路徑相對於**程序啟動時的工作目錄**（一般為 `backend/`），即 `backend/uploads/`。

### 2.10 Node.js 專用 API 使用盤點

| API | 檔案 | 行 | 用途 | Runtime or Build-time |
| --- | --- | --- | --- | --- |
| `node:path` | `src/app.ts` | 1, 13 | `path.join(process.cwd(), 'uploads')` | **Runtime** |
| `node:path` | `src/middleware/upload.ts` | 1, 11, 20 | `path.join`、`path.extname` | **Runtime** |
| `node:crypto` | `src/middleware/upload.ts` | 2, 21 | `crypto.randomBytes(6).toString('hex')` | **Runtime** |
| `process.cwd()` | `src/app.ts`, `src/middleware/upload.ts` | 13 / 11 | uploads 目錄定位 | **Runtime** |
| `process.env` | `src/app.ts:11`, `src/index.ts:3`, `src/middleware/upload.ts:23`, `src/utils/jwt.ts:9,17`, `prisma/seed.ts:254-255` | — | 讀環境變數 | **Runtime** |
| `process.exitCode` | `prisma/seed.ts` | 尾段 | seed 失敗碼 | Build-time / script |
| `node:fs` (`existsSync`) | `scripts/ensure-prisma-client.cjs` | 1, 15 | 檢查 Prisma query engine DLL | **Build-time only** |
| `node:child_process` (`execSync`) | `scripts/ensure-prisma-client.cjs` | 2, 18 | `execSync('prisma generate')` | **Build-time only** |
| `node:path` (`join`) | `scripts/ensure-prisma-client.cjs` | 3, 5 | DLL 路徑 | **Build-time only** |
| `Buffer` | `src/__tests__/adminCrud.test.ts` | 190, 197, 207 | supertest `.attach()` 測試檔案 | **Test only** |
| local filesystem 寫入 | multer diskStorage（見 2.8） | — | 寫 `backend/uploads/` | **Runtime** |
| local filesystem 讀取 | `express.static`（見 2.9） | — | 讀 `backend/uploads/` | **Runtime** |

**未使用**：`node:stream`（無直接引用）、`node:fs` 於 runtime、`node:os`、`node:worker_threads`、`node:net`、`node:http`（僅由 Express 內部使用）。
`Buffer` 在 runtime source 中**沒有**直接使用（僅測試檔）。

### 2.11 可能不相容 Cloudflare Workers 的依賴

| 依賴 | 版本 | 相容性 | 原因 |
| --- | --- | --- | --- |
| `express` | ^4.21.1 | ❌ 不相容 | 依賴 `node:http` Server/`req`/`res` 物件模型與 `app.listen()`；Workers 為 `fetch(request, env, ctx)` 模型 |
| `multer` | ^1.4.5-lts.1 | ❌ 不相容 | busboy stream + `fs` diskStorage；Workers 無本機檔案系統 |
| `cors` | ^2.8.5 | ❌ 不相容 | Express middleware 簽章（`req, res, next`） |
| `express-rate-limit` | ^7.4.1 | ❌ 不相容 | Express middleware；且預設 MemoryStore 在 Workers isolate 間不共用、隨時被回收 |
| `dotenv` | ^16.4.5 | ❌ 不需要 | Workers 以 `wrangler.toml` vars / secrets 注入 `env`，無 `.env` 檔案讀取 |
| `@prisma/client` (sqlite) | ^5.21.1 | ⚠️ 需改造 | 預設走 binary query engine（`query_engine-windows.dll.node`）；Workers 需 `driverAdapters` preview + `@prisma/adapter-d1`。Prisma 5.21 支援度有限，建議升版 |
| `prisma` (CLI) | ^5.21.1 | ⚠️ 僅 build-time | 本身不進 Workers bundle，但 `db push` 流程需改為 D1 migrations |
| `jsonwebtoken` | ^9.0.2 | ⚠️ 風險 | 依賴 `node:crypto` 的 `createHmac`/KeyObject；即使開 `nodejs_compat` 也常有邊緣問題。建議改 `jose` |
| `bcryptjs` | ^2.4.3 | ⚠️ 可跑但昂貴 | 純 JS 可在 Workers 執行，但 cost=10 的 bcrypt 屬 CPU 密集，易觸及 Workers CPU time 限制 |
| `zod` | ^3.23.8 | ✅ 相容 | 純 JS，無 Node API |
| `@types/*`, `eslint`, `vitest`, `supertest`, `tsx`, `typescript` | — | ✅ | devDependencies，不進 runtime bundle |

---

## 3. Prisma 盤點

### 3.1 版本與 provider

| 項目 | 值 |
| --- | --- |
| `prisma` (CLI, devDep) | `^5.21.1` |
| `@prisma/client` (dep) | `^5.21.1` |
| generator | `prisma-client-js`（無 `previewFeatures`、無 `output` 覆寫） |
| **datasource provider** | **`sqlite`** |
| datasource url | `env("DATABASE_URL")`，實際值為 SQLite 檔案路徑 |
| Client 實例 | `backend/src/db.ts` — `export const prisma = new PrismaClient()`（module 層單例，無 log/datasource 選項） |

### 3.2 Schema models

`backend/prisma/schema.prisma` 共 6 個 model：

| Model | 欄位 | 備註 |
| --- | --- | --- |
| `Profile` | `id Int @id @default(autoincrement())`, `displayName`, `preferredName`, `titleZh`, `titleEn`, `introZh`, `introEn`, `avatarUrl String?`, `contactEmail String?`, `contactLinks String?`, `updatedAt DateTime @updatedAt` | `contactLinks` 以 **JSON 字串**存（註解明言 SQLite 不支援 Json 型別） |
| `SkillCategory` | `id`, `nameZh`, `nameEn`, `sortOrder Int @default(0)`, `skills Skill[]` | |
| `Skill` | `id`, `nameZh`, `nameEn`, `sortOrder Int @default(0)`, `category SkillCategory @relation(..., onDelete: Cascade)`, `categoryId Int` | **唯一的 FK 關聯** |
| `Experience` | `id`, `companyZh/En`, `roleZh/En`, `locationZh/En String?`, `startDate DateTime`, `endDate DateTime?`, `summaryZh/En`, `highlightsZh String`, `highlightsEn String`, `sortOrder Int @default(0)` | highlights 為 JSON 字串 |
| `Project` | `id`, `nameZh/En`, `summaryZh/En`, `highlightsZh String`, `highlightsEn String`, `techStack String?`, `link String?`, `imageUrl String?`, `sortOrder Int @default(0)` | highlights / techStack 為 JSON 字串 |
| `AdminUser` | `id`, `email String @unique`, `passwordHash String`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` | 唯一索引在 `email` |

- 沒有 `@@index`、`@@unique`（複合）、`@map`/`@@map`、`enum`、`Json` 型別、`Bytes` 型別、`Decimal`。
- 沒有 `relationMode` 設定（SQLite 預設 `foreignKeys`）。

### 3.3 Migrations

**不存在 `backend/prisma/migrations/` 目錄。**（已確認 `prisma/` 底下僅有 `dev.db`、`schema.prisma`、`seed.ts`）

schema 同步方式為 `prisma db push`：
```json
"db:setup":        "npm run prisma:generate && npm run prisma:push && npm run prisma:seed"
"prisma:push":     "prisma db push --skip-generate --accept-data-loss"
"prisma:migrate":  "prisma migrate dev"     // 定義了但目前未被 db:setup 使用
```
`predev` 與 `pretest` 皆會自動執行 `db:setup`，即**每次 `npm run dev` / `npm test` 都會 push schema 並重跑 seed**。

> ⚠️ 這是 D1 遷移的主要結構性 blocker：D1 以 `wrangler d1 migrations apply` 套用 SQL 檔，需要一份 migration 歷史，而目前完全沒有。

### 3.4 Seed

`backend/prisma/seed.ts`（11,243 bytes），由 `tsx prisma/seed.ts` 執行，`package.json` 亦有 `"prisma": { "seed": "tsx prisma/seed.ts" }`。

流程：
1. `import 'dotenv/config'`，`new PrismaClient()`
2. 逐一 `deleteMany()`：`profile` → `skill` → `skillCategory` → `experience` → `project`（**破壞性**，每次重跑清空）
3. `prisma.profile.create(...)` 寫入中英文個人簡介
4. 建立技能分類與技能、工作經歷、DineFlow 專案（highlights / techStack 以 `JSON.stringify` 寫入）
5. 讀 `process.env.ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`；兩者皆有才 `prisma.adminUser.upsert()`，否則 `console.warn` 略過
6. `finally { await prisma.$disconnect() }`

注意：`AdminUser` **不在** deleteMany 清單，以 upsert 保留。

### 3.5 SQLite 特有 SQL / behavior

| 項目 | 現況 | D1 影響 |
| --- | --- | --- |
| Json 欄位 | **不使用**，一律以 `String` 存 JSON 字串（`contactLinks`、`highlightsZh/En`、`techStack`） | ✅ 對 D1 友善，無須改動 |
| `DateTime` | SQLite 以數值（ms epoch）儲存，由 Prisma 轉換 | ✅ D1 同為 SQLite，語意一致 |
| `@default(autoincrement())` | SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` | ✅ D1 支援 |
| `@default(now())` / `@updatedAt` | 由 Prisma Client 在應用層產生 | ✅ 與資料庫無關 |
| `onDelete: Cascade` | SQLite FK；需 `PRAGMA foreign_keys = ON` 才生效 | ⚠️ D1 的 FK enforcement 需在 migration SQL 中明確處理；Prisma 對 SQLite 預設走 DB 層 FK |
| 大小寫 / collation | 未使用 `mode: 'insensitive'`（SQLite 不支援） | ✅ 無影響 |
| 全文檢索 / FTS5 | 未使用 | ✅ |
| `String @unique` | `AdminUser.email` | ✅ D1 支援 |

### 3.6 Transaction 使用方式

**完全未使用。** 全專案 grep 無 `$transaction`（無論 array batch 或 interactive callback 形式）。

- `PUT /api/admin/profile` 的「先 `findFirst` 再 update/create」是兩段獨立查詢，無交易包覆。
- `POST /api/admin/avatar` 的「先 `findFirst` 再 update」同上。
- seed.ts 的多筆 `deleteMany` / `create` 亦為序列獨立執行。

> ✅ 這是好消息：**D1 不支援 Prisma interactive transaction**，而本專案沒有任何依賴。

### 3.7 Raw SQL 使用方式

**完全未使用。** 無 `$queryRaw`、`$queryRawUnsafe`、`$executeRaw`、`$executeRawUnsafe`。

### 3.8 是否存在 D1 不相容功能

| 功能 | 使用中？ | D1 相容 |
| --- | --- | --- |
| Interactive transaction (`$transaction(async tx => ...)`) | ❌ 未使用 | D1 不支援 → 無影響 |
| Raw SQL | ❌ 未使用 | — |
| `Json` scalar type | ❌ 未使用 | — |
| `Bytes` / `Decimal` | ❌ 未使用 | — |
| `enum` | ❌ 未使用 | SQLite/D1 本就不支援 |
| Nested writes / `include` | ✅ `/api/skills` 使用 `include: { skills: ... }` | ✅ D1 適配器支援（會轉為多次查詢） |
| Prisma binary query engine | ✅ 目前使用中 | ❌ **必須改為 `driverAdapters` + `@prisma/adapter-d1`** |
| `prisma db push` 同步 | ✅ 目前使用中 | ❌ **必須改為 D1 migrations** |
| `PrismaClient` 全域單例（module 層） | ✅ `src/db.ts` | ⚠️ Workers 需**每個 request 以 `env.DB` 建立**（binding 只在 fetch handler 內可得） |

**結論：schema 本身對 D1 高度相容；不相容的是「連線方式」與「migration 流程」，不是資料模型。**

---

## 4. Uploads 盤點

### 4.1 寫入本機 uploads 的程式

| 位置 | 程式 | 說明 |
| --- | --- | --- |
| `backend/src/middleware/upload.ts:14-24` | `multer.diskStorage({ destination, filename })` | **唯一寫入點**。目標目錄 `path.join(process.cwd(), 'uploads')` |
| 觸發路由 | `backend/src/routes/admin.ts:93` — `adminRouter.post('/avatar', avatarUpload.single('avatar'), ...)` | 唯一觸發上傳的 API |

檔名規則：`avatar-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`
副檔名來源：`ALLOWED_MIME_TYPES[file.mimetype]`，找不到才 fallback 到 `path.extname(file.originalname)`。

### 4.2 讀取 uploads 的程式

| 位置 | 程式 | 說明 |
| --- | --- | --- |
| `backend/src/app.ts:13` | `express.static(path.join(process.cwd(), 'uploads'))` 掛於 `/uploads` | **唯一的伺服端讀取點** |
| `frontend/src/api/client.ts:11` | `resolveAssetUrl(path)` | 前端把 DB 中的相對路徑組成可請求的 URL |
| `frontend/src/components/HeroSection.vue:17` | `const avatarSrc = computed(() => resolveAssetUrl(props.profile?.avatarUrl))` | 首頁頭貼 |
| `frontend/src/components/admin/AdminProfileForm.vue:113-114` | `resolveAssetUrl(props.profile?.avatarUrl)` | 後台頭貼預覽 |
| `frontend/vite.config.ts` | dev proxy `/uploads` → `http://localhost:3001` | 僅開發模式 |

沒有任何伺服端程式以 `fs.readFile` 讀取上傳檔案。

### 4.3 刪除 uploads 的程式

**不存在。**
全專案無 `fs.unlink`、`fs.rm`、`fs.promises.unlink` 或任何檔案刪除呼叫。

實際行為：每次上傳新頭貼只會**新增**檔案並覆寫 `Profile.avatarUrl` 欄位；**舊檔案永久殘留在 `backend/uploads/`**，成為孤兒檔（orphan）。同理，`Project.imageUrl` 也沒有任何清理機制。

### 4.4 DB 目前儲存的值格式

| 欄位 | 型別 | 儲存內容 | 產生位置 |
| --- | --- | --- | --- |
| `Profile.avatarUrl` | `String?` | **相對路徑，含前導斜線**：`/uploads/avatar-<timestamp>-<hex>.<ext>` | `routes/admin.ts:98` — `` const avatarUrl = `/uploads/${req.file.filename}` `` |
| `Project.imageUrl` | `String?` | **自由字串**，由管理者在後台手動輸入（`projectBaseSchema` 僅 `z.string().nullable().optional()`，**未做 URL 驗證**）；可能是相對路徑或完整 URL | `schemas/admin.ts` projectBaseSchema |

即：**儲存的是 relative path（`/uploads/...`），不是 filename，也不是完整 URL。**
前端 `resolveAssetUrl()` 的 `^https?://` 判斷正是為了同時容納 `Project.imageUrl` 可能填入完整 URL 的情況。

> 這對遷移是**有利**的：只要 Workers 繼續在 `/uploads/<filename>` 提供 R2 物件，DB 內既有的值完全不需要改動，API contract 也不變。

### 4.5 圖片大小限制

```ts
const maxSizeMb = Number(process.env.UPLOAD_MAX_SIZE_MB ?? 5)
limits: { fileSize: maxSizeMb * 1024 * 1024 }
```
- 預設 **5 MB**，由 `UPLOAD_MAX_SIZE_MB` 覆寫。
- 超過時 multer 丟 `MulterError`，被 `app.ts` 的錯誤處理器轉為 **HTTP 400**，body 為 `{ error: '檔案上傳失敗：File too large' }`。
- 注意：`express.json()` 的 100kb 預設 limit 不影響此路由（content-type 為 multipart）。

### 4.6 MIME type 驗證

```ts
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
}
fileFilter: (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(new Error('僅允許上傳 jpg、png 或 webp 格式的圖片。'))
    return
  }
  cb(null, true)
}
```
- **僅檢查 client 宣告的 `Content-Type`，沒有 magic bytes / 檔案內容驗證。**
- 現有測試 `adminCrud.test.ts:203` 即以 `Buffer.from([0xff, 0xd8, 0xff, 0xd9])`（4 bytes 假 JPEG）配上 `contentType: 'image/jpeg'` 通過驗證，佐證此點。
- 拒絕時丟一般 `Error`（非 `MulterError`），被錯誤處理器轉為 **HTTP 400**，body 為 `{ error: '僅允許上傳 jpg、png 或 webp 格式的圖片。' }`。

### 4.7 舊圖片刪除流程

**不存在任何刪除流程。** 詳見 4.3。
遷移到 R2 時若照搬此行為，孤兒物件會持續累積並產生儲存費用。

---

## 5. 環境變數盤點

> 以下僅列出**變數名稱與用途**，不含任何真實值。
> `backend/.env` 已存在於工作目錄且被 `.gitignore` 排除（`.gitignore` 規則：`.env` + `!.env.example`）。

### 5.1 Backend（`backend/.env`，範本為 `backend/.env.example`）

實際 `backend/.env` 中存在的 key（已確認與範本一致，共 8 個）：

| 變數 | 用途 | 讀取位置 | 預設 fallback | 敏感 |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Prisma datasource 連線字串（現為 SQLite 檔案） | `schema.prisma` `env("DATABASE_URL")` | 無（Prisma 必填） | ⚠️ 正式環境敏感 |
| `PORT` | Express 監聽埠 | `src/index.ts:3` | `3001` | — |
| `FRONTEND_ORIGIN` | CORS 允許來源 | `src/app.ts:11` | `http://localhost:5173` | — |
| `ADMIN_EMAIL` | 唯一管理者帳號 email | `prisma/seed.ts:254` | 無（未設定則略過建帳號） | ⚠️ |
| **`ADMIN_PASSWORD_HASH`** | 管理者密碼的 **bcrypt hash**（cost 10），**不得為明碼** | `prisma/seed.ts:255` | 無 | 🔴 **Secret** |
| **`JWT_SECRET`** | HS256 對稱簽章密鑰 | `src/utils/jwt.ts:9` | **無 — 未設定會 throw `'JWT_SECRET is not set'`** | 🔴 **Secret** |
| `JWT_EXPIRES_IN` | Token 有效期 | `src/utils/jwt.ts:17` | `12h` | — |
| `UPLOAD_MAX_SIZE_MB` | 頭貼大小上限（MB） | `src/middleware/upload.ts:23` | `5` | — |

載入方式：`import 'dotenv/config'`（`src/app.ts:2`、`prisma/seed.ts:1`）。

### 5.2 Frontend

| 變數 | 用途 | 讀取位置 | 預設 | 檔案是否存在 |
| --- | --- | --- | --- | --- |
| `VITE_API_BASE_URL` | API / 靜態資源網域前綴 | `src/api/client.ts:1`、`src/api/adminClient.ts:3` | `''`（相對路徑） | ❌ 目前 repo 中**無** `frontend/.env*` 任何檔案 |

`src/env.d.ts` 僅有 `/// <reference types="vite/client" />`，**未宣告自訂 `ImportMetaEnv` 介面**（因此 `VITE_API_BASE_URL` 的型別是 `any`，不受 TS 檢查）。

### 5.3 JWT secret

- 名稱：`JWT_SECRET`（必填，無 fallback）。
- 演算法：HS256（`jsonwebtoken` 預設，程式未顯式指定）→ **單一對稱密鑰，簽發與驗證共用**。
- 有效期：`JWT_EXPIRES_IN`，預設 `12h`。
- 目前為**單一長期 secret，無輪替機制、無 kid、無 refresh token**。
- 遷移時應以 `wrangler secret put JWT_SECRET` 注入，而非寫入 `wrangler.toml` 的 `[vars]`。

### 5.4 Admin credentials

- `ADMIN_EMAIL`：明文 email，seed 時作為 `AdminUser.email`（`@unique`）的 upsert key。
- `ADMIN_PASSWORD_HASH`：bcryptjs cost=10 的 hash，由 `npm run hash-password -- "<密碼>"` 離線產生。
- **憑證的真實來源是 `AdminUser` 資料表**；`.env` 只在 seed 時寫入 / 更新。因此正式環境登入驗證不讀 `.env`，只讀 DB。
- 僅支援**單一管理者**，無註冊、無密碼重設、無多帳號。

### 5.5 DATABASE_URL

- 現值形式：SQLite 檔案 URL（`file:./dev.db`，相對於 `prisma/` 目錄）。
- `.env.example` 註解已預留 MySQL / PostgreSQL 切換說明。
- **D1 不使用 `DATABASE_URL`**：改以 `wrangler.toml` 的 `[[d1_databases]]` binding（`env.DB`）在 runtime 取得。遷移後此變數在 Workers runtime 不再需要，但 Prisma CLI（generate / migrate diff）本機仍可能需要它。

### 5.6 Production secrets 現況

| 項目 | 現況 |
| --- | --- |
| Secret 儲存方式 | 純 `.env` 檔案（`backend/.env`），未使用任何 secret manager |
| 是否進版控 | 否（`.gitignore` 已排除 `.env`，保留 `.env.example`） |
| 範本是否含假值 | 是（`.env.example` 中 `ADMIN_PASSWORD_HASH` 為 `$2a$10$replace-with-a-real-bcrypt-hash`、`JWT_SECRET` 為 `replace-with-a-random-secret`，皆為佔位字串） |
| 輪替機制 | 無 |
| 需搬到 Cloudflare Secret 的項目 | `JWT_SECRET`、`ADMIN_PASSWORD_HASH`（若仍用 seed 流程）；`ADMIN_EMAIL` 可視為一般 var |

---

## 6. 現有品質閘門（遷移驗收基準線）

| 專案 | 指令 | 說明 |
| --- | --- | --- |
| frontend | `npm run build` | `vue-tsc -b && vite build` → `frontend/dist/` |
| frontend | `npm run typecheck` | `vue-tsc --noEmit` |
| frontend | `npm run lint` | ESLint 9 flat config |
| frontend | `npm run test` | Vitest + jsdom。現有測試：`router/__tests__/index.test.ts`、`stores/__tests__/{adminAuth,locale}.test.ts`、`views/__tests__/{AdminDashboardView,AdminLoginView,HomeView}.test.ts` |
| backend | `npm run build` | `tsc -p tsconfig.json` → `backend/dist/` |
| backend | `npm run typecheck` | `tsc --noEmit` |
| backend | `npm run lint` | `eslint . --ext .ts`（忽略 `dist/`、`scripts/`、`prisma/generated/`） |
| backend | `npm run test` | `vitest run --passWithNoTests`，`pretest` 會先跑 `db:setup`（**會清空並重建 dev.db**）。`fileParallelism: false`（因共用單一 SQLite 檔）。現有測試：`adminAuth.test.ts`、`adminCrud.test.ts`、`publicApi.test.ts`、`seed.smoke.test.ts` |

### 6.1 基準線實測結果（2026-09-18 19:23，由專案擁有者在本機執行）

`cd backend && npm test`：

```
Test Files  2 failed | 6 passed (8)
     Tests  2 failed | 36 passed (38)
```

**兩項失敗皆為既有問題，與本次盤點無關（本次僅新增兩個 .md 檔）。**

#### 失敗 1／2：`seed.smoke.test` 的 `adminCount` 斷言

```
AssertionError: expected 2 to be 1
  expect(adminCount).toBe(1)
```

實際查詢 `prisma/dev.db` 的 `AdminUser` 表（email 已遮罩）：

| id | email | createdAt |
| --- | --- | --- |
| 1 | `ad***@example.com`（`.env.example` 的預設值 `admin@example.com`） | 2026-09-18 17:17:24 |
| 25 | `bi******@gmail.com`（專案擁有者實際帳號） | 2026-09-18 18:11:02 |

其餘計數全部正確：Profile 1、SkillCategory 13、Skill 43、Experience 1、Project 1。

**根因：`prisma/seed.ts` 的 `deleteMany()` 清單刻意不含 `adminUser`**，而管理者是以 `email` 為 key 做 `upsert`。因此當 `.env` 的 `ADMIN_EMAIL` 被改成新值時，seed 會**新增**一筆，舊的那筆原地保留 → `AdminUser` 累積。
（時間佐證：`backend/.env` mtime 為 18:11:37，與 id=25 的建立時間相隔 35 秒。）

**這不是測試隔離問題。** `adminAuth.test.ts` 與 `adminCrud.test.ts` 各自使用不同的測試帳號 email（`test-admin@example.com` / `test-admin-crud@example.com`），且皆在 `afterAll` 中 `delete` 清理，兩者行為正確。

> 🔴 **順帶發現的安全性問題**：`POST /api/admin/login` 只查 `AdminUser` 表比對該列的 `passwordHash`，**完全不讀 `.env`**。因此**修改 `.env` 的 `ADMIN_EMAIL` 並不會停用舊的管理者帳號** —— 舊帳號連同其當時的密碼 hash 仍然可以正常登入。正式環境若沿用此 seed 流程，每更換一次管理者帳號就會多留下一個仍然有效的登入入口。詳見 §7 第 9 項。

修復方式（屬資料面清理，不涉及程式碼變更）：刪除 `AdminUser` 中不再使用的那一列即可。

#### 失敗 2／2：同一個測試的 `dist/` 版本

`dist/__tests__/seed.smoke.test.js` 是上述測試的編譯產物，失敗原因完全相同。

#### 附帶問題：`dist/` 測試被重複執行

執行結果為 **8 個測試檔／38 個測試**，但 `src/__tests__/` 僅有 4 個檔（19 個測試）：

```
✓ dist/__tests__/adminCrud.test.js   ← 編譯產物
✓ src/__tests__/adminCrud.test.ts    ← 原始碼
（adminAuth、publicApi、seed.smoke 同樣成對出現）
```

`vitest.config.ts` 只設定了 `fileParallelism: false`，**未設定 `include` / `exclude`**；backend 使用 Vitest `^4.1.11`（frontend 為 `^2.1.4`），Vitest 4 的預設 `exclude` 不再涵蓋 `**/dist/**`，導致**過期的編譯產物也被當成測試執行**。

目前 `dist/` 與 `src/` 內容一致故未暴雷，但只要修改 `src` 而未重新 `npm run build`，就會出現「同一個測試一過一敗」的誤導性結果。建議（非本 Phase 必要）：

```ts
// backend/vitest.config.ts
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
  },
})
```

### 6.2 測試結構觀察

測試以 supertest 直接打 `app`（不經 `app.listen`），對遷移有利：改寫為 Workers handler 後，這批測試可用 `unstable_dev` / Miniflare 以相同的請求層級語意重跑。

---

## 7. 現況風險與觀察（非遷移 blocker，供後續 Phase 參考）

1. **`Project.imageUrl` 無 URL 驗證** — zod schema 只驗 `string`，`link` 有 `.url()` 但 `imageUrl` 沒有。
2. **上傳檔案僅驗 client 宣告 MIME**，無 magic bytes 檢查。
3. **舊頭貼永不刪除**，`backend/uploads/` 會無限增長。
4. **`predev` / `pretest` 每次都跑破壞性 seed**（`deleteMany` 全表），對開發資料不友善，正式環境絕不可沿用。
5. **前端 token 只存記憶體**，重新整理即登出。
6. **`express.json()` 未設 limit**（預設 100kb），對 `PUT /api/admin/profile` 的長篇 `introZh/En` 可能是隱性上限。
7. **錯誤處理器把所有 `Error` 都轉成 400**，包含 Prisma 內部錯誤，可能洩漏訊息且語意不精確。
8. **無 migrations 歷史**，schema 變更無法追溯、無法在正式環境安全套用。
9. 🔴 **`seed.ts` 從不清理 `AdminUser`，且登入不讀 `.env`** — 更換 `ADMIN_EMAIL` 會**累積**管理者帳號而非取代，舊帳號持續可登入。目前 `dev.db` 已有 2 筆（見 §6.1）。正式環境屬安全性缺陷。
10. **Vitest 會連 `dist/` 的編譯產物一起跑** — 測試數量加倍，且原始碼與過期產物可能給出矛盾結果（見 §6.1）。
