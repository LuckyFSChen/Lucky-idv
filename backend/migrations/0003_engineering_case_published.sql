-- Migration number: 0003 	 engineering case published flag
--
-- 對應 backend/prisma/schema.prisma 的異動：
--   EngineeringCase 新增 published 欄位，供公開 API 篩選已發布案例、
--   後台可控制發布 / 下架，不影響既有欄位語意。
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

-- AlterTable: EngineeringCase 新增 published 欄位
ALTER TABLE "EngineeringCase" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
