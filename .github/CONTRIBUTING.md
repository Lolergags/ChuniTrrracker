# Contribution & Git Workflow Policy

This repository enforces strict workflow policies to maintain codebase quality, branch isolation, and automated deployment safety.

## 🌿 Branching Strategy

1. **`main` Branch Protection**:
   * The `main` branch is protected by GitHub Ruleset `Protect Main Branch` (ID: 20353275).
   * Direct pushes to `main` are blocked.
   * Required status check `test` (`npm run test:all`) MUST pass before any Pull Request can be merged.

2. **Feature Branch Isolation**:
   * All development MUST occur on isolated feature branches created from `main`.
   * Branch naming conventions:
     * `feat/<short-description>` for new features
     * `fix/<short-description>` for bug fixes
     * `refactor/<short-description>` for code refactoring
     * `workflow/<short-description>` for CI/CD or policy updates
     * `docs/<short-description>` for documentation changes

## 📝 Commit Conventions

* **No GPG Signing**: The development environment requires `--no-gpg-sign` for all `git commit` commands to avoid timeouts (`git commit --no-gpg-sign -m "..."`).
* **Standard Prefixes**:
  * `feat:` New feature or capability
  * `fix:` Bug fix or issue resolution
  * `docs:` Documentation or guideline updates
  * `test:` Automated unit test additions or updates
  * `refactor:` Code refactoring without behavioral changes
  * `workflow:` CI/CD pipeline or repository rule updates
  * `chore:` Maintenance tasks

## 🛑 Pull Request Policy (Strict Permission Requirement)

* **Explicit Authorization Required**: AI agents and automated tools MUST NOT automatically open Pull Requests (`gh pr create`) or merge branches into `main` after completing work on a feature branch.
* **Approval vs. Directive**: Approving an audit report, design proposal, or implementation plan does NOT constitute permission to open a Pull Request.
* **Explicit User Command**: A Pull Request may ONLY be created when the user explicitly requests it in a direct message (e.g. *"make a pull request and push to main"*).
* Feature branch commits MUST remain strictly isolated on their feature branch until that explicit directive is given.

## ✅ Verification Checklist Before PR Authorization

Before requesting a PR:
1. `npm run test:all` must pass 100% with zero errors across all vitest unit tests and oxlint checks.
2. New features or bug fixes must include corresponding automated unit tests.
3. Feature branch must be pushed to `origin/<branch-name>` for remote tracking.
