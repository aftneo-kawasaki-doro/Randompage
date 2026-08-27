import fs from "node:fs";
import path from "node:path";
import { validateArticles } from "./article_validation.js";

function getProjectRoot(): string {
	const projectRoot = process.env.PROJECT_ROOT;
	if (projectRoot && fs.existsSync(projectRoot)) {
		return projectRoot;
	}

	return process.cwd();
}

function fail(message: string, code = 1): never {
	console.error("ERROR:", message);
	process.exit(code);
}

function main(): void {
	const articlesPath = path.join(getProjectRoot(), "docs", "articles.json");

	if (!fs.existsSync(articlesPath)) {
		fail(`${articlesPath} not found`);
	}

	let data: unknown;
	try {
		data = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		fail(`JSON parse error: ${message}`);
	}

	const errors = validateArticles(data);

	if (errors.length > 0) {
		console.error("Validation failed with the following issues:");
		errors.forEach((error) => {
			console.error(" -", error);
		});
		process.exit(2);
	}

	console.log("articles.json validation passed");
}

main();
