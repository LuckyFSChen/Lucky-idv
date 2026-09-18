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
| `ADMIN_PASSWORD_HASH` | 管理者密碼的 bcrypt 雜湊值（用 `npm run hash-password -- "密碼"` 產生），**請勿填明碼** |
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
| `npm run hash-password -- "密碼"` | 產生管理者密碼的 bcrypt 雜湊值 |

> `prisma/schema.prisma` 因 SQLite 不支援 `Json` 型別，`contactLinks`／`highlightsZh`／`highlightsEn`／`techStack` 皆以 JSON 字串儲存，API 層會自動轉換為陣列/物件；改用 MySQL/PostgreSQL 後可視需要改回原生 `Json` 型別。

## 四、自動化測試

```bash
cd backend && npm run test     # vitest + supertest：登入成功/失敗、未授權存取、個人資料/技能/經歷/專案 CRUD、頭像上傳（型別/大小限制）
cd frontend && npm run test    # vitest + @vue/test-utils：語言切換、路由守衛、公開頁渲染、後台登入與表單
```

其他品質檢查（`backend/`、`frontend/` 皆適用）：`npm run typecheck`、`npm run lint`、`npm run build`。

## 五、正式環境部署建議

本專案僅提供部署建議，未包含實際部署腳本執行。

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

## 六、已知環境限制

- 本工作副本在 Windows 沙箱環境下，`prisma generate` 若遇到既有行程占用已產生的查詢引擎檔案，會出現 `EPERM` 重新命名錯誤；`backend/scripts/ensure-prisma-client.cjs` 已加入容錯處理（引擎檔案已存在時略過重新產生），不影響 schema 有變更時的正常產生流程。
- 沙箱環境對 `curl`、`tasklist` 等一般系統探測指令會要求額外核准，因此瀏覽器端對後端 API 的手動探測改以 supertest／vitest 自動化測試取代，已於測試章節列出對應覆蓋範圍。
