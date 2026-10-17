import { describe, expect, test } from '@jest/globals'
import { healthCheck } from '../src/health'
import { makeMockDataSource } from './helpers'

describe('healthCheck', () => {
  test('false when not initialized, without querying', async () => {
    const ds = makeMockDataSource()
    expect(await healthCheck(ds)).toBe(false)
    expect(ds.query).not.toHaveBeenCalled()
  })

  test('true when query succeeds', async () => {
    const ds = makeMockDataSource()
    ds.isInitialized = true
    expect(await healthCheck(ds)).toBe(true)
    expect(ds.query).toHaveBeenCalledWith('SELECT 1')
  })

  test('false when query throws', async () => {
    const ds = makeMockDataSource()
    ds.isInitialized = true
    ds.query.mockRejectedValueOnce(new Error('down'))
    expect(await healthCheck(ds)).toBe(false)
  })

  test.each([
    ['oracle', 'SELECT 1 FROM DUAL'],
    ['sap', 'SELECT now() FROM dummy']
  ])('uses the %s ping query', async (type, sql) => {
    const ds = makeMockDataSource({ type })
    ds.isInitialized = true
    await healthCheck(ds)
    expect(ds.query).toHaveBeenCalledWith(sql)
  })

  test('mongodb: only checks isInitialized', async () => {
    const ds = makeMockDataSource({ type: 'mongodb' })
    ds.isInitialized = true
    expect(await healthCheck(ds)).toBe(true)
    expect(ds.query).not.toHaveBeenCalled()
  })
})
