import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	root: resolve(import.meta.dirname, "src"),
	base: "./",
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
