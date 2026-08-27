import assert from "node:assert/strict";
import test from "node:test";
import { loadArticles } from "./articles.ts";

const originalFetch = globalThis.fetch;

function mockFetch(body: unknown, status = 200): void {
	globalThis.fetch = async () =>
		new Response(JSON.stringify(body), {
			status,
			statusText: status === 200 ? "OK" : "Service Unavailable",
			headers: { "content-type": "application/json" },
		});
}

function restoreFetch(): void {
	globalThis.fetch = originalFetch;
}

test.afterEach(restoreFetch);

test("loads valid articles", async () => {
	mockFetch([{ id: 1, title: "記事タイトル" }]);

	await assert.doesNotReject(loadArticles("/articles.json"));
});

test("rejects an empty article list", async () => {
	mockFetch([]);

	await assert.rejects(
		loadArticles("/articles.json"),
		/Invalid article format/,
	);
});

test("rejects invalid titles and duplicate IDs", async () => {
	mockFetch([
		{ id: 1, title: "   " },
		{ id: 1, title: "a".repeat(201) },
	]);

	await assert.rejects(
		loadArticles("/articles.json"),
		/Invalid article format/,
	);
});

test("rejects duplicate IDs", async () => {
	mockFetch([
		{ id: 1, title: "最初の記事" },
		{ id: 1, title: "次の記事" },
	]);

	await assert.rejects(
		loadArticles("/articles.json"),
		/Invalid article format/,
	);
});

test("rejects an HTTP error", async () => {
	mockFetch({ error: "unavailable" }, 503);

	await assert.rejects(loadArticles("/articles.json"), /HTTP 503/);
});
