import { jest } from '@jest/globals'
import { DataSource } from 'typeorm'

export interface MockDS {
  isInitialized: boolean
  options: Record<string, unknown>
  initialize: jest.Mock
  destroy: jest.Mock
  query: jest.Mock
}

export function makeMockDataSource(
  options: Record<string, unknown> = { type: 'postgres' },
  initializeImpl?: () => Promise<void>
): DataSource & MockDS {
  const ds: MockDS = {
    isInitialized: false,
    options,
    initialize: jest.fn(
      initializeImpl ??
        (async () => {
          ds.isInitialized = true
        })
    ),
    destroy: jest.fn(async () => {
      ds.isInitialized = false
    }),
    query: jest.fn(async () => [])
  }
  Object.setPrototypeOf(ds, DataSource.prototype)
  return ds as unknown as DataSource & MockDS
}
