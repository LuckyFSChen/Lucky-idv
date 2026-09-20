# idv-web

個人 IDV 網站：Vue 3 + TypeScript 前台展示自我介紹與能力，Express + Prisma 後端提供正式資料庫儲存與單一管理者登入後台，供跨裝置查看同一份最新資料。

```
.
├── backend/   Express + Prisma（SQLite，可切換 MySQL/PostgreSQL）+ JWT 管理者登入
└── frontend/  Vue 3 + TypeScript + Pinia + Vue Router + @vueuse/motion
```

## 一、本機啟動步驟

### 1. 後端 backend/

```bash
cd backend
npm install
cp .env.example .env        # 依需求調整內容，見下方「環境變數」
npm run dev                 # http://localhost:3001
```

`npm run dev`（及 `npm run test`）會透過 `predev` / `pretest` 自動執行 `npm run db:setup`：

1. `prisma generate` — 產生 Prisma Client（若已存在且引擎檔案未變動則略過，避免 Windows 上因既有行程占用檔案而重複產生失敗）
2. `prisma db push` — 依 `prisma/schema.prisma` 建立/同步 SQLite 資料庫檔（`prisma/dev.db`）
3. `tsx prisma/seed.ts` — 寫入個人資料、技能分類、工作經歷、DineFlow 專案，並依 `.env` 的 `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` 建立（或更新）唯一管理者帳號

首次啟動前務必先在 `.env` 設定 `ADMIN_EMAIL` 與 `ADMIN_PASSWORD_HASH`，否則 seed 會略過管理者帳號建立、無法登入後台。取得密碼雜湊：

```bash
npm run hash-password -- "你的登入密碼"
# 輸出的 $2a$... 字串貼到 .env 的 ADMIN_PASSWORD_HASH
```

若需要重新手動觸發資料庫建置與種子資料（例如改過 `.env` 的管理者帳密後）：

```bash
npm run db:setup
```

### 2. 前端 frontend/

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

開發模式下前端透過 `vite.config.ts` 的 proxy 設定，將 `/api` 與 `/uploads` 轉發至 `http://localhost:3001`，無需另外設定 `.env` 即可與本機後端串接。公開頁面（首頁）會即時呼叫後端 API 取得個人資料、技能、經歷、專案；管理後台請至 `/admin/login`，以 `.env` 設定的 `ADMIN_EMAIL` 與明碼密碼登入。

### 3. 驗證兩者已正確串接

1. 瀏覽器開啟 `http://localhost:5173`，確認 Hero、自我介紹、技能、經歷、專案、聯絡方式皆正確顯示，並可切換 zh-TW / EN。
2. 開啟 `http://localhost:5173/admin/login` 登入後台，編輯個人資料或上傳大頭貼並儲存。
3. 重新整理 `http://localhost:5173`（或用另一台裝置／瀏覽器開啟相同網址），確認變更已同步顯示——即代表資料已寫入正式後端資料庫，而非僅存於瀏覽器本機。

## 二、環境變數

### backend/.env（複製自 `backend/.env.example`）

| 變數 | 說明 |
| --- | --- |
| `DATABASE_URL` | Prisma 資料庫連線字串。開發用 SQLite：`file:./dev.db`；正式環境可改為 `mysql://user:password@host:3306/db` 或 `postgresql://user:password@host:5432/db` |
| `PORT` | 後端監聽埠號，預設 `3001` |
| `FRONTEND_ORIGIN` | CORS 允許來源，需與前端實際網址一致 |
| `ADMIN_EMAIL` | 唯一管理者帳號 email |
| `ADMIN_PASSWORD_HASH` | 管理者密碼的 PBKDF2 雜湊值（用 `npm run hash-password -- "密碼"` 產生），**請勿填明碼** |
| `JWT_SECRET` | 簽發管理者 JWT 用的密鑰，正式環境務必改為隨機長字串並妥善保密 |
| `JWT_EXPIRES_IN` | JWT 有效期限，預設 `12h` |
| `UPLOAD_MAX_SIZE_MB` | 大頭貼上傳大小上限（MB），預設 `5` |

### frontend/

前端預設以相對路徑（透過同源或 dev proxy）呼叫 `/api`、`/uploads`，本機開發不需要 `.env`。若前後端部署在不同網域，建立 `frontend/.env.production`：

```
VITE_API_BASE_URL=https://api.example.com
```

## 三、資料庫 migration / seed 指令

| 指令（於 `backend/` 執行） | 用途 |
| --- | --- |
| `npm run prisma:generate` | 產生 Prisma Client（已封裝重複產生的容錯處理，見 `scripts/ensure-prisma-client.cjs`） |
| `npm run prisma:push` | 依目前 schema 建立/同步資料庫結構（不產生 migration 歷史，適合開發期 SQLite） |
| `npm run prisma:migrate` | 以正式 migration 檔（`prisma/migrations/`）建立/更新資料庫結構，**建議正式環境改用此指令**並將 migration 檔加入版本控制 |
| `npm run prisma:seed` | 寫入/更新個人資料、技能、經歷、專案與管理者帳號種子資料 |
| `npm run db:setup` | 依序執行上述 generate → push → seed，`npm run dev` / `npm run test` 已自動掛勾 |
| `npm run hash-password -- "密碼"` | 產生管理者密碼的 PBKDF2 雜湊值 |

> `prisma/schema.prisma` 因 SQLite 不支援 `Json` 型別，`contactLinks`／`highlightsZh`／`highlightsEn`／`techStack` 皆以 JSON 字串儲存，API 層會自動轉換為陣列/物件；改用 MySQL/PostgreSQL 後可視需要改回原生 `Json` 型別。

## 四、自動化測試

```bash
cd backend && npm run test     # vitest + supertest：登入成功/失敗、未授權存取、個人資料/技能/經歷/專案 CRUD、頭像上傳（型別/大小限制）
cd frontend && npm run test    # vitest + @vue/test-utils：語言切換、路由守衛、公開頁渲染、後台登入與表單
```

其他品質檢查（`backend/`、`frontend/` 皆適用）：`npm run typecheck`、`npm run lint`、`npm run build`。

## 五、Cloudflare Workers / Static Assets（本機開發）

frontend 的 production build 由 **Cloudflare Static Assets** 提供，`/api/*` 由 **Worker** 處理，兩者**同源（same-origin）**。因此 `VITE_API_BASE_URL` 維持留空即可 —— production bundle 只會發出 `/api/profile` 這類相對路徑請求，不含任何 `localhost`。

> 公開 API（`/api/profile`、`/api/skills`、`/api/experience`、`/api/projects`、`/api/engineering-cases`、`/api/certifications`）與管理後台 API（`/api/admin/*`）皆已遷移至 Worker + D1。
>
> 頭像上傳 `POST /api/admin/avatar` 與 `/uploads/*` 已改用 **R2**（binding `UPLOADS`）。部署前 bucket 必須先存在：
>
> ```bash
> npx wrangler r2 bucket create idv-web-uploads
> ```
>
> 本機 `wrangler dev` 會用 miniflare 模擬 R2，不需要真的 bucket。
>
> Express + Prisma + SQLite 完全不受影響，仍可照 §一 的方式獨立運行；本機開發時 Worker 也能透過 `API_PROXY_ORIGIN` 把 `/api/*` 轉發給它。

### 1. 相關檔案

| 檔案 | 用途 |
| --- | --- |
| `wrangler.jsonc` | Worker 與 Static Assets 設定（repo 根目錄） |
| `worker/index.ts` | Worker 進入點：原生提供 `/api/health`，並可選擇性轉發其餘 `/api/*`、`/uploads/*` |
| `worker/tsconfig.json` | Worker 專用的 TypeScript 設定（與 `backend/`、`frontend/` 互不干擾） |
| `package.json`（根目錄） | 只放 wrangler 與部署用 scripts；`backend/`、`frontend/` 仍是各自獨立的 npm 專案 |
| `.dev.vars.example` | 本機開發變數範本，複製為 `.dev.vars` 後使用 |

### 2. 首次設定

```bash
# 於 repo 根目錄
npm install                       # 安裝 wrangler 與 @cloudflare/workers-types
cp .dev.vars.example .dev.vars    # Windows PowerShell：copy .dev.vars.example .dev.vars
```

> **版本對齊注意**：`@cloudflare/workers-types` 的主版號與 `wrangler` **並不同步** ——
> `wrangler` 目前是 4.x，但 workers-types 已進到 5.x（日期式版號），且 wrangler 會
> 以 peer dependency 要求對應的 5.x。若看到：
>
> ```
> npm error ERESOLVE could not resolve
> npm error peerOptional @cloudflare/workers-types@"^5...." from wrangler@4....
> ```
>
> 表示根目錄的 `@cloudflare/workers-types` 版本範圍落後了，把它調到 wrangler 要求的
> 主版號即可（**不要**用 `--force` 或 `--legacy-peer-deps` 硬吞）。
>
> `backend/` 的 `@cloudflare/workers-types` 是**獨立的 npm 專案**，不受此限制
> （該處沒有安裝 wrangler，因此不會有 peer 衝突）。

### 3. 啟動

#### 模式 A：完整驗證（建議）

開兩個終端機。設定了 `API_PROXY_ORIGIN` 時，Worker 會把 `/api/*`、`/uploads/*` **全部**轉發到 Express backend（不經過 Worker 自己的 handler），因此首頁能真的取得資料、頭像也能正常顯示。

> 想驗證 Worker 自己的 API 實作（而非 Express），請把 `.dev.vars` 的 `API_PROXY_ORIGIN` 註解掉，並確認已設定 `JWT_SECRET` 與本機 D1（`npm run d1:migrate:local`、`npm run d1:seed:local`、`npm run d1:admin:local`）。

```bash
# 終端機 1 —— 照舊啟動 Express backend
cd backend && npm run dev         # http://localhost:3001

# 終端機 2 —— 建置前端並啟動 Worker
npm run cf:dev                    # http://localhost:8787
```

#### 模式 B：只驗證靜態站台

不啟動 backend，也不建立 `.dev.vars`：

```bash
npm run cf:dev
```

此時 `/api/health` 仍正常回傳 `{"status":"ok"}`。`/api/*` 會改由 Worker 自己處理：公開 API 與 `/api/admin/*` 需要本機 D1 有資料，未初始化時會回錯誤；未實作的路徑回 **501**，`/uploads/*` 回 404。

> `npm run cf:dev` 會先執行 `npm run build` 重新產生 `frontend/dist`。若前端沒有改動、想省下建置時間，可改用 `npm run cf:dev:quick`。

### 4. 驗收清單

| 項目 | 做法 | 預期結果 |
| --- | --- | --- |
| frontend production build | `npm run build` | 產生 `frontend/dist/`（`index.html`、`assets/`、`favicon.svg`） |
| wrangler 設定可驗證 | `npm run cf:check` | 完成 bundle 並印出設定摘要，**不會上傳**（`--dry-run`） |
| Worker 型別檢查 | `npm run cf:typecheck` | 無錯誤 |
| `wrangler dev` 可啟動 | `npm run cf:dev` | 監聽 `http://localhost:8787` |
| `/` 正常 | 瀏覽器開啟 `http://localhost:8787/` | 首頁正常渲染 |
| SPA 直接導覽不 404 | 開啟 `http://localhost:8787/admin/login` 後**按 F5 重新整理** | 回傳 200 + `index.html`，登入頁正常顯示（不是 404） |
| `/api` health endpoint | `curl http://localhost:8787/api/health` | `{"status":"ok"}` |
| static assets | `curl -I http://localhost:8787/favicon.svg` | `200`，`content-type: image/svg+xml` |
| API 未被 SPA fallback 吞掉 | `curl -i http://localhost:8787/api/does-not-exist` | 回傳 **JSON**（501 或 404），**不是** HTML |
| production build 不依賴 localhost | `grep -r localhost frontend/dist/assets/` | **無任何結果** |

### 5. 指令一覽（於 repo 根目錄執行）

| 指令 | 用途 |
| --- | --- |
| `npm run build` | 建置 frontend production bundle（等同 `frontend/` 的 `npm run build`） |
| `npm run cf:dev` | 建置前端後啟動 `wrangler dev` |
| `npm run cf:dev:quick` | 直接啟動 `wrangler dev`，不重新建置 |
| `npm run cf:check` | `wrangler deploy --dry-run`，驗證設定與 bundle，不部署 |
| `npm run cf:typecheck` | 檢查 `worker/` 的 TypeScript 型別 |
| `npm run cf:types` | 由 `wrangler.jsonc` 產生 binding 的型別定義 |
| `npm run cf:deploy` | 實際部署（**目前階段尚不應執行**） |

### 6. 設定重點

**`assets.directory` 指向 `./frontend/dist`** —— 這是 `frontend/vite.config.ts` 的實際輸出目錄（未覆寫 `build.outDir`，即 Vite 預設值）。

**`not_found_handling: "single-page-application"`** —— Vue Router 使用 `createWebHistory`（history mode），未命中靜態檔的路徑必須回傳 `index.html` 交由 client-side router 解析。這是 Cloudflare Static Assets 官方支援的設定，回應為 200 + `index.html`，**不需要自行撰寫 fallback 路由**。

**`run_worker_first: ["/api/*", "/uploads/*"]`** —— 這是整份設定最關鍵的一行。若不排除這兩組前綴，上面的 SPA fallback 會把 `/api/*` 的 404、401 一併吞掉並回傳 200 + `index.html`（HTML），前端的 `res.json()` 隨即解析失敗 —— 屬於**靜默的 API contract 破壞**，也是 Static Assets + SPA 組合最常見的陷阱。`/uploads/*` 同理：否則圖片請求會拿到 HTML 而非圖片。

### 7. 目前尚未涵蓋

- **API 未遷移**：`/api/*`（除 `health` 外）仍由 Express + Prisma + SQLite 提供，Worker 在本機僅作轉發。
- **未建立 D1 / R2**：`wrangler.jsonc` 中相關 binding 以註解保留，尚未建立任何 Cloudflare 資源。
- **未部署、未設定 DNS**：`npm run cf:deploy` 目前不應執行。
- **`/projects`、`/about` 不是路由**：它們是首頁的錨點（`#projects`、`#about`，見 `frontend/src/components/AppNav.vue`）。router 實際只註冊了 `/`、`/admin/login`、`/admin` 三條路由，且**沒有 catch-all**。因此直接開啟 `/projects` 會得到 200 + `index.html`（不是 404），但 router 找不到對應路由 → 畫面空白。若需要讓未知路徑導回首頁，須在 `frontend/src/router/index.ts` 加入 catch-all 路由，屬前端行為調整。

### 8. 一鍵部署腳本 `deploy.ps1`

專案根目錄提供 `deploy.ps1`，在確認上述前置設定已就緒後，可於根目錄執行：

```powershell
.\deploy.ps1
```

一次完成 frontend build 並部署同一個 Cloudflare Worker（frontend static assets + 目前已遷移的 `/api/health`，其餘 `/api/*` 維持既有 501 行為）。腳本流程：

1. Preflight（fail-fast，任一項失敗會顯示明確錯誤訊息與建議處理方式並以非 0 結束）：Node.js、npm、Wrangler 是否可執行、`npx wrangler whoami` 是否已登入 Cloudflare、`wrangler.jsonc` 是否存在、`d1_databases` 的 `database_id` 是否已是正式值（非空值、非佔位全零 UUID、非明顯範例字樣）。
2. 全部 Preflight 通過後，呼叫既有的 `npm run cf:deploy`（`npm run build && wrangler deploy`），不會另外重複一份 Wrangler 部署設定。
3. 依 `npm run cf:deploy` 的結束碼輸出成功或失敗摘要；失敗時腳本以非 0 結束碼結束。

`deploy.ps1` **不會**自動執行 Cloudflare 登入、建立 D1 database、建立 production 資源或修改 Secret ——這些屬於初始化 / provisioning，若尚未完成，腳本會在對應 Preflight 階段中止並提示應執行的指令（例如 `npx wrangler login`、`npx wrangler d1 create idv-web`）。

## 六、正式環境部署建議

本專案僅提供部署建議，未包含實際部署腳本執行（此處指第五章之外、以 Docker Compose / 雲端主機為前提的替代部署方式；Cloudflare Workers 的實際部署腳本見上方第 5.8 節 `deploy.ps1`）。

### 1. 容器化（Docker Compose）

建議以三個服務組成：

- `db`：MySQL 或 PostgreSQL 官方映像，掛載持久化 volume
- `backend`：以 `node:20-alpine` 為基底，`npm ci && npm run build`，執行時先跑 `npx prisma migrate deploy` 再 `node dist/index.js`；掛載 `uploads/` volume 以保留頭像檔案
- `frontend`：`npm ci && npm run build` 產出靜態檔，交由 Nginx 服務（或與 backend 共用一個 Nginx 容器做反向代理）

搭配 Nginx 將 `/api`、`/uploads` 反向代理至 backend 容器，其餘路徑導向 frontend 靜態檔，即可讓前端沿用相對路徑（`VITE_API_BASE_URL` 留空）。

### 2. 從 SQLite 切換為 MySQL / PostgreSQL

1. 於正式環境資料庫建立空的 schema/database
2. 將 `backend/prisma/schema.prisma` 的 `datasource db` provider 改為 `mysql` 或 `postgresql`
3. 更新 `.env` 的 `DATABASE_URL` 為正式連線字串
4. 執行 `npx prisma migrate deploy`（正式環境不使用 `migrate dev`，避免互動式提示與資料遺失風險）
5. 視需要以 `npm run prisma:seed` 建立初始管理者帳號與預設內容（正式環境建議先備份，避免覆蓋既有資料）

### 3. 雲端主機（GCP / Linux）

- 於 GCP Compute Engine 或其他 Linux 主機安裝 Docker、Docker Compose
- 以 Nginx（或 GCP Load Balancer）處理 TLS 憑證（Let's Encrypt / Google-managed certificate）與 DNS
- backend 僅需對內網（Nginx／Docker network）開放，對外只暴露 443
- `uploads/` 目錄建議掛載持久化磁碟或改接雲端物件儲存（如 GCS），避免容器重建時遺失已上傳的大頭貼
- `JWT_SECRET`、`ADMIN_PASSWORD_HASH`、資料庫密碼等敏感值改用 Secret Manager 或部署平台的環境變數機制管理，不寫入版本控制

## 七、已知環境限制

- 本工作副本在 Windows 沙箱環境下，`prisma generate` 若遇到既有行程占用已產生的查詢引擎檔案，會出現 `EPERM` 重新命名錯誤；`backend/scripts/ensure-prisma-client.cjs` 已加入容錯處理（引擎檔案已存在時略過重新產生），不影響 schema 有變更時的正常產生流程。
- 沙箱環境對 `curl`、`tasklist` 等一般系統探測指令會要求額外核准，因此瀏覽器端對後端 API 的手動探測改以 supertest／vitest 自動化測試取代，已於測試章節列出對應覆蓋範圍。
