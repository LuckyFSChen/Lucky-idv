-- Migration number: 0005 	 project image URLs
--
-- 對應 backend/prisma/schema.prisma 的異動：
--   Project 新增 imageUrls 欄位，以 JSON 字串儲存最多 3 張圖片及顯示順序，
--   imageUrl 保留為相容欄位（第一張）。
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

-- AlterTable: Project 新增 imageUrls 欄位
ALTER TABLE "Project" ADD COLUMN "imageUrls" TEXT;
