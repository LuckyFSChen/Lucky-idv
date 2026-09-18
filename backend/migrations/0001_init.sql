-- Migration number: 0001 	 idv-web initial schema
--
-- 由 backend/prisma/schema.prisma 具現而成的 baseline，對應 schema 的「目前狀態」，
-- 未對 model 做任何修改。
--
-- ⚠️ 套用前請先用 Prisma 重新產生並比對，確認與 schema 完全一致：
--
--   cd backend
--   npx prisma migrate diff \
--     --from-empty \
--     --to-schema-datamodel prisma/schema.prisma \
--     --script > /tmp/0001_check.sql
--   # 再與本檔案比對差異
--
-- 詳見 docs/D1.md 的「Migrations」章節。

-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "preferredName" TEXT NOT NULL,
    "titleZh" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "introZh" TEXT NOT NULL,
    "introEn" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "contactEmail" TEXT,
    "contactLinks" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SkillCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "companyZh" TEXT NOT NULL,
    "companyEn" TEXT NOT NULL,
    "roleZh" TEXT NOT NULL,
    "roleEn" TEXT NOT NULL,
    "locationZh" TEXT,
    "locationEn" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "summaryZh" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "highlightsZh" TEXT NOT NULL,
    "highlightsEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "summaryZh" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "highlightsZh" TEXT NOT NULL,
    "highlightsEn" TEXT NOT NULL,
    "techStack" TEXT,
    "link" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");
