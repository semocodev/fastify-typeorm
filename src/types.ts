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
// The `orm` decorator is ambiently typed as `DataSource` — direct mode (no
// namespace) is by far the common case, so it gets zero-friction typing with
// no cast required at every call site. A single `declare module` block can't
// type `orm` conditionally on whether `namespace` was passed at a given
// `register()` call, so namespaced mode is the one that requires an explicit
// opt-in: intersect with `FastifyTypeormNamespaced` (or cast through
// `unknown`) wherever you access `fastify.orm[namespace]`.

declare module "fastify" {
	interface FastifyInstance {
		/**
		 * TypeORM DataSource decorated by @semocodev/fastify-typeorm.
		 *
		 * - **Direct mode** (no namespace): typed as `DataSource` already —
		 *   no cast needed.
		 * - **Namespace mode**: intersect with the `FastifyTypeormNamespaced`
		 *   interface (or cast through `unknown`) to access it as
		 *   `Record<string, DataSource>`.
		 */
		orm: DataSource;
	}
}
