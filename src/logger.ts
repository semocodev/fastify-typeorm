import type { FastifyBaseLogger } from 'fastify'
import type { LoggerOptions, LogLevel, LogMessage, QueryRunner } from 'typeorm'
import { AbstractLogger } from 'typeorm'

/**
 * Extracts serialization-safe metadata from a QueryRunner.
 *
 * A QueryRunner holds the whole DataSource, pool and driver — handing it to
 * pino as-is would produce huge output or circular-reference errors.
 */
function extractQueryRunnerContext(
  queryRunner: QueryRunner
): Record<string, unknown> | undefined {
  const context: Record<string, unknown> = {}

  if (queryRunner.isTransactionActive) {
    context.isTransactionActive = true
  }

  if (queryRunner.data && Object.keys(queryRunner.data).length > 0) {
    context.data = queryRunner.data
  }

  return Object.keys(context).length > 0 ? context : undefined
}

/**
 * TypeORM logger that routes database logs through Fastify's pino instance.
 * Extends `AbstractLogger`, so the `logging` option of the DataSource is
 * honoured automatically.
 *
 * The plugin uses it by default when no custom `logger` is provided.
 */
export class PinoTypeormLogger extends AbstractLogger {
  /**
   * @param pinoLogger - Fastify's pino logger.
   * @param options - Which log categories to emit; same value as
   *   `DataSourceOptions.logging`. When omitted nothing is emitted.
   */
  constructor(
    private readonly pinoLogger: FastifyBaseLogger,
    options?: LoggerOptions
  ) {
    super(options)
  }

  protected override writeLog(
    level: LogLevel,
    logMessage: LogMessage | string | number | (LogMessage | string | number)[],
    queryRunner?: QueryRunner
  ): void {
    const messages = this.prepareLogMessages(
      logMessage,
      {
        highlightSql: false,
        appendParameterAsComment: true,
        addColonToPrefix: false
      },
      queryRunner
    )

    const context = queryRunner
      ? extractQueryRunnerContext(queryRunner)
      : undefined

    for (const message of messages) {
      const entry: Record<string, unknown> = {}
      if (context) entry.queryRunner = context
      if (message.prefix) entry.prefix = message.prefix

      const text = String(message.message)

      switch (message.type ?? level) {
        case 'query':
        case 'log':
        case 'schema-build':
        case 'migration':
          this.pinoLogger.debug(entry, text)
          break
        case 'info':
          this.pinoLogger.info(entry, text)
          break
        case 'warn':
        case 'query-slow':
          this.pinoLogger.warn(entry, text)
          break
        case 'error':
        case 'query-error':
          this.pinoLogger.error(entry, text)
          break
      }
    }
  }
}
