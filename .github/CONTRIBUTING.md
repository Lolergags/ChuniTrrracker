# Contribution & Git Workflow Policy

This repository enforces workflow policies to maintain codebase quality, branch isolation, and automated deployment safety.

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

## 🤖 AI Agent Workflow Rules (Specific to AI Coding Assistants & Bots)

* **Explicit User Authorization Required**: AI agents and automated assistants MUST NOT automatically open Pull Requests (`gh pr create`) or merge branches into `main` after completing work on a feature branch.
* **Approvals vs. PR Directives**: User approval of an audit report, design proposal, or implementation plan does NOT grant permission to open a Pull Request.
* **Explicit Directive**: An AI agent may ONLY create a Pull Request when the user explicitly requests it in a prompt (e.g. *"make a pull request and push to main"*).
* Feature branch commits MUST remain strictly isolated on their feature branch until that explicit directive is given.

## ✅ Human Contributor Guidelines

Human contributors opening manual PRs should follow standard git etiquette:
1. Work on a feature branch (`feat/*`, `fix/*`, `refactor/*`).
2. Ensure `npm run test:all` passes cleanly locally.
3. Open a Pull Request on GitHub when ready for review.
