/**
 * 確保 Prisma client 與 backend/prisma/schema.prisma 同步。
 *
 * ⚠️ 舊版只檢查 query engine binary 是否存在就 early-return，導致
 *    schema.prisma 改動後（例如 EngineeringCase 新增 published）client 永遠
 *    不會重新產生 —— typecheck 報 "does not exist in type ...WhereInput"，
 *    而 runtime 會在該查詢上直接拋錯。
 *
 *    因此這裡改為比對「產生 client 時所用的 schema 副本」與目前的 schema：
 *    只要內容不同（或副本不存在、engine 不存在），就重新 `prisma generate`。
 */
const { existsSync, readFileSync, readdirSync } = require('node:fs');
const { execSync } = require('node:child_process');
const { join } = require('node:path');

const clientDir = join(__dirname, '..', 'node_modules', '.prisma', 'client');
const schemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
// generate 後 Prisma 會把當下的 schema 複製到 client 目錄，作為比對基準。
const generatedSchemaPath = join(clientDir, 'schema.prisma');

/** client 目錄下是否有任一平台的 query engine（windows .dll.node / linux .so.node ...）。 */
function hasQueryEngine() {
  if (!existsSync(clientDir)) return false;
  return readdirSync(clientDir).some((name) => name.startsWith('query_engine') || name.startsWith('libquery_engine'));
}

function isUpToDate() {
  if (!hasQueryEngine()) return false;
  if (!existsSync(generatedSchemaPath) || !existsSync(schemaPath)) return false;
  // 正規化換行，避免 CRLF / LF 差異造成無謂的重新產生。
  const normalize = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n').trim();
  return normalize(generatedSchemaPath) === normalize(schemaPath);
}

if (isUpToDate()) {
  process.exit(0);
}

console.log('[ensure-prisma-client] schema 已變更或 client 不存在，重新執行 prisma generate…');
execSync('prisma generate', { stdio: 'inherit' });
