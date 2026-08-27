export type ArticleId = number & { readonly __brand: unique symbol };

export function isArticleId(value: unknown): value is ArticleId {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export interface Article {
	id: ArticleId;
	title: string;
}

function isArticle(value: unknown): value is Article {
	if (typeof value !== "object" || value === null) return false;
	const article = value as Record<string, unknown>;
	return isArticleId(article.id) && typeof article.title === "string";
}

export async function loadArticles(
	path = "./articles.json",
): Promise<Article[]> {
	try {
		const response = await fetch(path);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data: unknown = await response.json();
		if (!Array.isArray(data)) {
			throw new Error("Invalid article format");
		}

		const items: unknown[] = data;
		const articles = items.filter(isArticle);
		if (articles.length !== items.length) {
			throw new Error("Invalid article format");
		}

		return articles;
	} catch (error) {
		console.error("Failed to load articles:", error);
		throw error;
	}
}

export function articleUrl(article: Article): string {
	return `https://snabi.jp/facility/29695/blog_articles/${article.id}`;
}
