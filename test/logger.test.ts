import { afterEach, describe, expect, jest, test } from '@jest/globals'
import Fastify, { type FastifyBaseLogger } from 'fastify'
import type { QueryRunner } from 'typeorm'
import { PinoTypeormLogger } from '../src/logger'
import fastifyTypeorm from '../src/plugin'
import { makeMockDataSource } from './helpers'

function fakePino() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  } as unknown as FastifyBaseLogger & Record<string, jest.Mock>
}

describe('PinoTypeormLogger', () => {
  test('emits nothing when logging is not enabled', () => {
    const pino = fakePino()
    new PinoTypeormLogger(pino).logQuery('SELECT 1')
    expect(pino.debug).not.toHaveBeenCalled()
  })

  test('routes queries to debug, with parameters', () => {
    const pino = fakePino()
    new PinoTypeormLogger(pino, ['query']).logQuery('SELECT $1', [1])
    expect(pino.debug).toHaveBeenCalledTimes(1)
    expect(String(pino.debug.mock.calls[0]?.[1])).toContain('SELECT $1')
  })

  test('routes errors, slow queries and info/warn/log to the right level', () => {
    const pino = fakePino()
    const logger = new PinoTypeormLogger(pino, 'all')
    logger.logQueryError('bad', 'SELECT x')
    logger.logQuerySlow(1500, 'SELECT slow')
    logger.logSchemaBuild('schema')
    logger.logMigration('mig')
    logger.log('info', 'hello')
    logger.log('warn', 'careful')
    logger.log('log', 'plain')
    for (const level of ['error', 'warn', 'info', 'debug'] as const) {
      expect(pino[level]).toHaveBeenCalled()
    }
  })

  test('adds only safe queryRunner context', () => {
    const pino = fakePino()
    const qr = {
      isTransactionActive: true,
      data: { requestId: 'r1' },
      connection: { huge: true }
    } as unknown as QueryRunner
    new PinoTypeormLogger(pino, ['query']).logQuery('SELECT 1', [], qr)
    expect(pino.debug.mock.calls[0]?.[0]).toEqual({
      prefix: 'query',
      queryRunner: { isTransactionActive: true, data: { requestId: 'r1' } }
    })
  })

  test('omits queryRunner context when there is nothing to report', () => {
    const pino = fakePino()
    const qr = {
      isTransactionActive: false,
      data: {}
    } as unknown as QueryRunner
    new PinoTypeormLogger(pino, ['query']).logQuery('SELECT 1', [], qr)
    expect(pino.debug.mock.calls[0]?.[0]).toEqual({ prefix: 'query' })
  })

  test('omits queryRunner context when queryRunner has no data', () => {
    const pino = fakePino()
    const qr = { isTransactionActive: false } as unknown as QueryRunner
    new PinoTypeormLogger(pino, ['query']).logQuery('SELECT 1', [], qr)
    expect(pino.debug.mock.calls[0]?.[0]).toEqual({ prefix: 'query' })
  })
})

describe('plugin logger wiring', () => {
  const env = process.env.NODE_ENV
  afterEach(() => {
    process.env.NODE_ENV = env
  })

  test('pre-built DataSource without logger gets the pino logger', async () => {
    const ds = makeMockDataSource({ type: 'postgres', logging: ['query'] })
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, { connection: ds })
    expect((ds as unknown as { logger: unknown }).logger).toBeInstanceOf(
      PinoTypeormLogger
    )
    await fastify.close()
  })

  test('pre-built DataSource with its own logger is left alone', async () => {
    const custom = { custom: true }
    const ds = makeMockDataSource({ type: 'postgres', logger: custom })
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, { connection: ds })
    expect((ds as unknown as { logger?: unknown }).logger).toBeUndefined()
    await fastify.close()
  })

  test('pre-built DataSource without options at all still works', async () => {
    const ds = makeMockDataSource()
    ;(ds as unknown as { options?: unknown }).options = undefined
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, { connection: ds })
    await fastify.close()
  })

  test('options mode builds the DataSource with the pino logger by default', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, {
      type: 'better-sqlite3',
      database: ':memory:',
      logging: ['query']
    })
    expect(fastify.orm.isInitialized).toBe(true)
    expect(fastify.orm.logger).toBeInstanceOf(PinoTypeormLogger)
    await fastify.orm.query('SELECT 1')
    await fastify.close()
  })

  test('options mode respects a custom logger', async () => {
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, {
      type: 'better-sqlite3',
      database: ':memory:',
      logger: 'simple-console'
    })
    expect(fastify.orm.logger).not.toBeInstanceOf(PinoTypeormLogger)
    await fastify.close()
  })

  test('warns about synchronize:true in production', async () => {
    process.env.NODE_ENV = 'production'
    const fastify = Fastify()
    const warn = jest.spyOn(fastify.log, 'warn')
    await fastify.register(fastifyTypeorm, {
      connection: makeMockDataSource({ type: 'postgres', synchronize: true })
    })
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('synchronize'))
    await fastify.close()
  })

  test('no synchronize warning outside production or when false', async () => {
    const fastify = Fastify()
    const warn = jest.spyOn(fastify.log, 'warn')
    await fastify.register(fastifyTypeorm, {
      connection: makeMockDataSource({ type: 'postgres', synchronize: true })
    })
    process.env.NODE_ENV = 'production'
    await fastify.register(fastifyTypeorm, {
      connection: makeMockDataSource({ type: 'postgres', synchronize: false }),
      namespace: 'x'
    })
    expect(warn).not.toHaveBeenCalled()
    await fastify.close()
  })
})
