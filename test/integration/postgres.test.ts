/**
 * Integration tests against a real PostgreSQL.
 *
 *   docker run -d --name fastify-typeorm-pg -e POSTGRES_PASSWORD=secret \
 *     -e POSTGRES_DB=test -p 55432:5432 postgres:17-alpine
 *   npm run test:integration
 */
import 'reflect-metadata'
import { Writable } from 'node:stream'
import { describe, expect, test } from '@jest/globals'
import Fastify from 'fastify'
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { healthCheck, TypeormPluginError } from '../../src/index'
import fastifyTypeorm from '../../src/plugin'

const connection = {
  type: 'postgres' as const,
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 55432),
  username: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? 'secret',
  database: process.env.PGDATABASE ?? 'test'
}

@Entity('it_user')
class User {
  @PrimaryGeneratedColumn()
  id!: number

  @Column()
  name!: string
}

function logCapture() {
  const lines: Record<string, unknown>[] = []
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(String(chunk)))
      cb()
    }
  })
  return { lines, stream }
}

describe('postgres integration', () => {
  test('connects, queries, health-checks and shuts down', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, {
      ...connection,
      entities: [User],
      synchronize: true,
      dropSchema: true
    })
    await fastify.ready()

    expect(fastify.orm.isInitialized).toBe(true)
    expect(await healthCheck(fastify.orm)).toBe(true)

    const repo = fastify.orm.getRepository(User)
    await repo.save({ name: 'ada' })
    expect(await repo.count()).toBe(1)

    await fastify.close()
    expect(fastify.orm.isInitialized).toBe(false)
    expect(await healthCheck(fastify.orm)).toBe(false)
  })

  test('rolls back transactions', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, {
      ...connection,
      entities: [User],
      synchronize: true,
      dropSchema: true
    })
    await fastify.ready()
    await expect(
      fastify.orm.transaction(async m => {
        await m.save(User, { name: 'tmp' })
        throw new Error('rollback')
      })
    ).rejects.toThrow('rollback')
    expect(await fastify.orm.getRepository(User).count()).toBe(0)
    await fastify.close()
  })

  test('routes SQL logs through fastify pino', async () => {
    const { lines, stream } = logCapture()
    const fastify = Fastify({ logger: { level: 'debug', stream } })
    await fastify.register(fastifyTypeorm, {
      ...connection,
      logging: ['query']
    })
    await fastify.ready()
    await fastify.orm.query('SELECT 42 AS answer')
    await fastify.close()
    const entry = lines.find(l => String(l.msg).includes('SELECT 42'))
    expect(entry).toBeDefined()
    expect(entry?.level).toBe(20)
  })

  test('namespaced: two DataSources on the same server', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, { ...connection, namespace: 'a' })
    await fastify.register(fastifyTypeorm, { ...connection, namespace: 'b' })
    await fastify.ready()
    const orm = fastify.orm as unknown as Record<string, typeof fastify.orm>
    expect(await healthCheck(orm.a as never)).toBe(true)
    expect(await healthCheck(orm.b as never)).toBe(true)
    await fastify.close()
    expect(orm.a?.isInitialized).toBe(false)
    expect(orm.b?.isInitialized).toBe(false)
  })

  test('unreachable DB: retries, then TypeormPluginError without password', async () => {
    const fastify = Fastify()
    const start = Date.now()
    const err = await fastify
      .register(fastifyTypeorm, {
        ...connection,
        port: 1,
        retries: 2,
        retryDelay: 50
      })
      .then(
        () => undefined,
        (e: unknown) => e
      )
    expect(err).toBeInstanceOf(TypeormPluginError)
    const e = err as TypeormPluginError
    expect(e.message).toMatch(/after 3 attempt/)
    expect(JSON.stringify(e.connectionDetails)).not.toContain('secret')
    expect(e.connectionDetails.host).toBe(connection.host)
    expect(Date.now() - start).toBeGreaterThanOrEqual(150) // 50 + 100
  })

  test('wrong password: fails fast with cause', async () => {
    const fastify = Fastify()
    const err = await fastify
      .register(fastifyTypeorm, { ...connection, password: 'nope' })
      .then(
        () => undefined,
        (e: unknown) => e
      )
    expect(err).toBeInstanceOf(TypeormPluginError)
    expect(String((err as Error).cause)).toMatch(/password/i)
  })
})
