import crypto from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	defineConfig,
	type IndexHtmlTransformContext,
	type Plugin,
} from "vite";

const generateTsFromJson = (): Plugin => {
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

const inlineCSS = (targetPages: string[]): Plugin => {
	return {
		name: "inline-css",
		transformIndexHtml(html: string, ctx: IndexHtmlTransformContext) {
			const bundle = ctx.bundle;
			if (!bundle) return html;

			// 1. インライン化を適用したいHTMLファイルの条件を指定（例: ideasページのみ）
			// ※ご自身の環境に合わせて、ファイル名に含まれるキーワードを指定してください
			if (targetPages.length === 0) {
				return html;
			}
			const TARGET_PAGES = [...targetPages];

			// 処理中のHTMLファイルパス（ctx.filename）が対象に含まれているかチェック
			const shouldInline = TARGET_PAGES.some((page) =>
				ctx.filename?.endsWith(page),
			);

			// 対象外のHTMLページであれば、CSSを埋め込まずにそのまま返す（通常の外部ファイル読み込みになる）
			if (!shouldInline) {
				return html;
			}

			// 2. このページ（HTML）に対応するCSSアセットを特定
			const cssAsset = Object.values(bundle).find((asset) => {
				if (
					asset &&
					typeof asset === "object" &&
					"type" in asset &&
					"fileName" in asset
				) {
					const a = asset as { type: string; fileName: string };
					const isTargetPageCss = ctx.filename
						? a.fileName.includes(ctx.filename.replace(/\.html$/, ""))
						: false;
					return (
						a.type === "asset" &&
						a.fileName.endsWith(".css") &&
						(isTargetPageCss || true)
					);
				}
				return false;
			}) as { source: string | Uint8Array } | undefined;

			if (cssAsset?.source) {
				let cssContent = "";
				if (typeof cssAsset.source === "string") {
					cssContent = cssAsset.source;
				} else if (cssAsset.source instanceof Uint8Array) {
					cssContent = new TextDecoder("utf-8").decode(cssAsset.source);
				}

				// 3. CSSの中身からCSP用のハッシュ値（sha256-xxx）を生成
				const hash = crypto
					.createHash("sha256")
					.update(cssContent)
					.digest("base64");
				const cspHash = `'sha256-${hash}'`;

				// 4. HTML内の既存の外部CSSリンクタグを消去
				let cleanedHtml = html.replace(/<link rel="stylesheet"[^>]*>/g, "");

				// 5. CSPメタタグの style-src 'self' の後ろにハッシュを動的注入
				if (cleanedHtml.includes("Content-Security-Policy")) {
					cleanedHtml = cleanedHtml.replace(
						/style-src\s+'self'/g,
						`style-src 'self' ${cspHash}`,
					);
				} else {
					throw new Error(
						"CSP meta tag not found in the HTML. Please ensure a Content-Security-Policy meta tag is present.",
					);
				}

				// 6. </head> の直前に <style> として埋め込む
				return cleanedHtml.replace(
					"</head>",
					`<style>${cssContent}</style></head>`,
				);
			}

			return html;
		},
	};
};

export default defineConfig({
	root: resolve(import.meta.dirname, "src"),
	base: "./",

	plugins: [generateTsFromJson(), inlineCSS(["ideas/index.html"])],

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
