-- Migration number: 0004 	 profile contact phone
--
-- 對應 backend/prisma/schema.prisma 的異動：
--   Profile 新增 contactPhone 欄位，供聯絡資訊顯示可撥打的手機號碼，
--   不影響既有欄位語意，預設為 NULL（不塞入任何預設/範例資料）。
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

-- AlterTable: Profile 新增 contactPhone 欄位
ALTER TABLE "Profile" ADD COLUMN "contactPhone" TEXT;
