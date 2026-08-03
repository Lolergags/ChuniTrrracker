---
name: docker-deploy
description: Deployment runbook for building Docker production images, validating exit codes for container restart policies, and deploying to Unraid NAS.
---

# Docker & Unraid Deployment Checklist

Use this skill when preparing production builds, updating Dockerfiles, or configuring container lifecycle managers.

## Production Build & Container Verification

### 1. Production Bundle Build
* Run `npm run build` (`tsc -b && vite build`) to verify that the TypeScript project compiles cleanly and outputs static bundle artifacts into `dist/`.

### 2. Docker Restart Exit Code Policy (Exit Code 100)
* Under Docker's `--restart=on-failure` policy (standard on Unraid NAS), `process.exit(0)` signals an intentional clean shutdown and will leave the container stopped.
* Always signal unclean restarts by calling `process.exit(100)` in app updater or restart manager code to force Unraid / Docker supervisors to immediately reboot the container.

### 3. SQLite Volume Persistence
* Verify Docker volume mounts map the persistent SQLite database directory (e.g. `/app/data/chunitrrracker.db`) outside the container to survive container updates.
