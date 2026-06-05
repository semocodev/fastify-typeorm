import type { DataSource, DataSourceOptions } from "typeorm";

// ─── Plugin options ────────────────────────────────────────────────────────────

/**
 * Base options shared by both modes.
 * Pass either a pre-built `DataSource` via `connection`,
 * or raw `DataSourceOptions` (the plugin calls `new DataSource(opts).initialize()`).
 */
type BaseOptions =
	| { connection: DataSource; [key: string]: unknown }
	| ({ connection?: never } & DataSourceOptions);

/**
 * Options for registering **without** a namespace.
 * Decorates `fastify.orm` as a `DataSource` directly.
 */
export type FastifyTypeormOptions = BaseOptions & { namespace?: never };

/**
 * Options for registering **with** a namespace.
 * Decorates `fastify.orm[namespace]` as a `DataSource`.
 */
export type FastifyTypeormNamespacedOptions = BaseOptions & {
	namespace: string;
};

/**
 * Combined options — accepted by the plugin in both modes.
 */
export type FastifyTypeormPluginOptions =
	| FastifyTypeormOptions
	| FastifyTypeormNamespacedOptions;

// ─── Typed accessor helpers ────────────────────────────────────────────────────

/**
 * Use this interface in your own route plugins for stronger typing
 * when registering **without** a namespace.
 *
 * @example
 * function myPlugin(fastify: FastifyInstance & FastifyTypeormDirect) {
 *   fastify.orm.getRepository(User)
 * }
 */
export interface FastifyTypeormDirect {
	orm: DataSource;
}

/**
 * Use this interface in your own route plugins for stronger typing
 * when registering **with** namespaces.
 *
 * @example
 * function myPlugin(fastify: FastifyInstance & FastifyTypeormNamespaced) {
 *   fastify.orm['primary'].getRepository(User)
 * }
 */
export interface FastifyTypeormNamespaced {
	orm: Record<string, DataSource>;
}

// ─── FastifyInstance augmentation ──────────────────────────────────────────────
//
// The `orm` decorator is typed as `unknown` here to avoid the union type clash
// between `DataSource` (direct mode) and `Record<string, DataSource>` (namespaced mode).
// Use `FastifyTypeormDirect` or `FastifyTypeormNamespaced` for stronger typed access.

declare module "fastify" {
	interface FastifyInstance {
		/**
		 * TypeORM DataSource decorated by @semocode/fastify-typeorm.
		 *
		 * - **Direct mode** (no namespace): cast to `DataSource`
		 *   or use `FastifyTypeormDirect` interface.
		 * - **Namespace mode**: cast to `Record<string, DataSource>`
		 *   or use `FastifyTypeormNamespaced` interface.
		 */
		orm: DataSource | Record<string, DataSource>;
	}
}
