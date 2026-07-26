# Deployment

Target: a single EC2 instance running the Compose stack, images built in CI and pulled
from GHCR. HTTP only (no domain/TLS yet).

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

The deploy workflow assumes the instance is already prepared:

1. Docker + the Compose plugin installed, and the login user in the `docker` group.
2. The repo cloned at `EC2_APP_DIR` with `origin` pointing at the GitHub remote.
3. A `.env` file in that directory, created from `.env.production.example` and filled in.
4. The deploy public key in `~/.ssh/authorized_keys`.
5. Security group: 22 from your IP only, 80 from anywhere. **Never** open 5432 or 6379.

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo systemctl enable --now docker
# log out and back in for the group to apply

git clone https://github.com/HongQuan78/TripPlanner.git ~/TripPlanner
cd ~/TripPlanner && git checkout quanhvo
cp .env.production.example .env && nano .env
```

`git reset --hard` in the deploy step only touches tracked files, so `.env` survives
every deploy.

### `.env` values that must not be left at their defaults

- `POSTGRES_PASSWORD`, `JwtSettings__SecretKey` (≥32 random chars), `OpenTripMapSettings__ApiKey`
- the selected email provider's credentials (`ResendSettings__ApiKey` or `GoogleSmtpSettings__*`)
- `EmailSettings__VerificationUrlBase` → `http://<ELASTIC_IP>/verify-email`. Left at
  `localhost`, every verification link mails users a dead URL.

`POSTGRES_DB/USER/PASSWORD` are honored **only** when the `pgdata` volume is first
initialized. Changing them later yields `28P01` and an API crash loop — rotate with
`ALTER ROLE` inside the `db` container instead.

## Port mapping

`docker-compose.deploy.yml` adds `80:8080` for the `web` service. Compose merges port
lists by appending, so the base `8080:8080` stays published too; both host ports serve
the same nginx. Only 80 is reachable if the security group is set as above.

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

## Known gaps

- **HTTP only.** JWTs and passwords travel in clear. Fine for a demo, not for real use.
  Adding TLS means terminating at a proxy in front (Caddy or an ALB) — and *never*
  configuring an HTTPS port on the container, because the API does not call
  `UseForwardedHeaders`, so `Request.Scheme` stays `http` and the redirect would loop.
- **Single point of failure.** One instance, no autoscaling, no multi-AZ.
- **No automated database backup.** Add a `pg_dump` cron and ship the dumps off-instance;
  the `pgdata` volume dies with the instance.
- **The GHCR token is passed to the remote as an env prefix on the ssh command**, so it
  is briefly visible in the instance's process list. Acceptable on a single-tenant box;
  it is a short-lived job token that the script logs out of when finished.
- **The deploy path has never been executed.** No EC2 instance exists yet, and the
  Compose config itself has not been run live since story 10-2 changed the Redis line.
  Treat the first run as a smoke test.
