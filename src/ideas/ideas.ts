import { type Article, articleUrl, loadArticles } from "../articles.js";

type UUID = string & { readonly __brand: "UUID" };

interface IdeaNote {
	id: UUID;
	articleId: number;
	articleTitle: string;
	text: string;
	createdAt: string;
}

const NOTES_KEY = "randompage:idea-notes";
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getStorage(win: Window): Storage | undefined {
	try {
		return win.localStorage;
	} catch {
		return undefined;
	}
}

function isUUID(value: unknown): value is UUID {
	return typeof value === "string" && UUID_PATTERN.test(value);
}

function isIdeaNote(value: unknown): value is IdeaNote {
	if (typeof value !== "object" || value === null) return false;
	const note = value as Record<string, unknown>;
	return (
		isUUID(note.id) &&
		Number.isSafeInteger(note.articleId) &&
		typeof note.articleTitle === "string" &&
		typeof note.text === "string" &&
		typeof note.createdAt === "string"
	);
}

function readNotes(storage: Storage | undefined): IdeaNote[] {
	if (!storage) return [];
	try {
		const saved = storage.getItem(NOTES_KEY);
		if (!saved) return [];
		const data: unknown = JSON.parse(saved);
		return Array.isArray(data) ? data.filter(isIdeaNote).slice(0, 20) : [];
	} catch {
		return [];
	}
}

function writeNotes(storage: Storage, notes: IdeaNote[]): boolean {
	try {
		storage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 20)));
		return true;
	} catch {
		return false;
	}
}

async function updateNotes(
	win: Window,
	storage: Storage | undefined,
	update: (notes: IdeaNote[]) => IdeaNote[],
): Promise<IdeaNote[] | undefined> {
	if (!storage) return undefined;

	const save = (): IdeaNote[] | undefined => {
		const nextNotes = update(readNotes(storage));
		return writeNotes(storage, nextNotes) ? nextNotes : undefined;
	};

	try {
		if (win.navigator.locks) {
			return await win.navigator.locks.request(
				"randompage:idea-notes",
				{ mode: "exclusive" },
				save,
			);
		}
	} catch {
		return undefined;
	}

	return save();
}

function chooseArticle(
	articles: Article[],
	currentId?: number,
): Article | undefined {
	const candidates = articles.filter((article) => article.id !== currentId);
	const pool = candidates.length > 0 ? candidates : articles;
	return pool[Math.floor(Math.random() * pool.length)];
}

function formatDate(value: string): string {
	return new Intl.DateTimeFormat("ja-JP", {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(new Date(value));
}

function allElementsPresent<T extends Record<string, Element | null>>(
	elements: T,
): elements is { [K in keyof T]: NonNullable<T[K]> } {
	return Object.values(elements).every((element) => element !== null);
}

function start(doc: Document, win: Window): void {
	const elements = {
		articleTitle: doc.querySelector<HTMLElement>("#article-title"),
		articleLink: doc.querySelector<HTMLAnchorElement>("#article-link"),
		drawPanel: doc.querySelector<HTMLElement>("#draw-panel"),
		cardCaption: doc.querySelector<HTMLElement>("#card-caption"),
		noteForm: doc.querySelector<HTMLFormElement>("#note-form"),
		noteInput: doc.querySelector<HTMLTextAreaElement>("#note-input"),
		notesList: doc.querySelector<HTMLOListElement>("#notes-list"),
		notesEmpty: doc.querySelector<HTMLElement>("#notes-empty"),
		shuffleButton: doc.querySelector<HTMLButtonElement>("#shuffle-button"),
		skipButton: doc.querySelector<HTMLButtonElement>("#skip-button"),
		errorMessage: doc.querySelector<HTMLElement>("#error-message"),
		retryButton: doc.querySelector<HTMLButtonElement>("#retry-button"),
	};

	if (!allElementsPresent(elements)) return;

	const {
		articleTitle,
		articleLink,
		drawPanel,
		cardCaption,
		noteForm,
		noteInput,
		notesList,
		notesEmpty,
		shuffleButton,
		skipButton,
		errorMessage,
		retryButton,
	} = elements;

	let articles: Article[] = [];
	let currentArticle: Article | undefined;
	let pendingArticle: Article | undefined;
	let animationTimer: number | undefined;
	const storage = getStorage(win);
	let notes = readNotes(storage);

	function renderNotes(): void {
		notesList.replaceChildren();
		notesEmpty.hidden = notes.length > 0;
		for (const note of notes) {
			const item = doc.createElement("li");
			item.className = "note-item";
			const heading = doc.createElement("strong");
			const headingLink = doc.createElement("a");
			headingLink.href = articleUrl({
				id: note.articleId,
				title: note.articleTitle,
			});
			headingLink.target = "_blank";
			headingLink.rel = "noreferrer";
			headingLink.textContent = note.articleTitle;
			heading.append(headingLink);
			const text = doc.createElement("p");
			text.textContent = note.text;
			const footer = doc.createElement("div");
			footer.className = "note-footer";
			const date = doc.createElement("time");
			date.dateTime = note.createdAt;
			date.textContent = formatDate(note.createdAt);
			const removeButton = doc.createElement("button");
			removeButton.type = "button";
			removeButton.className = "text-button";
			removeButton.textContent = "削除";
			removeButton.addEventListener("click", () => {
				void updateNotes(win, storage, (currentNotes) =>
					currentNotes.filter((currentNote) => currentNote.id !== note.id),
				).then((updatedNotes) => {
					if (updatedNotes) {
						notes = updatedNotes;
						renderNotes();
					}
				});
			});
			footer.append(date, removeButton);
			item.append(heading, text, footer);
			notesList.append(item);
		}
	}

	function revealArticle(article: Article | undefined): void {
		currentArticle = article;
		pendingArticle = undefined;
		if (animationTimer !== undefined) {
			win.clearTimeout(animationTimer);
			animationTimer = undefined;
		}
		drawPanel.dataset.state = "ready";
		skipButton.hidden = true;
		shuffleButton.disabled = articles.length === 0;
		if (!article) {
			articleTitle.textContent = "記事が見つかりませんでした";
			articleLink.hidden = true;
			return;
		}
		cardCaption.textContent = "今回の発想材料";
		articleTitle.textContent = article.title;
		articleLink.href = articleUrl(article);
		articleLink.hidden = false;
		noteInput.focus();
	}

	function drawArticle(article: Article | undefined, animate: boolean): void {
		const reducedMotion = win.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (!animate || !article || reducedMotion) {
			revealArticle(article);
			return;
		}

		pendingArticle = article;
		drawPanel.dataset.state = "drawing";
		articleLink.hidden = true;
		articleTitle.textContent = "抽選中…";
		cardCaption.textContent = "あなたの次のネタを選んでいます";
		shuffleButton.disabled = true;
		skipButton.hidden = false;
		animationTimer = win.setTimeout(() => {
			revealArticle(pendingArticle);
		}, 1100);
	}

	async function load(): Promise<void> {
		errorMessage.hidden = true;
		retryButton.disabled = true;
		shuffleButton.disabled = true;
		try {
			articles = await loadArticles("../articles.json");
			drawArticle(chooseArticle(articles), false);
		} catch {
			errorMessage.hidden = false;
		} finally {
			retryButton.disabled = false;
			shuffleButton.disabled = articles.length === 0;
		}
	}

	shuffleButton.addEventListener("click", () =>
		drawArticle(chooseArticle(articles, currentArticle?.id), true),
	);
	skipButton.addEventListener("click", () => revealArticle(pendingArticle));
	retryButton.addEventListener("click", () => void load());
	noteForm.addEventListener("submit", (event) => {
		event.preventDefault();
		const text = noteInput.value.trim();
		if (!currentArticle || text.length === 0) return;
		const article = currentArticle;
		void updateNotes(win, storage, (currentNotes) => [
			{
				id: win.crypto.randomUUID() as UUID,
				articleId: article.id,
				articleTitle: article.title,
				text,
				createdAt: new Date().toISOString(),
			},
			...currentNotes,
		]).then((updatedNotes) => {
			if (updatedNotes) {
				notes = updatedNotes;
				noteInput.value = "";
				renderNotes();
			}
		});
	});

	renderNotes();
	void load();
}

start(document, window);
