# Contributing to SPS Studio

Thank you for considering a contribution to SPS Studio. This guide explains how to propose changes in a way that keeps the project secure, maintainable, and easy to review.

## Before You Start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Search existing issues and pull requests before opening a new one.
- Open an issue first for substantial features, architectural changes, or behavior changes so the approach can be discussed before implementation.
- Do not include passwords, API keys, customer data, production database exports, or other secrets in code, commits, screenshots, or issue reports.

## Local Setup

1. Fork the repository and create a branch from the default branch.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and configure only the services required for your work.
4. Use `DATABASE_URL=file:local.db` for local development unless you explicitly need a separate test database.
5. Start the application with `npm run dev`.

Local server output is written to `logs/server.out.log` and errors to `logs/server.err.log`. These files are intentionally ignored by Git.

## Development Guidelines

- Keep changes focused and avoid unrelated refactors in the same pull request.
- Preserve server-side authorization and validation; hiding a client-side control is not access control.
- Never expose secret keys or allow the browser to choose security-sensitive values such as invoice totals.
- Follow the existing React, TypeScript, and Tailwind patterns in the affected area.
- Keep user-facing text compatible with the project's localization approach.
- Update the root `CHANGELOG.md` for every user-visible feature, fix, removal, or behavior change. Add it to the current date under `New`, `Updated`, `Fixed`, or `Removed`.
- Update the README or other documentation whenever setup, environment variables, routes, or user-facing behavior changes.

## Verification

Before opening a pull request, run the checks relevant to your change:

```bash
npm run build
npm run audit:i18n
```

Manually verify the affected flow in a local browser session. For authorization, billing, client-data, or destructive-action changes, test both permitted and denied paths.

## Pull Requests

Include the following in the pull request description:

- A concise explanation of the problem and solution.
- Screenshots or a short recording for visible interface changes.
- The verification steps you performed and their results.
- Any new environment variables, migrations, configuration, or rollout steps.
- Linked issue(s), where applicable.

Use clear, descriptive commits. Keep the branch rebased or merged with the default branch when requested by a maintainer.

## Reporting Security Issues

Do not report security vulnerabilities through public issues. Contact the maintainers at [contact@spsstudio.com](mailto:contact@spsstudio.com) with a clear description, impact assessment, and safe reproduction steps.
