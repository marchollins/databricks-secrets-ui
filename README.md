# Databricks Secrets UI

A lightweight local web UI for managing Databricks secrets via the Databricks CLI. No cloud dependency — it shells out to the `databricks` CLI you already have installed and authenticated.

## Features

- Browse and switch between secret scopes
- Add, edit, and delete secrets
- Manage ACLs (READ / WRITE / MANAGE) per scope
- Profile picker — detects all `~/.databrickscfg` profiles, auto-selects the authenticated default, and prompts you to log in if none are valid
- Active profile shown in the header with a one-click switcher

## Prerequisites

- [Databricks CLI](https://docs.databricks.com/dev-tools/cli/install.html) v0.200+ installed and on your `$PATH`
- At least one authenticated profile (`databricks auth login`)
- Node.js 18+

## Setup

```bash
npm install
npm start
```

Then open [http://localhost:3847](http://localhost:3847).

The port can be overridden with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Authentication

On startup the app reads `databricks auth profiles` and automatically connects using the first valid profile marked as default. If no authenticated profile exists, a picker is shown.

To authenticate a profile from your terminal:

```bash
databricks auth login -p <profile-name>
```

Then click **Retry** in the UI.

## Project structure

```
├── server.js        # Express API — shells out to the Databricks CLI
└── public/
    └── index.html   # Single-page vanilla JS frontend
```

## Secrets API coverage

| Operation | CLI command |
|---|---|
| List scopes | `databricks secrets list-scopes` |
| Create scope | `databricks secrets create-scope` |
| Delete scope | `databricks secrets delete-scope` |
| List secrets | `databricks secrets list-secrets` |
| Add / update secret | `databricks secrets put-secret` |
| Delete secret | `databricks secrets delete-secret` |
| List ACLs | `databricks secrets list-acls` |
| Add / update ACL | `databricks secrets put-acl` |
| Delete ACL | `databricks secrets delete-acl` |
