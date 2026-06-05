# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build          # tsc → dist/
npm test               # jest with coverage (enforces thresholds)
npm run test:watch     # jest in watch mode
npm run lint           # eslint src test

# Run a single test by name
npx jest --config jest.config.mjs -t "test name pattern"
```

Coverage thresholds (enforced by jest): branches 90%, functions 100%, lines/statements 95%.

## Architecture

Single-file Fastify plugin (`src/plugin.ts`) wrapped with `fastify-plugin` so decorations are shared across the encapsulation boundary.

**Two registration modes:**

- **Direct** — no `namespace` option → `fastify.orm` is a `DataSource`
- **Namespaced** — `namespace: "name"` option → `fastify.orm["name"]` is a `DataSource`; the `orm` map is lazily created on first namespaced registration

Both modes call `dataSource.initialize()` only if not yet initialized, and register an `onClose` hook to call `dataSource.destroy()`.

**Source layout:**
- `src/types.ts` — all exported types + `declare module "fastify"` augmentation. The `FastifyInstance.orm` field is typed as `DataSource | Record<string, DataSource>` (loose union); use `FastifyTypeormDirect` / `FastifyTypeormNamespaced` helper interfaces for stronger typing in consumer code.
- `src/plugin.ts` — plugin implementation
- `src/index.ts` — barrel re-export (no logic)

**Tests** (`test/plugin.test.ts`) mock `DataSource` via `Object.setPrototypeOf(ds, DataSource.prototype)` — no real database driver needed.

## Key constraints

- ESM package (`"type": "module"`); imports inside `src/` must use `.js` extensions (resolved to `.ts` at compile time via NodeNext).
- `experimentalDecorators` and `emitDecoratorMetadata` are enabled — consumers must `import 'reflect-metadata'` before any entity import.
- `tsconfig.test.json` is used by ts-jest (separate from the build tsconfig).
- Peer deps: `fastify >=5`, `typeorm >=1.0.0`, Node `>=22`.
