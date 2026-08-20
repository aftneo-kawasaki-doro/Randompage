import { articleUrl, loadArticles } from "./articles.js";

async function jump(win: Window): Promise<void> {
  const articles = await loadArticles();
  const randomArticle = articles[Math.floor(Math.random() * articles.length)];

  if (randomArticle) {
    win.location.replace(articleUrl(randomArticle));
  }
}

void jump(window);
