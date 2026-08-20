import { articleUrl, loadArticles } from "./articles.js";

async function list(doc: Document): Promise<void> {
  const articles = await loadArticles();
  const articleList = doc.querySelector<HTMLUListElement>("#article-list");

  if (!articleList) {
    return;
  }

  for (const article of articles) {
    const listItem = doc.createElement("li");
    const link = doc.createElement("a");
    link.href = articleUrl(article);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = article.title; // Display the title as plain text to avoid HTML injection
    listItem.appendChild(link);
    articleList.appendChild(listItem);
  }
}

void list(document);
