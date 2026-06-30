# UI Check Workbench

Request ID: `REQ-UI-CHECK-WORKBENCH-001`

Decision ID: `D-UI-CHECK-WORKBENCH-001`

`tools/ui-check/` is a local development workbench for quick visual inspection of small Rouault UI fragments. It is intentionally scoped as an auxiliary surface for observation, state comparison, and screenshot collection.

It is not a specification source, contract test, CI acceptance gate, screenshot regression baseline, Storybook replacement, `content/testing/` replacement, or `test/e2e` replacement.

When a behavior, DOM shape, CSS token contract, accessibility meaning, or visual guarantee should become formal, promote it out of this workbench into the existing ownership area: `docs/contracts/`, `docs/design-system/`, `test/ssr`, `test/browser`, or `test/e2e`.

## Usage

```powershell
pnpm ui:check
```

Open:

```text
http://127.0.0.1:5174/tools/ui-check/
```

Collect review screenshots:

```powershell
pnpm ui:screenshot
```

Screenshots and Playwright auxiliary output are written under `.generated/ui-check/`. They are review artifacts, not repository truth or contract documents.

## Boundaries

- The Vite dev server keeps the repository root as the root, so the workbench entry URL is `/tools/ui-check/`.
- `ui-check-entry.ts` imports the production CSS entry, `../../src/assets/css/main.css`.
- Case pages do not load case-specific CSS bundles or individual component CSS files.
- The workbench does not import `src/client.ts` and does not connect to router, search, Pagefind, navigation artifacts, permalink, note source root, or publication surfaces.
- `tools/ui-check/**/*.ts` belongs to `tsconfig.node.json` because this directory mixes browser entry files with Node-oriented config and Playwright helper code.
- TypeScript imports in this area should use relative paths rather than the `@` alias. Relative TypeScript module imports should use `.js` extensions; Vite asset imports should keep their real extension.

