import { describe, expect, jest, test } from '@jest/globals'
import Fastify from 'fastify'
import { TypeormPluginError } from '../src/errors'
import fastifyTypeorm from '../src/plugin'
import { makeMockDataSource } from './helpers'

function failingThenOk(failures: number) {
  let calls = 0
  const ds = makeMockDataSource({ type: 'postgres' }, async () => {
    calls++
    if (calls <= failures) throw new Error(`boom ${calls}`)
    ds.isInitialized = true
  })
  return ds
}

describe('connection retry', () => {
  test('does not retry by default and wraps the error', async () => {
    const ds = failingThenOk(1)
    const fastify = Fastify()
    await expect(
      fastify.register(fastifyTypeorm, { connection: ds })
    ).rejects.toThrow(TypeormPluginError)
    expect(ds.initialize).toHaveBeenCalledTimes(1)
  })

  test('retries until initialize succeeds', async () => {
    const ds = failingThenOk(2)
    const fastify = Fastify()
    const warn = jest.spyOn(fastify.log, 'warn')
    await fastify.register(fastifyTypeorm, {
      connection: ds,
      retries: 3,
      retryDelay: 1
    })
    await fastify.ready()
    expect(ds.initialize).toHaveBeenCalledTimes(3)
    expect(warn).toHaveBeenCalledTimes(2)
    expect(fastify.orm).toBe(ds)
    await fastify.close()
  })

  test('uses exponential backoff', async () => {
    const ds = failingThenOk(2)
    const fastify = Fastify()
    const spy = jest.spyOn(globalThis, 'setTimeout')
    await fastify.register(fastifyTypeorm, {
      connection: ds,
      retries: 2,
      retryDelay: 5
    })
    const delays = spy.mock.calls
      .map(c => c[1])
      .filter(d => d === 5 || d === 10)
    expect(delays).toEqual([5, 10])
    spy.mockRestore()
    await fastify.close()
  })

  test('throws TypeormPluginError with cause and sanitized details after exhausting retries', async () => {
    const ds = makeMockDataSource(
      {
        type: 'postgres',
        host: 'db',
        port: 5432,
        database: 'app',
        username: 'u',
        password: 'secret',
        url: 'postgres://u:secret@db/app'
      },
      async () => {
        throw new Error('refused')
      }
    )
    const fastify = Fastify()
    const err = await fastify
      .register(fastifyTypeorm, { connection: ds, retries: 1, retryDelay: 1 })
      .then(
        () => undefined,
        (e: unknown) => e
      )
    expect(ds.initialize).toHaveBeenCalledTimes(2)
    expect(err).toBeInstanceOf(TypeormPluginError)
    const e = err as TypeormPluginError
    expect(e.name).toBe('TypeormPluginError')
    expect(e.message).toMatch(/after 2 attempt/)
    expect((e.cause as Error).message).toBe('refused')
    expect(e.connectionDetails).toEqual({
      type: 'postgres',
      host: 'db',
      port: 5432,
      database: 'app',
      username: 'u'
    })
    expect(JSON.stringify(e.connectionDetails)).not.toMatch(/secret/)
  })

  test('error details are empty when options are missing', () => {
    const e = new TypeormPluginError('x', undefined, null)
    expect(e.connectionDetails.type).toBeUndefined()
  })

  test('skips retry logic when already initialized', async () => {
    const ds = makeMockDataSource()
    ds.isInitialized = true
    const fastify = Fastify()
    await fastify.register(fastifyTypeorm, { connection: ds, retries: 3 })
    expect(ds.initialize).not.toHaveBeenCalled()
    await fastify.close()
  })
})
