import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { validateArticles } from "./article_validation.js";

function loadFixture(name: string): unknown {
	const fixturePath = path.join(process.cwd(), "scripts", "fixtures", name);
	return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

test("expects the current article source file to exist", () => {
	assert.equal(
		fs.existsSync(path.join(process.cwd(), "src", "articles.json")),
		true,
	);
});

test("accepts valid article fixture", () => {
	assert.deepEqual(validateArticles(loadFixture("articles.valid.json")), []);
});

test("reports every invalid article rule", () => {
	const errors = validateArticles(loadFixture("articles.invalid.json"));

	assert.deepEqual(errors, [
		"item[0] 'id' is not a positive safe integer",
		"item[1] 'title' is not a string",
		"item[2] 'title' must contain non-whitespace text and be at most 200 characters",
		"Duplicate id(s) found: [1]",
	]);
});

test("does not sanitize title content", () => {
	assert.deepEqual(
		validateArticles([{ id: 1, title: "<script>text</script>" }]),
		[],
	);
});
