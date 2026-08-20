export interface Article {
  id: number;
  title: string;
}

export async function loadArticles(): Promise<Article[]> {
  const response = await fetch("./articles.json");
  return (await response.json()) as Article[];
}

export function articleUrl(article: Article): string {
  return `https://snabi.jp/facility/29695/blog_articles/${article.id}`;
}
