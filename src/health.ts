import type { DataSource } from 'typeorm'

function healthCheckQuery(dbType: string): string | null {
  switch (dbType) {
    case 'oracle':
      return 'SELECT 1 FROM DUAL'
    case 'sap':
      return 'SELECT now() FROM dummy'
    case 'mongodb':
      return null
    default:
      return 'SELECT 1'
  }
}

/**
 * Pings the database. Resolves `true` when the DataSource is initialized and
 * answers a trivial query, `false` otherwise. Never throws — meant for
 * readiness/liveness probes.
 *
 * MongoDB has no SQL ping, so there only `isInitialized` is checked.
 */
export async function healthCheck(dataSource: DataSource): Promise<boolean> {
  if (!dataSource.isInitialized) return false
  try {
    const query = healthCheckQuery(dataSource.options.type)
    if (query) await dataSource.query(query)
    return true
  } catch {
    return false
  }
}
