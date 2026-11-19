# Changelog

All notable changes to this project are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Release tags have no `v` prefix.

## [1.0.1](https://github.com/semocodev/fastify-typeorm/compare/1.0.0...1.0.1) (2026-10-19)

### Build

* generate `CHANGELOG.md` automatically on `npm version` (Conventional Commits)

## [1.0.0] - 2026-10-18

### Added
- Connection retry on `dataSource.initialize()`.
- `PinoTypeormLogger`: routes TypeORM logs to `fastify.log`.
- `healthCheck(dataSource)` helper.
- `TypeormPluginError` with sanitized `connectionDetails` and `cause`.
- Postgres and MySQL integration tests (`npm run test:integration`).
- CI running build, lint, unit and integration tests on Node 22 and 24.

### Changed
- Errors no longer leak connection secrets.

### Documentation
- Document tag naming (no `v` prefix) and new modules in `CLAUDE.md`.

## [0.3.3] - 2026-10-18

### Changed
- Bump dependencies to latest minor/patch.

## [0.3.2] - 2026-09-18

### Changed
- Update dependencies; reformat for Biome 2.5 defaults.

### Documentation
- Sync README and `CLAUDE.md` with current plugin behavior.

## [0.3.1] - 2026-07-17

### Fixed
- Add `require` condition to `exports` map in `package.json`.

## [0.3.0] - 2026-07-17

### Fixed
- Types: stop unioning `fastify.orm` with `Record<string, DataSource>`.

## [0.2.0] - 2026-07-16

### Changed
- Update `fastify-plugin`, `typeorm`, `fastify`, Biome, `better-sqlite3`, `@types/node`.

> Legacy tag `v0.2.0` carries a `v` prefix by mistake.

## [0.1.1] - 2026-06-08

### Changed
- Rename package scope from `@semocode` to `@semocodev`.
- Upgrade Jest to v30; fix `tsconfig.test.json`.

## [0.1.0] - 2026-06-08

### Added
- Initial release: Fastify plugin exposing a TypeORM `DataSource`, direct and namespaced modes.

[1.0.0]: https://github.com/semocodev/fastify-typeorm/compare/0.3.3...1.0.0
[0.3.3]: https://github.com/semocodev/fastify-typeorm/compare/0.3.2...0.3.3
[0.3.2]: https://github.com/semocodev/fastify-typeorm/compare/0.3.1...0.3.2
[0.3.1]: https://github.com/semocodev/fastify-typeorm/compare/0.3.0...0.3.1
[0.3.0]: https://github.com/semocodev/fastify-typeorm/compare/v0.2.0...0.3.0
[0.2.0]: https://github.com/semocodev/fastify-typeorm/compare/0.1.1...v0.2.0
[0.1.1]: https://github.com/semocodev/fastify-typeorm/compare/0.1.0...0.1.1
[0.1.0]: https://github.com/semocodev/fastify-typeorm/releases/tag/0.1.0
