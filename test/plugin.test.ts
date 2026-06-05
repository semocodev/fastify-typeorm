/**
 * Tests for @semocode/fastify-typeorm
 *
 * We mock DataSource at the typeorm module level to avoid needing
 * a real database driver in CI.
 */

import { describe, expect, test } from "@jest/globals";
import Fastify from "fastify";
import { DataSource } from "typeorm";
import fastifyTypeorm from "../src/plugin";

// ─── DataSource mock ──────────────────────────────────────────────────────────

interface MockDS {
	isInitialized: boolean;
	initialize: jest.Mock;
	destroy: jest.Mock;
}

function makeMockDataSource(alreadyInitialized = false): DataSource & MockDS {
	const ds: MockDS = {
		isInitialized: alreadyInitialized,
		initialize: jest.fn(async () => {
			ds.isInitialized = true;
		}),
		destroy: jest.fn(async () => {
			ds.isInitialized = false;
		}),
	};
	Object.setPrototypeOf(ds, DataSource.prototype);
	return ds as unknown as DataSource & MockDS;
}

// ─── Direct mode ──────────────────────────────────────────────────────────────

describe("direct mode (no namespace)", () => {
	test("decorates fastify.orm with the DataSource", async () => {
		const ds = makeMockDataSource();
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, { connection: ds });
		await fastify.ready();
		expect(fastify.orm).toBe(ds);
		await fastify.close();
	});

	test("calls initialize() when not yet initialized", async () => {
		const ds = makeMockDataSource(false);
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, { connection: ds });
		await fastify.ready();
		expect(ds.initialize).toHaveBeenCalledTimes(1);
		expect(ds.isInitialized).toBe(true);
		await fastify.close();
	});

	test("skips initialize() when already initialized", async () => {
		const ds = makeMockDataSource(true);
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, { connection: ds });
		await fastify.ready();
		expect(ds.initialize).not.toHaveBeenCalled();
		await fastify.close();
	});

	test("calls destroy() on fastify.close()", async () => {
		const ds = makeMockDataSource();
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, { connection: ds });
		await fastify.ready();
		await fastify.close();
		expect(ds.destroy).toHaveBeenCalledTimes(1);
		expect(ds.isInitialized).toBe(false);
	});

	test("skips destroy() on close if DataSource is already destroyed", async () => {
		const ds = makeMockDataSource();
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, { connection: ds });
		await fastify.ready();
		await ds.destroy();
		(ds.destroy as jest.Mock).mockClear();
		await fastify.close();
		expect(ds.destroy).not.toHaveBeenCalled();
	});

	test('throws when "orm" is already decorated', async () => {
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, {
			connection: makeMockDataSource(),
		});
		await expect(
			fastify.register(fastifyTypeorm, { connection: makeMockDataSource() }),
		).rejects.toThrow(/already decorated/);
	});
});

// ─── Namespaced mode ──────────────────────────────────────────────────────────

describe("namespaced mode", () => {
	test("decorates fastify.orm[namespace] with the DataSource", async () => {
		const ds = makeMockDataSource();
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, {
			connection: ds,
			namespace: "primary",
		});
		await fastify.ready();
		const orm = fastify.orm as Record<string, DataSource>;
		expect(orm.primary).toBe(ds);
		await fastify.close();
	});

	test("supports multiple namespaces simultaneously", async () => {
		const ds1 = makeMockDataSource();
		const ds2 = makeMockDataSource();
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, {
			connection: ds1,
			namespace: "db1",
		});
		await fastify.register(fastifyTypeorm, {
			connection: ds2,
			namespace: "db2",
		});
		await fastify.ready();
		const orm = fastify.orm as Record<string, DataSource>;
		expect(orm.db1).toBe(ds1);
		expect(orm.db2).toBe(ds2);
		expect(orm.db1).not.toBe(orm.db2);
		await fastify.close();
	});

	test("calls initialize() for each namespace", async () => {
		const ds1 = makeMockDataSource(false);
		const ds2 = makeMockDataSource(false);
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, { connection: ds1, namespace: "a" });
		await fastify.register(fastifyTypeorm, { connection: ds2, namespace: "b" });
		await fastify.ready();
		expect(ds1.initialize).toHaveBeenCalledTimes(1);
		expect(ds2.initialize).toHaveBeenCalledTimes(1);
		await fastify.close();
	});

	test("destroys all namespaced DataSources on fastify.close()", async () => {
		const ds1 = makeMockDataSource();
		const ds2 = makeMockDataSource();
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, { connection: ds1, namespace: "a" });
		await fastify.register(fastifyTypeorm, { connection: ds2, namespace: "b" });
		await fastify.ready();
		await fastify.close();
		expect(ds1.destroy).toHaveBeenCalledTimes(1);
		expect(ds2.destroy).toHaveBeenCalledTimes(1);
	});

	test("throws on duplicate namespace registration", async () => {
		const fastify = Fastify();
		await fastify.register(fastifyTypeorm, {
			connection: makeMockDataSource(),
			namespace: "primary",
		});
		await expect(
			fastify.register(fastifyTypeorm, {
				connection: makeMockDataSource(),
				namespace: "primary",
			}),
		).rejects.toThrow(/namespace "primary" is already registered/);
	});
});
