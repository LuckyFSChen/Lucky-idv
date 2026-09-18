const { existsSync } = require('node:fs');
const { execSync } = require('node:child_process');
const { join } = require('node:path');

const engineDll = join(
  __dirname,
  '..',
  'node_modules',
  '.prisma',
  'client',
  'query_engine-windows.dll.node',
);

if (existsSync(engineDll)) {
  process.exit(0);
}

execSync('prisma generate', { stdio: 'inherit' });
