export { TypeormPluginError } from './errors.js'
export { healthCheck } from './health.js'
export { PinoTypeormLogger } from './logger.js'
export { default, default as fastifyTypeorm } from './plugin.js'

export type {
  FastifyTypeormDirect,
  FastifyTypeormNamespaced,
  FastifyTypeormNamespacedOptions,
  FastifyTypeormOptions,
  FastifyTypeormPluginOptions,
  RetryOptions
} from './types.js'
