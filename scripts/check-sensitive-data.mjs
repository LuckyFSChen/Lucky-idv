#!/usr/bin/env node
// Dependency-free guard for the Git index. Never print matching content.
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const MAX_BLOB_BYTES = 16 * 1024 * 1024
const RULES = [
  ['password-hash-pbkdf2', /pbkdf2\$sha(?:256|512)\$\d+\$[A-Za-z0-9+/]{8,}={0,2}\$[A-Za-z0-9+/]{16,}={0,2}/i],
  ['password-hash-bcrypt', /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/],
  ['password-hash-argon2', /\$argon2(?:id|i|d)\$(?:v=\d+\$)?m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}/],
  ['private-key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,255})\b/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['slack-token', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
]

export function inspectPath(path) {
  const parts = path.toLowerCase().split('/')
  const name = parts.at(-1)
  const example = /\.(?:example|sample|template)$/.test(name)
  if (!example && /^(?:\.env(?:\.|$)|\.dev\.vars(?:\.|$))/.test(name)) return 'environment-file'
  if (parts.some(part => /^(?:\.generated|backups?|dumps?)$/.test(part))) return 'generated-or-backup-directory'
  if (/(?:backup|dump|export)/.test(name) && /\.(?:sql|db|sqlite3?)(?:[.-].*)?$/.test(name)) return 'database-backup'
  if (/\.sql\.(?:gz|bz2|xz|zip|zst|7z|tar)(?:\..*)?$/.test(name)) return 'compressed-sql'
  if (/\.(?:bak|dump|db|sqlite3?)(?:[.-].*)?$/.test(name)) return 'database-or-backup-file'
  if (/^d1-admin\.sql(?:\..*)?$/.test(name)) return 'generated-admin-sql'
  if (/^(?:id_rsa|id_ecdsa|id_ed25519)$/.test(name) || /\.(?:p12|pfx|key)$/.test(name)) return 'private-key-file'
  return null
}

export function inspectContent(path, data) {
  // Also recognize ASCII tokens in UTF-16 exports without logging or decoding rows.
  const content = data.toString('utf8').replaceAll('\0', '')
  const findings = new Set()
  for (const [rule, pattern] of RULES) if (pattern.test(content)) findings.add(rule)

  // Target long quoted/unquoted credential assignments, without a broad value allowlist.
  // Only exact documented placeholders are exempt. Examples still get all other checks.
  const names = '(?:JWT_SECRET|ADMIN_PASSWORD_HASH|CLOUDFLARE_API_TOKEN|CF_API_TOKEN|API_KEY|ACCESS_TOKEN|CLIENT_SECRET|DB_PASSWORD|DATABASE_PASSWORD)'
  const assignment = new RegExp('\\b' + names + '["\']?\\s*[:=]\\s*(?:"([^"\\r\\n]+)"|\'([^\'\\r\\n]+)\'|([^\\s;,#]+))', 'g')
  const placeholders = new Set([
    'replace-with-a-random-secret',
    '$2a$10$replace-with-a-real-bcrypt-hash',
  ])
  for (const match of content.matchAll(assignment)) {
    const value = match[1] ?? match[2] ?? match[3]
    if (value.length >= 32 && !placeholders.has(value) && !/^\$\{[^}]+\}$/.test(value) && !/^<[^>]+>$/.test(value)) findings.add('literal-credential')
  }

  // Tokenize SQL so comment markers inside string literals cannot hide later writes.
  // Schema-only migrations and public seed data are allowed; AdminUser row writes are not.
  if (/\.sql$/i.test(path)) {
    const tokens = content.match(/--[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|[A-Za-z_][A-Za-z0-9_]*|[^\s]/g) ?? []
    const sql = tokens.filter(token => !token.startsWith('--') && !token.startsWith('/*')).map(token => {
      if (token.startsWith("'")) return /^'adminuser'$/i.test(token) ? 'adminuser' : '?' // SQLite also allows single-quoted table names
      if (/^["`[]/.test(token)) return token.slice(1, -1).toLowerCase()
      return token.toLowerCase()
    }).join(' ')
    const table = '(?:[a-z_][a-z0-9_]*\\s*\\.\\s*)?adminuser\\b'
    const write = new RegExp('\\b(?:(?:insert(?:\\s+or\\s+\\w+)?|replace)\\s+into|update(?:\\s+or\\s+\\w+)?|copy)\\s+' + table, 'i')
    if (write.test(sql)) findings.add('admin-credential-sql')
  }
  return [...findings]
}

function git(cwd, args, options = {}) {
  const result = spawnSync('git', args, { cwd, maxBuffer: MAX_BLOB_BYTES + 1024 * 1024, ...options })
  if (result.error || result.status !== 0) throw new Error('Git index could not be read; check the repository and unresolved conflicts.')
  return result.stdout
}

export function scanIndex(cwd = process.cwd()) {
  const root = git(cwd, ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
  const entries = git(root, ['ls-files', '--stage', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
  const findings = []
  for (const entry of entries) {
    const match = /^(\d+) ([a-f0-9]+) (\d)\t([\s\S]+)$/.exec(entry)
    if (!match || match[3] !== '0') throw new Error('Resolve the Git index conflicts before running the sensitive-data check.')
    const [, mode, oid, , path] = match
    const pathRule = inspectPath(path)
    if (pathRule) findings.push({ path, rule: pathRule })
    if (mode === '160000') {
      findings.push({ path, rule: 'unscanned-submodule' })
      continue
    }
    const size = Number(git(root, ['cat-file', '-s', oid], { encoding: 'utf8' }).trim())
    if (!Number.isSafeInteger(size) || size > MAX_BLOB_BYTES) {
      findings.push({ path, rule: 'blob-exceeds-scan-limit' })
      continue
    }
    // Reading the staged blob does not follow symlinks or trust unstaged edits.
    const data = git(root, ['cat-file', 'blob', oid])
    for (const rule of inspectContent(path, data)) findings.push({ path, rule })
  }
  return { files: entries.length, findings }
}

export function formatFinding({ path, rule }) {
  return `- ${JSON.stringify(path).replaceAll('[', '\\u005b')} [${rule}]`
}

export function main() {
  try {
    const { files, findings } = scanIndex()
    if (findings.length) {
      console.error('Sensitive-data check failed. Values and file contents are intentionally redacted.')
      for (const { path, rule } of findings) {
        // Escape newline/control characters in filenames, including workflow commands.
        console.error(formatFinding({ path, rule }))
      }
      console.error('Remove sensitive staged files/data and rotate exposed credentials. See SECURITY.md.')
      return 1
    }
    console.log(`Sensitive-data check passed (${files} staged files). This is a targeted guard, not a complete secret audit.`)
    return 0
  } catch {
    // Child-process errors can contain input: keep failure output static.
    console.error('Sensitive-data check could not complete. Ensure Git is installed, the index is readable, and conflicts are resolved.')
    return 2
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main()
