import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatFinding, inspectContent, inspectPath, scanIndex } from './check-sensitive-data.mjs'

const scanner = fileURLToPath(new URL('./check-sensitive-data.mjs', import.meta.url))
// Construct nonfunctional fixtures. None are derived from real credentials or dumps.
const fakePbkdf2 = ['pbkdf2', 'sha256', '1', 'A'.repeat(24), 'B'.repeat(44)].join('$')
const fakeBcrypt = ['$2b', '04', 'A'.repeat(53)].join('$')
const fakeArgon2 = ['', 'argon2id', 'v=19', 'm=1,t=1,p=1', 'A'.repeat(16), 'B'.repeat(32)].join('$')
const fakeToken = ['ghp', 'A'.repeat(36)].join('_')
const fakePrivateKey = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ')

function git(root, args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 0, 'Git fixture operation must succeed')
  return result.stdout
}

function repository(t) {
  const root = mkdtempSync(join(tmpdir(), 'sensitive-check-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  git(root, ['init', '-q'])
  return root
}

function stage(root, path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content)
  git(root, ['add', '-f', '--', path])
}

for (const path of [
  'backup-before-contact-phone.sql', 'nested/BACKUP-snapshot.SQL.GZ',
  'backup202610.sql', 'mybackup.sql', 'data.sql.gz', 'snapshot.sql.zip',
  'data/database-backup.sql', 'data/export-2026.sql.zip', 'db/dump.sql',
  'backups/snapshot.json', 'backend/.generated/d1-seed.sql',
  'd1-admin.sql', 'nested/d1-admin.sql.gz', 'data.sql.bak',
  'data.sqlite3', 'data.sqlite-wal', 'data.db-journal',
  '.env', 'backend/.env.production', '.dev.vars.production',
  'nested/server.key', 'id_ed25519', 'server.pfx',
]) {
  test(`blocks sensitive path ${path}`, () => assert.ok(inspectPath(path)))
}

for (const path of [
  'backend/migrations/0001_init.sql', 'backend/migrations/0004_profile_contact_phone.sql',
  'backend/prisma/migrations/20261004_init/migration.sql',
  'backend/seeds/content.sql', 'backend/prisma/seed.ts',
  'backend/scripts/d1-export-seed.ts', '.dev.vars.example',
  'backend/.env.example', '.env.production.example', 'frontend/public/favicon.svg',
]) {
  test(`allows source path ${path}`, () => assert.equal(inspectPath(path), null))
}

for (const [rule, fixture] of [
  ['password-hash-pbkdf2', fakePbkdf2],
  ['password-hash-bcrypt', fakeBcrypt],
  ['password-hash-argon2', fakeArgon2],
  ['github-token', fakeToken],
  ['private-key', fakePrivateKey],
  ['aws-access-key', 'AKIA' + 'A'.repeat(16)],
  ['google-api-key', 'AIza' + 'A'.repeat(35)],
  ['slack-token', 'xoxb' + '-' + '1'.repeat(24)],
  ['literal-credential', 'JWT_SECRET=' + 'Z'.repeat(40)],
]) {
  test(`detects ${rule} in an innocently named file`, () => {
    assert.ok(inspectContent('notes.txt', Buffer.from(fixture)).includes(rule))
  })
}

test('detects a UTF-16 database export credential', () => {
  assert.ok(inspectContent('notes.txt', Buffer.from(fakePbkdf2, 'utf16le')).includes('password-hash-pbkdf2'))
})

for (const statement of [
  'INSERT INTO "AdminUser" ("email", "passwordHash") VALUES (\'fixture@example.invalid\', \'invalid\');',
  'INSERT OR REPLACE INTO [AdminUser] VALUES (1, \'invalid\');',
  'REPLACE INTO main.`AdminUser` VALUES (1, \'invalid\');',
  'INSERT /* fixture */ INTO "public"."AdminUser" VALUES (1);',
  'UPDATE "AdminUser" SET "passwordHash" = \'invalid\';',
]) {
  test('rejects admin credential SQL even without a recognizable hash', () => {
    assert.ok(inspectContent('backend/seeds/content.sql', Buffer.from(statement)).includes('admin-credential-sql'))
  })
}

test('schema migrations and public seeds are not rejected wholesale', () => {
  const sql = 'CREATE TABLE "AdminUser" ("passwordHash" TEXT NOT NULL);\nINSERT INTO "Skill" VALUES (1, \'Testing\');'
  assert.deepEqual(inspectContent('backend/migrations/0001_init.sql', Buffer.from(sql)), [])
})

test('source password formats and template placeholders remain allowed', () => {
  const content = [
    'pbkdf2$sha256$<iterations>$<salt>$<derived key>',
    'JWT_SECRET="replace-with-a-random-secret"',
    'ADMIN_PASSWORD_HASH="$2a$10$replace-with-a-real-bcrypt-hash"',
  ].join('\n')
  assert.deepEqual(inspectContent('.env.example', Buffer.from(content)), [])
})

test('examples and migration files still undergo credential scanning', t => {
  const root = repository(t)
  stage(root, '.env.example', fakeToken)
  stage(root, 'backend/migrations/0001_init.sql', fakePbkdf2)
  const { findings } = scanIndex(root)
  assert.ok(findings.some(f => f.path === '.env.example' && f.rule === 'github-token'))
  assert.ok(findings.some(f => f.path.endsWith('0001_init.sql') && f.rule === 'password-hash-pbkdf2'))
})

test('force-adding ignored files does not bypass the guard', t => {
  const root = repository(t)
  stage(root, '.gitignore', '.env\n')
  stage(root, '.env', 'PLACEHOLDER=invalid')
  assert.ok(scanIndex(root).findings.some(f => f.rule === 'environment-file'))
})

test('scans staged content, not an unstaged cleaned working copy', t => {
  const root = repository(t)
  stage(root, 'notes.txt', fakePbkdf2)
  writeFileSync(join(root, 'notes.txt'), 'clean working copy')
  assert.ok(scanIndex(root).findings.some(f => f.rule === 'password-hash-pbkdf2'))
})

test('does not read untracked local secrets or unstaged changes', t => {
  const root = repository(t)
  stage(root, 'notes.txt', 'clean staged content')
  writeFileSync(join(root, 'notes.txt'), fakePbkdf2)
  writeFileSync(join(root, '.env'), fakeToken)
  assert.deepEqual(scanIndex(root).findings, [])
})

test('staged deletions no longer fail the check', t => {
  const root = repository(t)
  stage(root, 'backup-before-contact-phone.sql', '-- synthetic empty backup')
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic fixture'])
  git(root, ['rm', '--', 'backup-before-contact-phone.sql'])
  assert.deepEqual(scanIndex(root).findings, [])
})

test('all tracked files are checked, not just the changed set', t => {
  const root = repository(t)
  stage(root, 'notes.txt', fakeToken)
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic fixture'])
  stage(root, 'new.txt', 'clean')
  assert.ok(scanIndex(root).findings.some(f => f.rule === 'github-token'))
})

test('symlinks are not followed outside the staged tree', { skip: process.platform === 'win32' }, t => {
  const root = repository(t)
  writeFileSync(join(root, 'private-local.txt'), fakeToken)
  symlinkSync('private-local.txt', join(root, 'reference.txt'))
  git(root, ['add', '--', 'reference.txt'])
  assert.deepEqual(scanIndex(root).findings, [])
})

test('output redacts content and escapes control characters in paths', t => {
  const root = repository(t)
  const path = process.platform === 'win32' ? 'notes-synthetic.txt' : 'notes\n::warning::##[warning]synthetic.txt'
  stage(root, path, fakeToken + '\n' + fakePbkdf2)
  const result = spawnSync(process.execPath, [scanner], { cwd: root, encoding: 'utf8' })
  assert.equal(result.status, 1)
  assert.ok(result.stderr.includes(JSON.stringify(path).replaceAll('[', '\\u005b')))
  assert.ok(!result.stderr.includes(fakeToken))
  assert.ok(!result.stderr.includes(fakePbkdf2))
  assert.ok(!result.stderr.includes('\n::warning::'))
  assert.ok(!result.stderr.includes('##['))
})

test('finding formatting escapes workflow commands on every platform', () => {
  const output = formatFinding({ path: 'notes\n::warning::##[warning]synthetic.txt', rule: 'github-token' })
  assert.ok(output.includes('\\n'))
  assert.ok(!output.includes('\n::warning::'))
  assert.ok(!output.includes('##['))
})

test('Git failures fail closed without dumping command or input', t => {
  const root = mkdtempSync(join(tmpdir(), 'not-a-repository-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const result = spawnSync(process.execPath, [scanner], { cwd: root, encoding: 'utf8', env: { ...process.env, GIT_CEILING_DIRECTORIES: tmpdir() } })
  assert.equal(result.status, 2)
  assert.match(result.stderr, /could not complete/)
  assert.ok(!result.stderr.includes('fatal:'))
})

test('large staged blobs fail closed instead of silently skipping', t => {
  const root = repository(t)
  stage(root, 'large.txt', Buffer.alloc(16 * 1024 * 1024 + 1, 65))
  assert.ok(scanIndex(root).findings.some(f => f.rule === 'blob-exceeds-scan-limit'))
})

test('Git ignore patterns preserve real migrations and seed source', t => {
  const root = repository(t)
  const rules = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8')
  stage(root, '.gitignore', rules)
  for (const path of ['backup-before-contact-phone.sql', 'backup.sql.gz', '.env.production', '.dev.vars.production', 'data.sqlite3-wal', 'backend/.generated/d1-admin.sql']) {
    const result = spawnSync('git', ['check-ignore', '-q', '--', path], { cwd: root })
    assert.equal(result.status, 0, `Expected ignored: ${path}`)
  }
  for (const path of ['backend/migrations/0001_init.sql', 'backend/prisma/seed.ts', 'backend/seeds/content.sql', 'backend/.env.example', '.dev.vars.example']) {
    const result = spawnSync('git', ['check-ignore', '-q', '--', path], { cwd: root })
    assert.equal(result.status, 1, `Expected trackable: ${path}`)
  }
})

for (const value of ['X'.repeat(20) + '!' + 'Y'.repeat(20), 'X'.repeat(20) + 'example' + 'Y'.repeat(20)]) {
  test('punctuation or the word example cannot exempt a literal credential', () => {
    assert.ok(inspectContent('config.txt', Buffer.from('JWT_SECRET="' + value + '"')).includes('literal-credential'))
  })
}

for (const sql of [
  'UPDATE OR REPLACE "AdminUser" SET ("passwordHash", "email") = (\'invalid\', \'fixture@example.invalid\');',
  'SELECT \'--\'; INSERT INTO "AdminUser" VALUES (1, \'invalid\');',
  'SELECT \'/*\'; UPDATE "AdminUser" SET "passwordHash" = \'invalid\';',
  'COPY "AdminUser" FROM STDIN;',
]) {
  test('admin write detection handles SQL syntax and comment-like string values', () => {
    assert.ok(inspectContent('content.sql', Buffer.from(sql)).includes('admin-credential-sql'))
  })
}

test('SQL-looking text in a quoted literal does not trigger admin-write detection', () => {
  assert.deepEqual(inspectContent('content.sql', Buffer.from('SELECT \'INSERT INTO "AdminUser" VALUES (1)\';')), [])
})

test('unresolved index conflicts fail closed', t => {
  const root = repository(t)
  stage(root, 'conflict.txt', 'clean fixture')
  const oid = git(root, ['hash-object', 'conflict.txt']).trim()
  git(root, ['rm', '--cached', '-q', '--', 'conflict.txt'])
  const result = spawnSync('git', ['update-index', '--index-info'], { cwd: root, input: `100644 ${oid} 1\tconflict.txt\n100644 ${oid} 2\tconflict.txt\n`, encoding: 'utf8' })
  assert.equal(result.status, 0)
  assert.throws(() => scanIndex(root), /conflicts/)
})

test('submodule content requires explicit review', t => {
  const root = repository(t)
  stage(root, 'safe.txt', 'clean')
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Synthetic fixture'])
  const oid = git(root, ['rev-parse', 'HEAD']).trim()
  git(root, ['update-index', '--add', '--cacheinfo', `160000,${oid},vendor-module`])
  assert.ok(scanIndex(root).findings.some(f => f.rule === 'unscanned-submodule'))
})


test('SQLite single-quoted admin table names are checked', () => {
  const sql = "INSERT INTO 'AdminUser' VALUES (1, 'invalid');"
  assert.ok(inspectContent('content.sql', Buffer.from(sql)).includes('admin-credential-sql'))
})
