# NPM Publish UI Notification

This repository publishes the core package from `.github/workflows/npm-publish.yml`.

After a successful publish, the workflow sends a `repository_dispatch` event to the UI repository with the published package version.

## Required GitHub configuration

Set these values in this repository before relying on the automation:

### Repository variables

- `UI_REPOSITORY`
  - Format: `owner/repo`
  - Example: `hyperboard/hyperboard-ui`
  - Used by the `notify-ui` job to identify the target repository.

### Repository secrets

- `UI_REPOSITORY_DISPATCH_TOKEN`
  - A GitHub token that can call `repository_dispatch` on the UI repository.
  - Recommended: a fine-grained personal access token or GitHub App token scoped only to the target UI repository.
  - The token should have the minimum permissions required to dispatch the event to that repository.

## Event sent to the UI repository

The workflow sends:

- Event type: `microboard_published`

Payload fields:

- `package_name`
- `version`
- `source_repository`
- `source_sha`
- `workflow`

## What the UI repository must do

The UI repository needs its own workflow that listens for:

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

## Trigger behavior

- The notification job runs only after the publish job completes successfully.
- The workflow uses the version produced by the version bump step as the value sent to the UI repository.
