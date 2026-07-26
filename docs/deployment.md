# Deployment

Target: a single EC2 instance running the Compose stack, images built in CI and pulled
from GHCR. Serves plain HTTP by default, or HTTPS via Caddy once a `DOMAIN` variable is
set — see [HTTP or HTTPS](#http-or-https).

## Why images are built in CI, not on the server

`docker compose build` compiles the .NET solution and the Vite bundle. On a 2 GiB
instance that reliably thrashes or OOMs. The `Deploy` workflow builds both images on a
GitHub runner, pushes them to GHCR, and the EC2 only ever runs `docker pull` — so the
instance is sized for *running* the stack, not for building it.

## Workflows

| Workflow | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/ci.yml` | push to `master`/`quanhvo`, PR to `master`, manual | Backend build + test; frontend lint + test + build; validates `docker-compose.yml` and `nginx.conf`, and builds both images without pushing |
| `.github/workflows/deploy.yml` | manual (`workflow_dispatch`) | Builds and pushes `tripplanner-api` + `tripplanner-web` to GHCR, then SSHes to EC2, pins the repo to the deployed SHA, pulls the images, restarts the stack, waits for all four services to report healthy, and smoke-tests the public URL |

Deploy is deliberately **manual**. To make it automatic on every `master` push, add a
`push: branches: [master]` trigger to `deploy.yml`.

`ci.yml` closes the "no CI gate on the Docker artifacts" gap recorded in
`_bmad-output/implementation-artifacts/deferred-work.md`: a project rename that breaks
`BE/Dockerfile`'s hardcoded csproj list now fails CI instead of passing it.

> **`.github` used to be gitignored.** Root `.gitignore` listed `.github`, so
> `ci.yml` existed locally but was never committed and GitHub Actions never ran it.
> That entry is now removed — do not re-add it.

## Required GitHub secrets

Settings → Secrets and variables → Actions:

| Secret | Example | Notes |
| --- | --- | --- |
| `EC2_HOST` | `13.229.x.x` | Elastic IP or DNS name |
| `EC2_USER` | `ubuntu` | `ec2-user` on Amazon Linux |
| `EC2_SSH_KEY` | *(full private key)* | Contents of the `.pem`, including the BEGIN/END lines |
| `EC2_APP_DIR` | `~/TripPlanner` | Optional; defaults to `~/TripPlanner` |

`GITHUB_TOKEN` is provided automatically and is what both the runner and the EC2 use to
authenticate to GHCR, so **no personal access token is needed** and GHCR packages can
stay private.

The deploy job references an `environment: production`, which GitHub creates on first
run. Add a required reviewer there if you want an approval gate before each deploy.

## One-time server preparation

Use `scripts/ec2-bootstrap.sh`. On a fresh Ubuntu 24.04 instance, as the default
`ubuntu` user:

```bash
curl -fsSL https://raw.githubusercontent.com/HongQuan78/TripPlanner/master/scripts/ec2-bootstrap.sh -o bootstrap.sh
less bootstrap.sh      # read it before running anything as root
bash bootstrap.sh
```

It is idempotent — safe to re-run — and does the following:

| Step | Behaviour |
| --- | --- |
| Docker | Installs via `get.docker.com` if absent, adds the user to the `docker` group, enables the service on boot |
| Log rotation | Writes `/etc/docker/daemon.json` capping logs at 10m × 3 per container. **Skips** if the file already exists rather than clobbering it |
| Swap | Creates 2 GiB only when RAM < ~4 GiB and no swap exists |
| Repo | Clones, or fetches and hard-resets an existing checkout to `origin/$BRANCH` |
| `.env` | Copies from `.env.production.example`, generates a 40-char `POSTGRES_PASSWORD` and 64-char `JwtSettings__SecretKey` (alphanumeric only, so nothing can break the connection string), and sets `EmailSettings__VerificationUrlBase` from the instance's public IP via IMDSv2. **Never overwrites an existing `.env`** |
| Backups | Writes `~/backup-db.sh` and a nightly cron at 19:00 UTC keeping 7 days of `pg_dump` output |
| Summary | Prints exactly which `.env` values still need a human, chosen according to `EmailSettings__Provider`, plus the GitHub secret values to paste |

Tunable by environment variable: `BRANCH`, `APP_DIR`, `REPO_URL`, `BACKUP_DIR`,
`BACKUP_KEEP_DAYS`, and `DEPLOY_PUBLIC_KEY` (appended to `authorized_keys` if given).

What it deliberately does **not** do: start the stack. That is the deploy workflow's job,
so the instance never builds images. It also cannot invent the two secrets only you hold
— the OpenTripMap API key and the email provider credentials.

### Security group

Not scriptable from inside the instance. Required inbound rules:

| Port | Source | Why |
| --- | --- | --- |
| 22 | `0.0.0.0/0` | The deploy job SSHes **from a GitHub-hosted runner**, whose public IP is dynamic |
| 80 | `0.0.0.0/0` | Public traffic; in TLS mode still required, for the ACME HTTP-01 challenge and the HTTP→HTTPS redirect |
| 443 | `0.0.0.0/0` | Only in TLS mode |

**Never** open 5432 or 6379 — Postgres and Redis are reachable only inside the Compose
network.

Restricting 22 to your own IP breaks every deploy: the `Deploy over SSH` step hangs and
then fails. Whitelisting GitHub's ranges instead is not viable either — `api.github.com/meta`
publishes **7297** CIDRs for `actions` against a default quota of 60 rules per security
group.

Leaving 22 world-open is acceptable here because the Ubuntu AMI disables SSH password
authentication, so key-only auth is the sole path in. The production-grade alternative is
**AWS SSM Session Manager**, which needs no inbound port at all: attach an instance profile
with `AmazonSSMManagedInstanceCore` and replace the ssh step with `aws ssm send-command`
authenticated by OIDC. That is a meaningful rework of `deploy.yml`, deliberately not done
here.

`git reset --hard` in both the bootstrap and the deploy step only touches tracked files,
so `.env` survives every run.

### `.env` values that must not be left at their defaults

- `POSTGRES_PASSWORD`, `JwtSettings__SecretKey` (≥32 random chars), `OpenTripMapSettings__ApiKey`
- the selected email provider's credentials (`ResendSettings__ApiKey` or `GoogleSmtpSettings__*`)
- `EmailSettings__VerificationUrlBase` → `http://<ELASTIC_IP>/verify-email`. Left at
  `localhost`, every verification link mails users a dead URL.

`POSTGRES_DB/USER/PASSWORD` are honored **only** when the `pgdata` volume is first
initialized. Changing them later yields `28P01` and an API crash loop — rotate with
`ALTER ROLE` inside the `db` container instead.

## HTTP or HTTPS

The deploy picks its edge from a single repository **variable** (Settings → Secrets and
variables → Actions → *Variables*):

| `DOMAIN` | Overlay used | Edge |
| --- | --- | --- |
| unset | `docker-compose.http.yml` | nginx published directly on host port 80 |
| set | `docker-compose.tls.yml` | Caddy on 80/443, terminating TLS and proxying to `web:8080` |

Nothing else changes — same images, same `.env`, same workflow. Clearing the variable
reverts to plain HTTP on the next run.

### Enabling HTTPS

1. **Point a domain at the Elastic IP.** An `A` record for the apex (and `www` if wanted).
   Wait for it to resolve — `dig +short yourdomain.com` from anywhere must return the
   Elastic IP *before* the first TLS deploy, or the ACME challenge fails.
2. **Open 443** in the security group. Leave 80 open too; Caddy needs it for the HTTP-01
   challenge and to redirect.
3. **Add the repository variables:** `DOMAIN=yourdomain.com`, and optionally
   `ACME_EMAIL=you@example.com` (Let's Encrypt uses it for expiry warnings).
4. **Update `.env` on the instance** — `EmailSettings__VerificationUrlBase` must become
   `https://yourdomain.com/verify-email`, otherwise verification links keep pointing at
   the bare IP over HTTP.
5. Run the Deploy workflow. Caddy requests the certificate on startup and renews it
   automatically thereafter.

Certificates live in the `caddydata` named volume. **Do not destroy that volume
casually** — Let's Encrypt enforces a limit of 5 duplicate certificates per week, and
repeatedly recreating it will lock you out until the window rolls over.

### Why TLS terminates at Caddy and not in the API

`Program.cs` never calls `UseForwardedHeaders`, so `Request.Scheme` stays `http` no matter
what `X-Forwarded-Proto` says. `UseHttpsRedirection()` is a harmless no-op today only
because no HTTPS port is configured on the container. Configure one and the app will
redirect to a scheme it cannot see itself serving — an infinite loop. Keep the containers
plain HTTP and let the edge do TLS.

### Port mapping detail

In HTTP mode `web` publishes `80:8080` on top of the base `8080:8080`; both host ports
serve the same nginx and only 80 is reachable through the security group. In TLS mode the
`80:8080` binding is absent — Caddy owns host port 80 — while the base `8080:8080` stays
published but unreachable from outside, since the security group never opens 8080.

## Manual deploy / rollback

The workflow is the supported path, but the equivalent by hand:

```bash
cd ~/TripPlanner
export GHCR_OWNER=hongquan78 IMAGE_TAG=<short-sha>
docker compose -f docker-compose.yml -f docker-compose.deploy.yml pull
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --no-build
```

Every deploy tags images with the short SHA as well as `latest`, so rolling back is the
same two commands with an earlier `IMAGE_TAG`. Database migrations are **not** rolled
back — `Program.cs` applies them forward on startup and there is no down-migration path.

## Troubleshooting the first deploy

Work from the failing step name in the Actions log.

### `Deploy over SSH` — connection times out

Almost always the security group. Port 22 must accept `0.0.0.0/0`, not just your IP; see
the security-group section above. Then check, in order:

- `EC2_HOST` holds the **Elastic IP**, not the private `172.x` address
- the Elastic IP is actually *associated* with a **running** instance
- the instance is not stopped

### `Deploy over SSH` — `Permission denied (publickey)`

- `EC2_USER` is `ubuntu` for the Ubuntu AMI (`ec2-user` on Amazon Linux)
- `EC2_SSH_KEY` is the **entire** `.pem`, including `-----BEGIN…` and `-----END…` and a
  trailing newline. A truncated paste is the usual cause
- the key matches the key pair the instance was launched with

### `Deploy over SSH` — `Host key verification failed`

`ssh-keyscan` runs with `2>/dev/null`, so when the host is unreachable it fails silently
and leaves `known_hosts` empty; `BatchMode=yes` then refuses to connect. The real problem
is reachability — treat it as the timeout case above.

### GHCR `denied` / `403` when the instance pulls

The `deploy` job declares `packages: read` and logs in with `GITHUB_TOKEN`, so this should
not happen. If it does: repo → **Packages** → the package → *Package settings* → **Manage
Actions access**, and confirm the repository is listed. Packages pushed for the first time
occasionally need this link made explicitly.

### `Services did not become healthy in time`

The workflow prints `docker compose ps` and the last 80 lines of the `api` log before
failing. Identify which service is not `healthy`:

| Service | Likely cause |
| --- | --- |
| `db` | `POSTGRES_USER`/`POSTGRES_DB` empty in `.env`, degrading the healthcheck to `pg_isready -U -d`, which never reports healthy and blocks everything behind it |
| `api` | See below — nearly always `.env` |
| `web` | Waits on `api` being healthy; fix `api` first |

For `api`, run `docker compose logs api` on the box and match the message:

- **`28P01 password authentication failed`** — the `pgdata` volume was initialized with a
  different `POSTGRES_PASSWORD` than the one now in `.env`. Postgres honours those
  variables *only* on first initialization. Either `ALTER ROLE` inside the `db` container,
  or `docker compose down -v` to destroy the volume (**erases all data**).
- **A `Critical` log naming the connection string, repeating ~10 times 3s apart** — the
  migration retry loop cannot reach Postgres. Check `db` is healthy first.
- **Option binding failure at startup** — an empty `EmailSettings__TokenExpiryHours`.
  Compose substitutes a missing variable as an empty string, which takes precedence over
  the `24` in `appsettings.json` and then fails `int` binding. Any bare `${VAR}` in
  `docker-compose.yml` behaves this way, so read the `variable is not set` warnings that
  `docker compose up` prints.
- **`Cannot load library libgssapi_krb5.so.2`** — harmless noise from Npgsql probing for
  GSSAPI. Not your problem; keep reading the log.

### Smoke test fails while every service is healthy

Port 80 is not open to `0.0.0.0/0`. The smoke test runs from the GitHub runner, not from
your machine.

### TLS mode: `caddy` never becomes healthy, or HTTPS returns a certificate error

```bash
docker compose -f docker-compose.yml -f docker-compose.deploy.yml -f docker-compose.tls.yml \
  logs --tail 60 caddy
```

- **`no server name` / challenge failures** — DNS is not resolving to this instance yet.
  Verify with `dig +short yourdomain.com`; it must return the Elastic IP. Caddy retries
  with backoff, so fixing DNS eventually resolves it without a redeploy.
- **Timeout on the HTTP-01 challenge** — port 80 is closed in the security group. Caddy
  needs 80 open even though the site is served on 443.
- **`too many certificates already issued`** — the Let's Encrypt duplicate-certificate
  limit (5 per week) was hit, usually by destroying the `caddydata` volume repeatedly.
  Wait out the window, or add `acme_ca https://acme-staging-v02.api.letsencrypt.org/directory`
  to the global block in `Caddyfile` while debugging — staging certificates are untrusted
  by browsers but have far looser limits.
- **`DOMAIN` variable empty inside the container** — it is a repository *variable*, not a
  secret; a value put in the wrong place arrives empty and Caddy fails to parse the site
  block.

### The app works, but verification emails link to `localhost` or an old IP

`EmailSettings__VerificationUrlBase` was written before the Elastic IP was associated, so
the bootstrap script captured the instance's temporary address. Edit `~/TripPlanner/.env`,
then `docker compose up -d` to restart with the new value. Links already mailed stay dead.

### Diagnostics to run on the instance

```bash
cd ~/TripPlanner
docker compose ps
docker compose logs --tail 100 api
docker compose config | head -40      # shows what the variables actually resolved to
df -h /                               # image pulls filling the disk
free -m                               # swap in use on a 2 GiB box
```

### Rolling back

Every deploy tags images with the short SHA, so redeploy an earlier one:

```bash
export GHCR_OWNER=hongquan78 IMAGE_TAG=<earlier-short-sha>
docker compose -f docker-compose.yml -f docker-compose.deploy.yml pull
docker compose -f docker-compose.yml -f docker-compose.deploy.yml up -d --no-build
```

Database migrations do **not** roll back — `Program.cs` only applies them forward.

## Known gaps

- **Plain HTTP unless `DOMAIN` is set.** With no domain configured, JWTs and passwords
  travel in clear — fine for a demo, not for real use. See [HTTP or HTTPS](#http-or-https)
  to turn on Caddy.
- **The TLS path has never been executed.** The Caddy overlay, the Caddyfile, and the
  workflow's mode switch are all new and unrun; no domain has been pointed at the instance
  yet. Expect the first TLS deploy to need a round of debugging, most likely around DNS
  propagation or the ACME challenge.
- **Single point of failure.** One instance, no autoscaling, no multi-AZ.
- **No automated database backup.** Add a `pg_dump` cron and ship the dumps off-instance;
  the `pgdata` volume dies with the instance.
- **The GHCR token is passed to the remote as an env prefix on the ssh command**, so it
  is briefly visible in the instance's process list. Acceptable on a single-tenant box;
  it is a short-lived job token that the script logs out of when finished.
- **The deploy path has never been executed.** No EC2 instance exists yet, and the
  Compose config itself has not been run live since story 10-2 changed the Redis line.
  Treat the first run as a smoke test.
