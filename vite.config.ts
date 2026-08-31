import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const generateTsFromJson = () => {
	return {
		name: "generate-ts-from-json",
		buildStart() {
			const jsonPath = resolve(import.meta.dirname, "src/articles.json");
			const jsonRaw = readFileSync(jsonPath, "utf-8");

			const tsContent = `// WARNING: This is a generated TypeScript file that exports the articles as a constant.\nexport const articles = ${jsonRaw.trim()} as const;\n`;

			const tsPath = resolve(import.meta.dirname, "src/articles.gen.ts");
			writeFileSync(tsPath, tsContent, "utf-8");
		},
	};
};

export default defineConfig({
	root: resolve(import.meta.dirname, "src"),
	base: "./",

	plugins: [generateTsFromJson()],

	build: {
		outDir: resolve(import.meta.dirname, "docs"),
		emptyOutDir: true,
		minify: false,
		rollupOptions: {
			input: {
				main: resolve(import.meta.dirname, "src/index.html"),
				list: resolve(import.meta.dirname, "src/list.html"),
				ideas: resolve(import.meta.dirname, "src/ideas/index.html"),
			},
		},
	},
});
