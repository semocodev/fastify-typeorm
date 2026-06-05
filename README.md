# @semocode/fastify-typeorm

[![npm version](https://img.shields.io/npm/v/@semocode/fastify-typeorm.svg)](https://www.npmjs.com/package/@semocode/fastify-typeorm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Fastify v5 plugin for TypeORM 1.x. Decorates your Fastify instance with one or more TypeORM `DataSource` instances, with graceful shutdown on `fastify.close()`.

---

## Requirements

| Peer dependency | Version    |
| --------------- | ---------- |
| `fastify`       | `>=5.0.0`  |
| `typeorm`       | `>=1.0.0`  |
| Node.js         | `>=22.0.0` |

---

## Installation

```bash
npm install @semocode/fastify-typeorm typeorm fastify
# plus your database driver, e.g.:
npm install pg              # PostgreSQL
npm install mysql2          # MySQL / MariaDB
npm install better-sqlite3  # SQLite
```

> **Note:** TypeORM requires `reflect-metadata`. Import it once at the top of your app entry point **before** any entity imports:
> ```ts
> import 'reflect-metadata'
> ```

---

## Usage

### Single DataSource (direct mode)

Pass `DataSourceOptions` directly or a pre-built `DataSource` via `connection`.
`fastify.orm` is the `DataSource` instance.

```ts
import 'reflect-metadata'
import Fastify from 'fastify'
import fastifyTypeorm from '@semocode/fastify-typeorm'
import { User } from './entities/User.js'

const fastify = Fastify()

// From options — plugin calls new DataSource(opts).initialize()
await fastify.register(fastifyTypeorm, {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'app',
  password: 'secret',
  database: 'mydb',
  entities: [User],
  synchronize: false,
})

fastify.get('/users', async () => {
  return fastify.orm.getRepository(User).find()
})

await fastify.listen({ port: 3000 })
```

### Pre-built DataSource

```ts
import { DataSource } from 'typeorm'

const dataSource = new DataSource({
  type: 'postgres',
  // ...
})

await fastify.register(fastifyTypeorm, { connection: dataSource })
```

The plugin calls `initialize()` only if the DataSource is not yet initialized.

---

### Multiple DataSources (namespace mode)

Use the `namespace` option. `fastify.orm[namespace]` returns the corresponding `DataSource`.

```ts
import 'reflect-metadata'
import Fastify from 'fastify'
import fastifyTypeorm from '@semocode/fastify-typeorm'

const fastify = Fastify()

await fastify.register(fastifyTypeorm, {
  namespace: 'primary',
  type: 'postgres',
  host: 'localhost',
  database: 'main_db',
  entities: [User],
})

await fastify.register(fastifyTypeorm, {
  namespace: 'analytics',
  type: 'postgres',
  host: 'analytics-host',
  database: 'analytics_db',
  entities: [Event],
})

fastify.get('/report', async () => {
  const users = await fastify.orm['primary'].getRepository(User).find()
  const events = await fastify.orm['analytics'].getRepository(Event).find()
  return { users, events }
})
```

---

## TypeScript

The module augments `FastifyInstance` with:

```ts
interface FastifyInstance {
  orm: DataSource | Record<string, DataSource>
}
```

For direct mode, `fastify.orm` is typed as `DataSource`.
For namespaced mode, use `fastify.orm['namespace']` — typed as `DataSource`.

The package also exports helper interfaces if you want stronger typing in your own code:

```ts
import type {
  FastifyTypeormDirect,
  FastifyTypeormNamespaced,
} from '@semocode/fastify-typeorm'

// Direct mode — use this in route handlers or plugins that expect orm to be a DataSource
function myPlugin(fastify: FastifyInstance & FastifyTypeormDirect) {
  fastify.orm.getRepository(User) // typed as DataSource
}

// Namespaced mode
function myOtherPlugin(fastify: FastifyInstance & FastifyTypeormNamespaced) {
  fastify.orm['primary'] // typed as DataSource
}
```

---

## Plugin registration

This plugin is wrapped with [`fastify-plugin`](https://github.com/fastify/fastify-plugin), which means it **breaks encapsulation**: the `fastify.orm` decorator is available on the root instance and all child scopes, regardless of where `register()` is called.

```ts
// Even registered inside a scoped plugin, orm is visible everywhere
await fastify.register(async (app) => {
  await app.register(fastifyTypeorm, { type: 'sqlite', database: ':memory:' })
  // app.orm is accessible here...
})

// ...and also here, on the parent scope
fastify.get('/ping', async () => fastify.orm.isInitialized)
```

> **Note:** Fastify processes `register()` calls asynchronously. Always `await fastify.ready()` (or `await fastify.listen()`) before accessing `fastify.orm` outside a route or hook handler.

```ts
await fastify.register(fastifyTypeorm, { /* opts */ })
await fastify.ready() // ensures the plugin has finished initializing

console.log(fastify.orm.isInitialized) // true
```

---

## Graceful shutdown

All registered DataSources are automatically destroyed when `fastify.close()` is called (via the `onClose` hook), including in namespaced mode.

---

## Differences from `fastify-typeorm-plugin` (inthepocket)

| Feature              | `inthepocket/fastify-typeorm-plugin` | `@semocode/fastify-typeorm` |
| -------------------- | ------------------------------------ | --------------------------- |
| TypeORM API          | `createConnection()` (removed in v1) | `DataSource` (v1.x)         |
| Fastify version      | v3/v4                                | v5+                         |
| Namespace support    | ❌                                    | ✅                           |
| Pre-built DataSource | ❌                                    | ✅                           |
| TypeScript-first     | Partial                              | ✅ Full                      |
| Maintained           | ❌ Archived                           | ✅                           |

---

## License

MIT
