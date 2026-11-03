# Deploying Crop Watch

**Status: the Dockerfile is written but has not been built.** The Docker engine was not running on the build machine. Production mode itself is tested (see below). Build it once and read the output before relying on it.

## What runs
One container: the web service (FastAPI) serving the built website. Results, rainfall and validation files are baked into the image. Logins, field checks, reports, orders, the audit log and photos live in a **data folder** (`/data`) that must be a persistent volume.

## Build and run
```bash
docker build -t cropwatch .
docker run -p 8100:8100 -v cropwatch-data:/data \
  -e CW_SECRET="$(openssl rand -hex 32)" \
  -e CW_ADMIN_EMAIL="you@example.org" \
  -e CW_ADMIN_PASSWORD="a-long-password-with-digits-1" \
  cropwatch
```
Then open `http://localhost:8100/` and sign in as the admin. Create everyone else from the admin account (`POST /api/admin/users`).

## Environment

| Variable | Needed | Meaning |
|---|---|---|
| `CW_ENV=production` | set by the image | No demo accounts, no demo sign-in buttons, a real secret is required |
| `CW_SECRET` | yes | Signs sign-in tokens. The service refuses to start without it in production. Keep it out of git. Changing it signs everyone out |
| `CW_ADMIN_EMAIL`, `CW_ADMIN_PASSWORD` | first start | Creates the first admin if none exists. The password must be 10+ characters with a letter and a digit |
| `CW_DATA` | set to `/data` | Where the database and photo uploads live |
| `CW_DEMO=0` | optional | Hides the demo buttons outside production |

## What the code already does
- Production mode refuses to start without `CW_SECRET`, creates no demo accounts, and returns no demo sign-in list (tested in a separate process).
- Password rules, password change, admin-created users, lockout after five wrong passwords, an audit log, and security headers (`nosniff`, no framing, same-origin referrer).
- Photos are checked by their first bytes and size, not their name.
- `backend/backup_db.py` makes a safe copy of the database while it runs (tested). Photos are separate: copy `/data/uploads` too.

## What it does not do, and you must provide
- **HTTPS.** The container speaks plain HTTP. Put it behind a host or proxy that terminates TLS (most hosts do). Without HTTPS, passwords cross the network in the clear.
- **A persistent volume.** Without one, every restart deletes all accounts and field checks.
- **Backups.** Schedule `backup_db.py` and copy the files off the machine.
- **A content-security policy.** Not set, because the map library needs inline styles and workers. Add one only after testing the map.
- **Rate limiting beyond sign-in.** Only sign-in is limited. Put a proxy rate limit in front for the rest.
- **Multiple copies.** The lockout counter is kept in memory, so run one instance, or move it to a shared store first.

## Data protection
The database holds names and emails of officers and any farmer accounts you create, plus field-check notes. Create farmer accounts only with consent, store no phone numbers or ID numbers, and treat the admin account like a key. India's Digital Personal Data Protection Act, 2023, applies; confirm duties with a mentor before real use.

## Before pointing real users at it
1. Build the image and read the build output.
2. Start it with a fresh volume. Sign in as admin. Create a test officer.
3. Check `/api/demo-accounts` returns an empty list.
4. Restart the container and confirm the account is still there.
5. Run `backup_db.py` inside the container and copy the file out.
