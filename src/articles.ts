export interface Article {
	id: number;
	title: string;
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
		if (
			!Array.isArray(data) ||
			!data.every(
				(item) =>
					typeof item === "object" &&
					item !== null &&
					typeof item.id === "number" &&
					typeof item.title === "string",
			)
		) {
			throw new Error("Invalid article format");
		}

		return data;
	} catch (error) {
		console.error("Failed to load articles:", error);
		throw error;
	}
}

export function articleUrl(article: Article): string {
	return `https://snabi.jp/facility/29695/blog_articles/${article.id}`;
}
