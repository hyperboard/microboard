# Microboard

Microboard is a framework-agnostic interactive whiteboard library published as an npm package from this repository.

## Release And Integration Contract

This repository publishes from the long-lived `trunk` branch. Every push to `trunk` runs [`.github/workflows/npm-publish.yml`](.github/workflows/npm-publish.yml). After a successful publish, the workflow emits the `microboard_published` event to both downstream consumers when their repository variables and dispatch tokens are configured, so their staging environments can validate against the latest shared core.

The source of truth for that contract is [`docs/npm-publish-integration-contract.md`](docs/npm-publish-integration-contract.md).

That document defines:

- what constitutes a successful publish
- the event emitted after publish
- the payload sent to downstream repositories
- required GitHub secrets, variables, and token permissions
- the shared operational checklist for cross-repository communication

## Local Commands

```bash
bun install
bun run build
bun test
eslint src/**/*.{ts,tsx}
```
