import type { DataSourceOptions } from 'typeorm'

/**
 * Picks only non-sensitive connection fields — never password, URL or
 * driver extras, which may carry credentials.
 */
function sanitizeConnectionDetails(
  options: DataSourceOptions | undefined
): Record<string, unknown> {
  const opts = (options ?? {}) as unknown as Record<string, unknown>
  return {
    type: opts.type,
    host: opts.host,
    port: opts.port,
    database: opts.database,
    username: opts.username
  }
}

/**
 * Thrown when the DataSource cannot be initialized. `cause` holds the
 * original driver error; `connectionDetails` is safe to log.
 */
export class TypeormPluginError extends Error {
  readonly connectionDetails: Record<string, unknown>

  constructor(
    message: string,
    options: DataSourceOptions | undefined,
    cause: unknown
  ) {
    super(message, { cause })
    this.name = 'TypeormPluginError'
    this.connectionDetails = sanitizeConnectionDetails(options)
  }
}
