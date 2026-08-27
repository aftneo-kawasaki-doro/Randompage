import { articleUrl, loadArticles } from "./articles.js";

async function jump(win: Window): Promise<void> {
	try {
		const articles = await loadArticles();
		const randomArticle = articles[Math.floor(Math.random() * articles.length)];

		if (randomArticle) {
			win.location.replace(articleUrl(randomArticle));
		}
	} catch {
		const errorMessage =
			win.document.querySelector<HTMLElement>("#error-message");
		if (errorMessage) {
			errorMessage.hidden = false;
		}
	}
}

void jump(window);
