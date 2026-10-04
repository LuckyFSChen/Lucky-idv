# Sensitive data and database backups

## Before committing

Run these commands at the repository root (Node.js 22+ and Git; no npm install needed):

```sh
npm run security:test
git add <reviewed-files>
npm run security:check
```

`security:check` inspects **every file in the Git index**, including unchanged tracked
files and force-added ignored files. It reads staged blob contents, not unstaged
working-tree changes. Stage the version you intend to commit and rerun the check.
The GitHub Actions `Sensitive data guard` job runs the tests and the same check on
pushes and pull requests. It needs only read access to repository contents and does
not persist checkout credentials, install project dependencies, deploy, or use secrets.

Keep database backups outside this repository in access-controlled storage. Do not
upload raw dumps or admin credential SQL to issues, pull requests, CI artifacts, or
chat. `.gitignore` is convenience protection; it does not remove already tracked files.

## What is checked

- Database backup/export filenames, SQLite databases and sidecars, compressed SQL,
  generated data directories, private-key file extensions, local `.env` / `.dev.vars`
  files (example templates may be tracked)
- Recognizable PBKDF2, bcrypt, and Argon2 password hashes, private-key headers, and
  common GitHub, AWS, Google, and Slack credential formats
- Long literal assignments to named credential settings such as `JWT_SECRET` and
  `CLOUDFLARE_API_TOKEN`
- SQL writes to `AdminUser` rows, even when a hash is not recognizable

Schema migrations, public content seeds, password utility source, and template files
remain allowed. **Their contents still undergo the credential checks.** Admin account
SQL generated under `backend/.generated/` must stay local and untracked.

Findings report only a quoted path and rule name; matching values and lines are never
printed. Files above 16 MiB and submodules fail closed for explicit review.

This is a targeted accident-prevention guard, **not proof that a repository has no
secrets**. It does not audit Git history, decompress arbitrary renamed archives,
identify every secret format, detect all short plaintext passwords, or classify all
personal information. A deliberately renamed/encrypted payload can evade heuristics.
Use provider secret scanning/push protection as another layer where supported.
Password hashes must be protected even though they are not provider API tokens.

A maintainer should require the `Sensitive data guard` check and review changes to
this workflow, scanner, and package scripts. A pull request can edit its own checks;
CI in this repository is not a tamper-proof security boundary. Required checks and
branch/ruleset changes are a separate repository-owner configuration step.

## If sensitive data was committed

1. Treat exposed credentials as compromised. Change the affected admin password using
   a private, trusted workflow, update the actual `AdminUser` database record, and
   invalidate relevant sessions/tokens. A Git deletion does not rotate credentials.
   Changing only the local `ADMIN_PASSWORD_HASH` environment variable does not by
   itself replace a password already stored in the production database. If the password
   was reused, change it at the other services too. Rotate signing/API secrets only if
   they were exposed or session invalidation requires it.
2. Remove the backup from the current tracked tree and commit the deletion. Do not
   reproduce its removed contents in a shared patch or report.
3. Separately coordinate any Git-history cleanup with the repository owner and
   collaborators. Review all branches, tags, renamed copies, forks, pull-request
   references, and relevant cached views. A rewrite changes commit IDs, may invalidate
   signatures, and requires coordinated force-pushes and fresh clones or careful cleanup.
4. Follow GitHub's current sensitive-data-removal guidance and contact GitHub Support
   for applicable cached/pull-request references. Public copies already downloaded or
   stored in forks cannot be guaranteed erased. Credential rotation remains necessary.

No history rewrite, remote push, credential rotation, or production database change
is performed by these scripts.
