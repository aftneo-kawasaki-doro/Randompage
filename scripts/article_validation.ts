interface Article {
  id?: unknown;
  title?: unknown;
}

const MAX_TITLE_LENGTH = 200;

export function validateArticles(data: unknown): string[] {
  if (!Array.isArray(data)) {
    return ["Expected top-level JSON array of articles"];
  }

  if (data.length === 0) {
    return ["Expected at least one article"];
  }

  const ids: number[] = [];
  const errors: string[] = [];

  data.forEach((item: unknown, index: number) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push(`item[${index}] is not an object`);
      return;
    }

    const article = item as Article;
    if (!("id" in article)) {
      errors.push(`item[${index}] missing 'id'`);
    } else if (
      typeof article.id !== "number" ||
      !Number.isSafeInteger(article.id) ||
      article.id <= 0
    ) {
      errors.push(`item[${index}] 'id' is not a positive safe integer`);
    } else {
      ids.push(article.id);
    }

    if (!("title" in article)) {
      errors.push(`item[${index}] missing 'title'`);
    } else if (typeof article.title !== "string") {
      errors.push(`item[${index}] 'title' is not a string`);
    } else if (
      article.title.trim().length === 0 ||
      article.title.length > MAX_TITLE_LENGTH
    ) {
      errors.push(
        `item[${index}] 'title' must contain non-whitespace text and be at most ${MAX_TITLE_LENGTH} characters`,
      );
    }
  });

  const duplicateIds = [
    ...new Set(ids.filter((id, index) => ids.indexOf(id) !== index)),
  ];
  if (duplicateIds.length > 0) {
    errors.push(
      `Duplicate id(s) found: ${JSON.stringify(duplicateIds.sort((a, b) => a - b))}`,
    );
  }

  return errors;
}
