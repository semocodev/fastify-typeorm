import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { DataSource } from "typeorm";
import type { FastifyTypeormPluginOptions } from "./types.js";

// ─── Errors ────────────────────────────────────────────────────────────────────

const ERR_ALREADY_DECORATED =
	'[fastify-typeorm] "orm" is already decorated. ' +
	'Use the "namespace" option to register multiple DataSources.';

const errNamespaceConflict = (ns: string) =>
	`[fastify-typeorm] namespace "${ns}" is already registered on fastify.orm.`;

// ─── Plugin ────────────────────────────────────────────────────────────────────

const fastifyTypeormPlugin: FastifyPluginAsync<
	FastifyTypeormPluginOptions
> = async (
	// biome-ignore lint/suspicious/noExplicitAny: orm may be DataSource or Record depending on mode
	fastify: FastifyInstance & { orm?: any },
	options: FastifyTypeormPluginOptions,
) => {
	const { connection, namespace, ...dataSourceOptions } = options as {
		connection?: DataSource;
		namespace?: string;
		[key: string]: unknown;
	};

	// Resolve DataSource — accept a pre-built instance or build from options
	const dataSource: DataSource =
		connection instanceof DataSource
			? connection
			: new DataSource(
					dataSourceOptions as unknown as ConstructorParameters<
						typeof DataSource
					>[0],
				);

	if (!dataSource.isInitialized) {
		await dataSource.initialize();
	}

	// Graceful shutdown — runs for every registered DataSource
	fastify.addHook("onClose", async () => {
		if (dataSource.isInitialized) {
			await dataSource.destroy();
		}
	});

	if (typeof namespace === "string" && namespace !== "") {
		// ── Namespaced mode ──────────────────────────────────────────────────────
		if (!fastify.hasDecorator("orm")) {
			const ormMap: Record<string, DataSource> = Object.create(null) as Record<
				string,
				DataSource
			>;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			fastify.decorate("orm", ormMap);
		}

		const ormMap = fastify.orm as Record<string, DataSource>;

		if (namespace in ormMap) {
			throw new Error(errNamespaceConflict(namespace));
		}

		ormMap[namespace] = dataSource;
	} else {
		// ── Direct mode ──────────────────────────────────────────────────────────
		if (fastify.hasDecorator("orm")) {
			throw new Error(ERR_ALREADY_DECORATED);
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		fastify.decorate("orm", dataSource);
	}
};

// ─── Export ────────────────────────────────────────────────────────────────────

export default fp(fastifyTypeormPlugin, {
	fastify: ">=5",
	name: "@semocode/fastify-typeorm",
});
