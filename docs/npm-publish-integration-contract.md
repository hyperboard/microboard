# NPM Publish And Downstream Notification Contract

This repository is the source of truth for shared application logic distributed as an npm package. The `trunk` branch is long-lived, and every push to `trunk` runs the publish workflow in [`.github/workflows/npm-publish.yml`](../.github/workflows/npm-publish.yml).

## Successful publish

A publish is considered successful only when the `publish` job in the `NPM Publish` workflow completes successfully.

That currently means all of the following happened in order:

1. Dependencies installed with `bun install`.
2. Package built with `bun run build`.
3. Test suite passed with `bun test`.
4. Version bump step produced a release version used for the publish.
5. Package metadata was captured from `package.json`.
6. `npm publish --provenance` completed successfully.

The workflow currently runs `bun run lint`, but that step is marked `continue-on-error: true`. Lint failures are therefore informational today and do not block publishing or downstream notifications.

## Event emitted after publish

After a successful publish, this repository emits the same GitHub `repository_dispatch` event to both downstream repositories:

- UI repository
- Backend repository

Event contract:

- Event type: `microboard_published`
- Trigger source: successful completion of the `publish` job
- Delivery mechanism: GitHub REST API `repos.createDispatchEvent`

The notifications are sent by the `notify-ui` and `notify-backend` jobs, both of which depend on the `publish` job.

If a downstream repository variable or dispatch token is not configured, the corresponding notification job logs a skip notice and does not fail the publish workflow.

## Payload sent to downstream repositories

Both downstream repositories receive the same `client_payload` object:

```json
{
  "package_name": "<npm package name>",
  "version": "<published package version>",
  "source_repository": "<owner/repo for this repository>",
  "source_ref": "trunk",
  "source_sha": "<commit SHA that triggered the workflow>",
  "workflow": "NPM Publish",
  "published_at": "<UTC timestamp in ISO-8601 format>"
}
```

Payload field definitions:

- `package_name`: package name read from `package.json`
- `version`: version emitted by the automated version bump step and published to npm
- `source_repository`: GitHub repository that performed the publish
- `source_ref`: branch ref that triggered the publish workflow
- `source_sha`: exact commit SHA associated with the publish
- `workflow`: GitHub Actions workflow name
- `published_at`: UTC timestamp captured immediately after `npm publish --provenance` succeeds

## Required credentials and permissions

### For npm publishing

This workflow is configured for npm trusted publishing via GitHub Actions OIDC rather than a long-lived npm publish token.

Required workflow permissions:

- `id-token: write`
- `contents: write`

Required npm-side configuration:

- npm trusted publisher must be configured for this repository and the exact workflow file name `.github/workflows/npm-publish.yml`

Reference:

- npm trusted publishing docs: https://docs.npmjs.com/trusted-publishers

### For downstream repository notifications

Each downstream notification requires a token that can call GitHub's `Create a repository dispatch event` endpoint on the target repository.

Required token capability:

- Repository permission `Contents: write` on the target repository

GitHub reference:

- Create a repository dispatch event: https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-a-repository-dispatch-event

Recommended token types:

- GitHub App installation token scoped to the target repository
- Fine-grained personal access token scoped only to the target repository

## Required GitHub secrets and variables

This repository should define the following configuration for cross-repository communication.

### Repository variables

- `UI_REPOSITORY`
  - Format: `owner/repo`
  - Example: `hyperboard/hyperboard-ui`
- `BACKEND_REPOSITORY`
  - Format: `owner/repo`
  - Example: `hyperboard/hyperboard-backend`

### Repository secrets

- `UI_REPOSITORY_DISPATCH_TOKEN`
  - Used by the `notify-ui` job
  - Must be authorized to send `repository_dispatch` to `UI_REPOSITORY`
- `BACKEND_REPOSITORY_DISPATCH_TOKEN`
  - Used by the `notify-backend` job
  - Must be authorized to send `repository_dispatch` to `BACKEND_REPOSITORY`

## Shared operational checklist

Use this checklist whenever setting up or auditing this repository's release integration.

- Confirm `trunk` is the only branch configured to trigger the publish workflow.
- Confirm npm trusted publishing is configured for this repository and `.github/workflows/npm-publish.yml`.
- Confirm GitHub Actions workflow permissions include `id-token: write`.
- Confirm `UI_REPOSITORY` and `BACKEND_REPOSITORY` repository variables are present and use `owner/repo` format if downstream notifications are expected.
- Confirm `UI_REPOSITORY_DISPATCH_TOKEN` and `BACKEND_REPOSITORY_DISPATCH_TOKEN` secrets exist if downstream notifications are expected.
- Confirm each dispatch token has `Contents: write` on its target repository and no broader scope than necessary.
- Confirm UI and backend repositories each listen for `repository_dispatch` with type `microboard_published`.
- Confirm UI and backend staging automation consumes `github.event.client_payload.version`.

## Downstream workflow expectation

Both downstream repositories should listen for the same dispatch event:

```yaml
on:
  repository_dispatch:
    types:
      - microboard_published
```

The published version is available at:

```yaml
${{ github.event.client_payload.version }}
```
