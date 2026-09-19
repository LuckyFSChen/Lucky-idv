-- Migration number: 0002 	 engineering portfolio domain model
--
-- 對應 backend/prisma/schema.prisma 的異動：
--   1. Project 新增欄位（category / subtitle / githubUrl / featured），只加不改，
--      既有欄位（含 link 的 live/project URL 語意）維持不變。
--   2. 新增 EngineeringCase model（工程案例研究）。
--   3. 新增 Certification model（專業認證）。
--
-- 不含 DROP TABLE / DROP COLUMN，屬非破壞性變更。
--
-- ⚠️ 套用前請先用 Prisma 重新產生並比對，確認與 schema 完全一致：
--
--   cd backend
--   npx prisma migrate diff \
--     --from-local-d1 \
--     --to-schema-datamodel prisma/schema.prisma \
--     --script
--
-- 詳見 docs/D1.md 的「Migrations」章節。

-- AlterTable: Project 新增欄位
ALTER TABLE "Project" ADD COLUMN "categoryZh" TEXT;
ALTER TABLE "Project" ADD COLUMN "categoryEn" TEXT;
ALTER TABLE "Project" ADD COLUMN "subtitleZh" TEXT;
ALTER TABLE "Project" ADD COLUMN "subtitleEn" TEXT;
ALTER TABLE "Project" ADD COLUMN "githubUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EngineeringCase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "categoryZh" TEXT NOT NULL,
    "categoryEn" TEXT NOT NULL,
    "summaryZh" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "problemZh" TEXT NOT NULL,
    "problemEn" TEXT NOT NULL,
    "contextZh" TEXT NOT NULL,
    "contextEn" TEXT NOT NULL,
    "investigationZh" TEXT NOT NULL,
    "investigationEn" TEXT NOT NULL,
    "solutionZh" TEXT NOT NULL,
    "solutionEn" TEXT NOT NULL,
    "validationZh" TEXT NOT NULL,
    "validationEn" TEXT NOT NULL,
    "resultZh" TEXT NOT NULL,
    "resultEn" TEXT NOT NULL,
    "architecture" TEXT,
    "techStack" TEXT,
    "githubUrl" TEXT,
    "projectUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "issuerZh" TEXT NOT NULL,
    "issuerEn" TEXT NOT NULL,
    "descriptionZh" TEXT,
    "descriptionEn" TEXT,
    "credential" TEXT,
    "issuedAt" DATETIME,
    "link" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "EngineeringCase_slug_key" ON "EngineeringCase"("slug");
