# CLOUDFLARE_MIGRATION_PLAN.md

> Lucky-idv（`idv-web`）→ Cloudflare Workers / D1 / R2 / Static Assets 遷移規劃
> 撰寫日期：2026-09-18
> 對應現況盤點：[`CURRENT_ARCHITECTURE.md`](./CURRENT_ARCHITECTURE.md)

## 本文件的約束

此 Phase **只做規劃**。本文件本身不執行、也不授權執行以下任何動作：

- ❌ 不修改 API contract（路徑、method、request/response shape、status code 全部凍結）
- ❌ 不修改資料庫 schema
- ❌ 不刪除 SQLite
- ❌ 不建立 D1
- ❌ 不建立 R2
- ❌ 不 deploy
- ❌ 不修改 DNS

下文所有 `wrangler.toml` / 程式片段皆為**規劃用草案**，供後續 Phase 參考，**目前不寫入 repo**。

---

## 1. 目標架構

### 1.1 現況 vs 目標

| 層 | 現況 | 目標 |
| --- | --- | --- |
| 前端靜態檔 | `frontend/dist/` 由任意靜態伺服器或 Vite preview 提供 | **Cloudflare Static Assets**（Workers 的 `assets` 綁定） |
| HTTP 伺服器 | Express 4 on Node（`app.listen(3001)`） | **Cloudflare Workers**（`fetch(request, env, ctx)`） |
| 資料庫 | SQLite 檔案（`prisma/dev.db`）+ Prisma binary engine | **Cloudflare D1** + Prisma driver adapter（或 Drizzle/Kysely，見 §5） |
| 檔案儲存 | 本機 `backend/uploads/` + `express.static` | **Cloudflare R2**，由 Worker 在 `/uploads/*` 代為讀取 |
| 環境變數 | `backend/.env` + dotenv | `wrangler.toml [vars]` + `wrangler secret`（runtime 從 `env` 取得） |
| 部署單位 | 前後端兩個程序 | **單一 Worker**（同源，前端與 API 同網域） |

### 1.2 目標請求路由

```
                    ┌─────────────────────────────────────────┐
  Request  ───────► │  Cloudflare Worker (單一 entry)          │
                    │                                         │
  /api/*      ─────►│  Hono router ──► D1 (env.DB)            │
  /uploads/*  ─────►│  R2 get       ──► R2 (env.BUCKET)       │
  其他         ─────►│  Static Assets ──► frontend/dist/       │
                    │      └── SPA fallback → index.html      │
                    └─────────────────────────────────────────┘
```

**關鍵組態**（草案）：

```toml
# wrangler.toml — 草案，本 Phase 不建立
name = "idv-web"
main = "backend/src/worker.ts"
compatibility_date = "2026-09-01"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = "frontend/dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
run_worker_first = ["/api/*", "/uploads/*"]   # ⚠️ 見下方說明

[[d1_databases]]
binding = "DB"
database_name = "idv-web"
database_id = "<待建立>"

[[r2_buckets]]
binding = "UPLOADS"
bucket_name = "idv-web-uploads"

[vars]
FRONTEND_ORIGIN = "https://<待定>"
JWT_EXPIRES_IN = "12h"
UPLOAD_MAX_SIZE_MB = "5"
# JWT_SECRET 以 `wrangler secret put JWT_SECRET` 注入，不寫在此
```

> ⚠️ **`run_worker_first` 是必要的。** `not_found_handling = "single-page-application"` 會讓任何未命中靜態檔的路徑回傳 `index.html`。若不將 `/api/*` 與 `/uploads/*` 排除，API 的 404 與 401 會被 SPA fallback 吞掉，回傳 200 + HTML，前端 `res.json()` 解析失敗。這會**實質破壞 API contract**，是遷移中最容易踩到的陷阱。

### 1.3 SPA fallback 覆蓋確認

依 `CURRENT_ARCHITECTURE.md` §1.4，需要 fallback 的路由為 `/`、`/admin/login`、`/admin`。
`not_found_handling = "single-page-application"` 可一次覆蓋三者，無須逐條設定。
router 使用 `createWebHistory` 且 `base` 為 `/`，與 Static Assets 的根部署一致，前端**無須任何修改**。

---

## 2. 遷移 blocker 清單

### 2.1 🔴 必須修改（Must change — 不改就無法在 Workers 上運行）

| # | 項目 | 現況位置 | 問題 | 建議做法 |
| --- | --- | --- | --- | --- |
| M1 | **Express app + `app.listen()`** | `src/app.ts:9`、`src/index.ts:5` | Workers 無 `node:http` Server、無 listen 模型 | 改 **Hono**（API 與 Express 最接近，遷移成本最低）。保留 `app.ts` 的「只組裝、不啟動」結構，新增 `src/worker.ts` 作為 `export default { fetch }` |
| M2 | **multer / diskStorage** | `src/middleware/upload.ts` | 依賴 busboy stream + `fs`；Workers 無檔案系統 | 改用 Workers 原生 `await request.formData()` 取 `File`，再 `env.UPLOADS.put(key, file.stream())` |
| M3 | **`express.static('/uploads')`** | `src/app.ts:13` | 無本機檔案系統 | Worker 攔 `/uploads/:key` → `env.UPLOADS.get(key)` → 回 `Response`，帶上 `Content-Type` 與 `Cache-Control` |
| M4 | **`process.cwd()` + `node:path` 路徑組合** | `src/app.ts:13`、`src/middleware/upload.ts:11,20` | Workers 無工作目錄概念 | 隨 M2 / M3 一併移除。副檔名判斷改為純字串處理（不需 `path.extname`） |
| M5 | **Prisma binary query engine（sqlite provider）** | `prisma/schema.prisma`、`src/db.ts` | Workers 無法載入 `.node` 原生引擎 | 開啟 `previewFeatures = ["driverAdapters"]` + `@prisma/adapter-d1`，並**升級 Prisma 至支援 D1 adapter 的穩定版本**（現為 5.21.1，建議評估升版）。`provider` 由 `sqlite` 改為 `sqlite`（D1 adapter 沿用 sqlite provider）——**此變更屬未來 Phase，本 Phase 不動 schema** |
| M6 | **`PrismaClient` module 層單例** | `src/db.ts:3` | D1 binding 只存在於 `fetch(request, env, ctx)` 的 `env`，module 載入時取不到 | 改為 `createDb(env.DB)` 工廠函式，於每次 request 建立（或以 `env` 為 key 快取） |
| M7 | **無 migrations 歷史** | `prisma/` 無 `migrations/` 目錄 | D1 以 `wrangler d1 migrations apply` 套 SQL 檔，無法 `prisma db push` | 以 `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` 產出 baseline SQL，納入 `migrations/0001_init.sql`。**不改 schema，只把現有 schema 具現為 SQL** |
| M8 | **`dotenv` / 全域 `process.env`** | `src/app.ts:2`、`src/utils/jwt.ts:9,17`、`src/middleware/upload.ts:23` | Workers 無 `.env` 檔案；`process.env` 僅在 `nodejs_compat` 下部分可用且不含 bindings | 所有設定改由 `env` 參數向下傳遞（`getSecret(env)` 而非 `getSecret()`）。移除 `dotenv` 依賴 |
| M9 | **`scripts/ensure-prisma-client.cjs`（`child_process` + `fs`）** | `scripts/ensure-prisma-client.cjs:1-18` | `execSync('prisma generate')`、檢查 Windows `.dll.node` | 純 build-time script，不進 bundle，但 D1 不需要 binary engine → 此腳本連同 `prisma:generate` 流程一併移除 |
| M10 | **`seed.ts`（Node PrismaClient + tsx）** | `prisma/seed.ts` | Workers 無法執行 tsx；seed 需對遠端 D1 操作 | 轉為 `wrangler d1 execute --file=seed.sql`，或保留 Node 腳本但透過 D1 HTTP API。⚠️ 現行 seed 會 `deleteMany()` 全表，**正式環境絕不可沿用**（見 §6 風險 R3） |
| M11 | **`express-rate-limit` MemoryStore** | `src/routes/admin.ts:25` | Express middleware；且 MemoryStore 在 Workers isolate 間不共用、隨時被回收 → rate limit 形同虛設 | 改用 **Cloudflare Rate Limiting binding**（最簡單）或 Durable Object（需精確計數時）。行為需維持 `15min / 10 次`，且回應仍為 400/429 + `{ error: '登入嘗試次數過多，請稍後再試。' }` |
| M12 | **`cors` 套件** | `src/app.ts:11` | Express middleware 簽章 | 改 `hono/cors`，設定值維持 `origin: env.FRONTEND_ORIGIN`。同源部署後可進一步收斂（見 S6） |
| M13 | **錯誤處理 middleware** | `src/app.ts:22-38` | Express `(err, req, res, next)` 四參數簽章 | 改 `app.onError(...)`。**必須逐條複製現行行為**：`MulterError` → 400 `檔案上傳失敗：<msg>`；`Error` → 400 `<msg>`；其他 → 500。M2 移除 multer 後，檔案過大需自行丟出等價訊息以維持 contract |

### 2.2 🟡 建議修改（Should change — 可跑但有正確性、成本或安全問題）

| # | 項目 | 現況 | 建議 | 理由 |
| --- | --- | --- | --- | --- |
| S1 | `jsonwebtoken` → `jose` | `src/utils/jwt.ts` | 改 `jose` 的 `SignJWT` / `jwtVerify`（HS256，WebCrypto） | `jsonwebtoken` 依賴 `node:crypto` 的 KeyObject；即使開 `nodejs_compat` 也常見邊緣失敗。**`jose` 產生的 HS256 token 與現有 token 互通**，故此改動不影響 API contract |
| S2 | `bcryptjs` → WebCrypto PBKDF2 / scrypt | `src/routes/admin.ts:52` | 評估改用 `crypto.subtle.deriveBits` PBKDF2 | bcryptjs 純 JS 可跑，但 cost=10 屬 CPU 密集，易觸及 Workers CPU time 限制。⚠️ **變更 hash 演算法需重新產生 `ADMIN_PASSWORD_HASH` 並更新 `AdminUser.passwordHash`**，屬資料面變更，需獨立規劃。若決定保留 bcryptjs，務必先實測登入的 CPU 耗時 |
| S3 | **舊頭貼刪除流程** | **完全不存在**（見 §4.3） | 上傳新頭貼成功後，刪除舊 R2 物件（從舊 `avatarUrl` 反解 key） | 現況孤兒檔只佔本機磁碟；遷到 R2 後會**持續產生儲存費用**。建議在 M2 改寫時一併加入，並以 `try/catch` 包覆避免刪除失敗影響上傳結果 |
| S4 | **MIME 驗證加 magic bytes** | 僅檢查 client 宣告的 `Content-Type` | 讀前 8 bytes 比對 JPEG/PNG/WebP signature | 現行驗證可被任意繞過（現有測試即以 4 bytes 假 JPEG 通過）。⚠️ 加嚴後**現有測試 `adminCrud.test.ts:203` 會失敗**，需同步調整測試 fixture |
| S5 | **`Project.imageUrl` 加 URL 驗證** | zod 僅驗 `string` | 比照 `link` 加 `.url()` 或明確允許 `/uploads/` 前綴的相對路徑 | ⚠️ 加嚴驗證屬 **API contract 行為變更**（原本接受的值會變 400），需獨立決策，不應在遷移 Phase 順手改 |
| S6 | **CORS 收斂** | `origin: FRONTEND_ORIGIN` | 同源部署後可改為只允許自身 origin，或在確認無跨網域需求後移除 | 單一 Worker 同源後 CORS 大多不再需要；保留也無害 |
| S7 | **前端 token 持久化** | 僅存 Pinia memory，重整即登出 | 評估 `sessionStorage` 或 httpOnly cookie | 純 UX 問題，與 Cloudflare 無關。改 cookie 會動到 API contract（需 `credentials`），需獨立決策 |
| S8 | **`express.json()` body limit** | 預設 100kb | Hono 無預設 limit，需顯式設定以維持等價行為 | 若不設定，遷移後 `PUT /api/admin/profile` 的可接受 body 大小會**悄悄放寬**，屬非預期的行為變更 |
| S9 | **錯誤處理器的 400 泛化** | 所有 `Error` → 400 | 區分 Prisma 錯誤 / 驗證錯誤 / 未預期錯誤 | 現況可能把 500 級錯誤誤報為 400 並洩漏內部訊息。⚠️ 修正會改變 status code → **API contract 變更**，需獨立決策 |
| S10 | **`predev` / `pretest` 的破壞性 seed** | 每次 `npm run dev` / `test` 清空全表 | 正式環境流程必須拆開；D1 的 seed 只在初始化時執行一次 | 見風險 R3 |
| S11 | **`seed.ts` 的管理者帳號語意** | 以 email 為 key `upsert`，且 `deleteMany()` 清單不含 `adminUser` | 明確定義取代語意：seed 前先刪除非目標 email 的管理者，或將帳號管理完全移出 seed | 🔴 安全性。改 `.env` 不會停用舊帳號（登入只查 DB、不讀 `.env`）。見 R10 |
| S12 | **Vitest 未限制 `include`** | 連 `dist/**` 的編譯產物一起跑 | `include: ['src/**/*.test.ts']` | 見 R11。P1 的契約測試需要可信的測試結果 |

### 2.3 🟢 可以保留（Keep as-is — 無須改動）

| # | 項目 | 理由 |
| --- | --- | --- |
| K1 | **整個 frontend（Vue 3 + Vite）** | 建置產物是純靜態檔，Static Assets 直接託管。`build` 指令、`dist/` 輸出目錄、`base: '/'` 全部不變 |
| K2 | **`createWebHistory` history mode** | Static Assets 的 `not_found_handling = "single-page-application"` 原生支援 |
| K3 | **`VITE_API_BASE_URL` 機制** | 同源部署後維持預設 `''`（相對路徑）即可，**連 `.env` 都不需要建立** |
| K4 | **`resolveAssetUrl()` 邏輯** | `/uploads/...` 相對路徑在同源 Worker 下可直接使用；`^https?://` 分支也繼續有效 |
| K5 | **Prisma schema（6 個 model）** | JSON-as-String 的設計對 D1 高度友善；`Int autoincrement`、`DateTime`、`@unique`、`onDelete: Cascade` 皆為 D1 支援的 SQLite 語意。**本次不動 schema** |
| K6 | **DB 中 `avatarUrl` 的儲存格式** | 存的是 `/uploads/<filename>` 相對路徑。只要 Worker 繼續在該路徑提供 R2 物件，**既有資料零改動、API response 零改動** |
| K7 | **未使用 `$transaction`** | D1 不支援 Prisma interactive transaction — 本專案完全沒用到，是最大的運氣 |
| K8 | **未使用 raw SQL** | 無 `$queryRaw` / `$executeRaw`，無 SQLite 方言相依 |
| K9 | **zod schemas（`src/schemas/admin.ts`）** | 純 JS，Workers 完全相容，逐字保留 |
| K10 | **`src/utils/json.ts`** | 純 `JSON.parse` + type guard，無 Node API |
| K11 | **所有 API 路徑、method、response shape、status code** | 遷移目標是「換底層、不換介面」。見 §3 契約凍結清單 |
| K12 | **`requireAuth` 的驗證語意** | Bearer header 解析、401 訊息文字、`req.admin` 掛載語意皆照搬（掛載方式改為 Hono `c.set('admin', ...)`） |
| K13 | **`nodejs_compat` flag 下的 `Buffer`** | runtime source 未直接使用 `Buffer`（僅測試檔），無遷移負擔 |
| K14 | **backend 測試策略（supertest 打 app，不經 listen）** | 此結構讓測試可平移到 Miniflare / `unstable_dev`，測試意圖與斷言大多可保留 |

### 2.4 Blocker 統計

| 分類 | 數量 | 影響面 |
| --- | --- | --- |
| 🔴 必須修改 | 13（M1–M13） | HTTP 層、儲存層、資料庫連線層、設定注入層 |
| 🟡 建議修改 | 12（S1–S12） | 安全性、成本、正確性、UX |
| 🟢 可以保留 | 14（K1–K14） | 前端全部、資料模型全部、API 契約全部 |

**核心判斷：這是一次「HTTP 與 I/O 層的替換」，不是應用邏輯重寫。** 業務邏輯（zod 驗證、JSON 解析、排序、CRUD 語意）幾乎可逐行保留。

---

## 3. API contract 凍結清單

以下為遷移前後**必須逐項等價**的介面。任何 Phase 的 PR 都應對照此表驗收。

| # | Method | Path | 成功 status | 失敗 status | Response 關鍵形狀 |
| --- | --- | --- | --- | --- | --- |
| 1 | GET | `/api/health` | 200 | — | `{ status: 'ok' }` |
| 2 | GET | `/api/profile` | 200 | 404 | Profile 全欄位 + `contactLinks: ContactLink[]`（已解析） |
| 3 | GET | `/api/skills` | 200 | — | `SkillCategory[]`，含巢狀 `skills[]`，皆依 `sortOrder` |
| 4 | GET | `/api/experience` | 200 | — | `Experience[]`，`highlightsZh/En: string[]` |
| 5 | GET | `/api/projects` | 200 | — | `Project[]`，`highlightsZh/En`、`techStack: string[]` |
| 6 | POST | `/api/admin/login` | 200 `{ token }` | 400 / 401 / rate-limited | 訊息文字須一致 |
| 7 | PUT | `/api/admin/profile` | 200 | 400 | Profile + 已解析 `contactLinks` |
| 8 | POST | `/api/admin/avatar` | 200 | 400 / 401 / 404 | Profile + 已解析 `contactLinks`；`avatarUrl` 為 `/uploads/<filename>` |
| 9 | POST | `/api/admin/skill-categories` | **201** | 400 / 401 | category 物件 |
| 10 | PUT | `/api/admin/skill-categories/:id` | 200 | 400 / 401 / 404 | category 物件 |
| 11 | DELETE | `/api/admin/skill-categories/:id` | **204（無 body）** | 400 / 401 / 404 | — |
| 12 | POST | `/api/admin/skills` | **201** | 400 / 401 | skill 物件 |
| 13 | PUT | `/api/admin/skills/:id` | 200 | 400 / 401 / 404 | skill 物件 |
| 14 | DELETE | `/api/admin/skills/:id` | **204** | 400 / 401 / 404 | — |
| 15 | POST | `/api/admin/experience` | **201** | 400 / 401 | experience + 已解析 highlights |
| 16 | PUT | `/api/admin/experience/:id` | 200 | 400 / 401 / 404 | 同上 |
| 17 | DELETE | `/api/admin/experience/:id` | **204** | 400 / 401 / 404 | — |
| 18 | POST | `/api/admin/projects` | **201** | 400 / 401 | project + 已解析 highlights / techStack |
| 19 | PUT | `/api/admin/projects/:id` | 200 | 400 / 401 / 404 | 同上 |
| 20 | DELETE | `/api/admin/projects/:id` | **204** | 400 / 401 / 404 | — |
| 21 | GET | `/uploads/<filename>` | 200 + 圖片 | 404 | binary，`Content-Type` 對應副檔名 |

**易漏項提醒**：
- 201（4 條）與 204（4 條）不可退化為 200。
- 401 訊息有兩種文字（缺 header vs token 無效），需分別保留。
- 錯誤 body 一律為 `{ error: string }`，部分驗證失敗另帶 `details`（`parsed.error.flatten()`）。
- `POST /api/admin/avatar` 在 profile 不存在時回 **404**（不是 400）。

---

## 4. 分階段執行計畫

> 每個 Phase 皆為獨立、可回滾的變更，且都必須通過 §7 的驗收標準。

| Phase | 目標 | 主要產出 | 是否改動 production 行為 |
| --- | --- | --- | --- |
| **P0（本次）** | 盤點與規劃 | `CURRENT_ARCHITECTURE.md`、`CLOUDFLARE_MIGRATION_PLAN.md` | ❌ 純文件 |
| **P0.5** | **清理基準線** | 刪除 `AdminUser` 殘留列（R10）；`vitest.config.ts` 加 `include`（R11）→ 讓 `npm test` 回到全綠 | ❌ 資料清理 + 測試設定 |
| **P1** | 建立契約護欄 | 針對 §3 的 21 條契約補上 API 契約測試（跑在現有 Express 上） | ❌ 只增測試 |
| **P2** | 抽離設定注入 | 把 `process.env` 讀取集中為 `createConfig(source)`，Node 端仍傳 `process.env` | ❌ 行為等價重構 |
| **P3** | 抽離儲存層 | 定義 `StorageAdapter`（`put` / `get` / `delete`），實作 `LocalDiskAdapter` 包住現有 multer 行為 | ❌ 行為等價重構 |
| **P4** | 建立 migration baseline | 由現有 schema 產出 `migrations/0001_init.sql`（`migrate diff --from-empty`），**不改 schema、不套用到 dev.db** | ❌ 只增檔案 |
| **P5** | 替換 auth 原語 | `jsonwebtoken` → `jose`（HS256 互通）；評估並決定 bcrypt 去留（S2） | ⚠️ 需契約測試把關 |
| **P6** | HTTP 層替換 | Express → Hono；`worker.ts` 進入點；`onError` 逐條複製錯誤語意；rate limit 改 CF 方案 | ⚠️ 核心變更，契約測試把關 |
| **P7** | 資料層替換 | Prisma D1 adapter；`createDb(env.DB)` 工廠；移除 `ensure-prisma-client.cjs` | ⚠️ 核心變更 |
| **P8** | 儲存層替換 | `R2Adapter` 實作 `StorageAdapter`；`/uploads/*` 由 Worker 代理；加入 S3 舊檔刪除 | ⚠️ 核心變更 |
| **P9** | 靜態託管 | `[assets]` 設定 + `run_worker_first`；驗證三條 SPA 路由與 API 不互相吞噬 | ⚠️ |
| **P10** | 資料搬遷與切換 | dev.db → D1 匯入；`backend/uploads/` → R2 上傳；secrets 注入；DNS 切換 | ⚠️ 需停機窗口 |

P1–P4 全部是**非行為性**變更，可在不碰 Cloudflare 的情況下先行完成，大幅降低 P6–P8 的風險。

---

## 5. 關鍵技術決策點（需在 P5/P7 前定案）

| 決策 | 選項 A | 選項 B | 初步傾向 |
| --- | --- | --- | --- |
| **HTTP framework** | Hono | itty-router / 原生 `fetch` | **Hono** — router / middleware / 錯誤處理與 Express 對應最直接，M1、M12、M13 的改寫成本最低 |
| **ORM** | Prisma + `@prisma/adapter-d1` | Drizzle ORM | **Prisma**（若版本支援度足夠）— schema 與既有 query 可最大程度保留；若 5.x adapter 成熟度不足，Drizzle 是退路，但需重寫所有 query |
| **Prisma 版本** | 維持 5.21.1 | 升級至支援 D1 adapter 的穩定版 | **需實測**。5.21 的 driverAdapters 仍為 preview，是本計畫**最大的未知數** |
| **密碼雜湊** | 保留 bcryptjs | 改 WebCrypto PBKDF2 | **先實測 bcryptjs cost=10 在 Workers 的 CPU 耗時**再決定；改演算法需連帶處理既有 hash |
| **JWT 函式庫** | 保留 `jsonwebtoken` + `nodejs_compat` | 改 `jose` | **`jose`** — HS256 token 互通，無 contract 風險，且消除 `node:crypto` 相依 |
| **Rate limit** | Cloudflare Rate Limiting binding | Durable Object | **Rate Limiting binding** — 對「登入防爆」這個用途已足夠，複雜度最低 |
| **靜態檔託管** | Workers Static Assets | Cloudflare Pages | **Static Assets** — 單一 Worker 同源，`/api`、`/uploads`、SPA 共用一個 origin，CORS 與 `VITE_API_BASE_URL` 都不必動 |

---

## 6. 風險登記

| # | 風險 | 影響 | 緩解 |
| --- | --- | --- | --- |
| R1 | **Prisma 5.21 的 D1 adapter 成熟度不足** | P7 卡死，可能被迫換 ORM（大量 query 重寫） | 在 P4 結束後**先做一個丟棄式 spike**：以 D1 adapter 跑通 `/api/profile` 與 `/api/skills`（含巢狀 include），再決定是否升版或換 Drizzle |
| R2 | **SPA fallback 吞掉 API 回應** | API 404/401 變成 200 + HTML，前端解析失敗；屬**靜默的 contract 破壞** | `run_worker_first = ["/api/*", "/uploads/*"]`；P9 必須針對「不存在的 `/api/xxx`」斷言回傳 JSON 而非 HTML |
| R3 | **破壞性 seed 誤觸正式資料** | `deleteMany()` 全表清空 D1 正式資料 | seed 腳本**不得**納入任何自動化部署流程；D1 seed 只在初始化時手動執行一次；P10 前先確認備份機制 |
| R4 | **bcryptjs 超出 Workers CPU 限制** | 登入間歇性失敗（`Error: Script exceeded CPU time limit`） | P5 前實測；必要時改 PBKDF2 並規劃 hash 重建 |
| R5 | **上傳大小限制語意改變** | multer 的 `MulterError` → 400 行為若未複製，會變成不同 status/訊息 | P8 的契約測試須涵蓋「超過 `UPLOAD_MAX_SIZE_MB`」與「錯誤 MIME」兩條路徑 |
| R6 | **`express.json()` 100kb limit 悄悄消失** | 遷移後接受更大 body，屬非預期行為變更（S8） | Hono 顯式設定等價 limit |
| R7 | **R2 孤兒物件累積** | 持續產生儲存費用（現況只是佔本機磁碟） | P8 一併實作 S3 的舊檔刪除 |
| R8 | **無 migration 歷史導致 schema 漂移** | dev.db 的實際結構可能與 `schema.prisma` 不一致（`db push --accept-data-loss` 的歷史副作用） | P4 產出 baseline SQL 後，**與 dev.db 的實際 schema 做 diff 比對**，確認兩者一致再往下走 |
| R9 | **D1 的 FK cascade 行為** | `Skill.categoryId` 的 `onDelete: Cascade` 若未生效，刪分類會留下孤兒 skill | P4 的 baseline SQL 須確認 FK 定義完整；P7 加測「刪除分類後底下 skill 一併消失」 |
| R10 | **`seed.ts` 不清理 `AdminUser`，登入不讀 `.env`** | 更換 `ADMIN_EMAIL` 會**累積**帳號而非取代，舊帳號連同舊密碼 hash 持續可登入 → 正式環境等同留下後門。目前 `dev.db` 已有 2 筆，並已造成 `seed.smoke.test` 失敗 | P1 前先清理 `dev.db` 的殘留列；D1 的 seed 流程必須明確定義管理者帳號的「取代」語意（或改為完全不由 seed 管理帳號） |
| R11 | **Vitest 連 `dist/` 編譯產物一起執行** | 測試數量加倍（8 檔 38 測），且修改 `src` 未重建時，原始碼與過期產物會給出**矛盾的通過／失敗結果**，使契約測試失去把關意義 | P1 前於 `vitest.config.ts` 加 `include: ['src/**/*.test.ts']` |

---

## 7. 每個 Phase 的驗收標準

沿用本次 Phase 的標準，後續每個 PR 一併適用：

1. **frontend build 必須維持通過** — `cd frontend && npm run build`（`vue-tsc -b && vite build`）
2. **backend 既有閘門維持現況** — `npm run typecheck`、`npm run lint`、`npm run test`（`vitest run --passWithNoTests`）皆不得退步
3. **Git diff 應只有文件或必要的非行為性調整**（P0–P4 適用；P5 起改為「diff 須對應計畫中明列的項目」）
4. 自 P1 起，**§3 的 21 條 API 契約測試全數通過**

---

## 8. 本次 Phase（P0）交付與驗證紀錄

### 8.1 交付

| 檔案 | 位置 |
| --- | --- |
| `CURRENT_ARCHITECTURE.md` | repo 根目錄 |
| `CLOUDFLARE_MIGRATION_PLAN.md` | repo 根目錄 |

### 8.2 變更範圍

**僅新增上述兩份 Markdown 文件。**
未修改任何 `.ts` / `.vue` / `.json` / `.prisma` / `.env` 檔案，未新增或移除任何依賴，未執行任何 `prisma` 指令，未建立 D1 / R2，未 deploy，未改 DNS。
因此 frontend build 與 backend typecheck / lint / test 的結果**與本次工作前完全相同**（零程式碼變更 → 零行為變更）。

### 8.3 基準線驗證結果

**frontend** — 未於本工作階段執行（本機 shell 通道因 2026-09-08 的 Windows 更新失效；雲端容器的 `npm ci` 被組織 egress 政策阻擋，`registry.npmjs.org` 回 `403 Forbidden`）。請本機執行：

```bash
cd frontend && npm run build && npm run test
```

**backend** — 已由專案擁有者於 2026-09-18 19:23 在本機執行 `npm test`：

```
Test Files  2 failed | 6 passed (8)
     Tests  2 failed | 36 passed (38)
```

**2 項失敗皆為既有問題（pre-existing），與本次 Phase 無關。** 本次 diff 僅含兩個新增的 `.md` 檔案，不可能影響測試結果；且失敗涉及的資料列建立於 17:17 與 18:11，皆早於本工作階段開始時間（19:07）。

失敗內容與根因詳見 [`CURRENT_ARCHITECTURE.md` §6.1](./CURRENT_ARCHITECTURE.md)：`seed.ts` 不清理 `AdminUser`，`.env` 的 `ADMIN_EMAIL` 變更後舊帳號殘留，導致 `seed.smoke.test` 的 `expect(adminCount).toBe(1)` 收到 2。

> ⚠️ **此失敗必須在 P1 開始前修復**（刪除 `AdminUser` 中不再使用的那一列），否則後續每個 Phase 都無法用「測試全綠」作為驗收依據。

### 8.4 本次 Phase 新增的風險項目

基準線驗證過程中發現兩項原盤點未涵蓋的問題，已補入風險登記（§6 R10、R11）與 blocker 清單（S11、S12）。
