import { articleUrl, loadArticles, type Article } from "../articles.js";

interface IdeaNote {
  articleId: number;
  articleTitle: string;
  text: string;
  createdAt: string;
}

const NOTES_KEY = "randompage:idea-notes";

function getStorage(win: Window): Storage | undefined {
  try {
    return win.localStorage;
  } catch {
    return undefined;
  }
}

function isIdeaNote(value: unknown): value is IdeaNote {
  if (typeof value !== "object" || value === null) return false;
  const note = value as Record<string, unknown>;
  return (
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

function writeNotes(storage: Storage | undefined, notes: IdeaNote[]): void {
  if (!storage) return;
  try {
    storage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 20)));
  } catch {
    // Storage may be disabled or full. The card remains usable without notes.
  }
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

function start(doc: Document, win: Window): void {
  const articleTitle = doc.querySelector<HTMLElement>("#article-title")!;
  const articleLink = doc.querySelector<HTMLAnchorElement>("#article-link")!;
  const drawPanel = doc.querySelector<HTMLElement>("#draw-panel")!;
  const cardCaption = doc.querySelector<HTMLElement>("#card-caption")!;
  const noteForm = doc.querySelector<HTMLFormElement>("#note-form")!;
  const noteInput = doc.querySelector<HTMLTextAreaElement>("#note-input")!;
  const notesList = doc.querySelector<HTMLOListElement>("#notes-list")!;
  const notesEmpty = doc.querySelector<HTMLElement>("#notes-empty")!;
  const shuffleButton =
    doc.querySelector<HTMLButtonElement>("#shuffle-button")!;
  const skipButton = doc.querySelector<HTMLButtonElement>("#skip-button")!;
  const errorMessage = doc.querySelector<HTMLElement>("#error-message")!;
  const retryButton = doc.querySelector<HTMLButtonElement>("#retry-button")!;

  if (
    !articleTitle ||
    !articleLink ||
    !drawPanel ||
    !cardCaption ||
    !noteForm ||
    !noteInput ||
    !notesList ||
    !notesEmpty ||
    !shuffleButton ||
    !skipButton ||
    !errorMessage ||
    !retryButton
  )
    return;

  let articles: Article[] = [];
  let currentArticle: Article | undefined;
  let pendingArticle: Article | undefined;
  let animationTimer: number | undefined;
  const storage = getStorage(win);
  let notes = readNotes(storage);

  function renderNotes(): void {
    notesList.replaceChildren();
    notesEmpty.hidden = notes.length > 0;
    for (const [index, note] of notes.entries()) {
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
        notes = notes.filter((_, noteIndex) => noteIndex !== index);
        writeNotes(storage, notes);
        renderNotes();
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
    notes.unshift({
      articleId: currentArticle.id,
      articleTitle: currentArticle.title,
      text,
      createdAt: new Date().toISOString(),
    });
    notes = notes.slice(0, 20);
    writeNotes(storage, notes);
    noteInput.value = "";
    renderNotes();
  });

  renderNotes();
  void load();
}

start(document, window);
