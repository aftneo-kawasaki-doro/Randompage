import fs from "node:fs";
import path from "node:path";

interface Article {
  id?: unknown;
  title?: unknown;
}

function getProjectRoot(): string {
  const projectRoot = process.env.PROJECT_ROOT;
  if (projectRoot && fs.existsSync(projectRoot)) {
    return projectRoot;
  }

  return process.cwd();
}

function fail(message: string, code = 1): never {
  console.error("ERROR:", message);
  process.exit(code);
}

function main(): void {
  const articlesPath = path.join(getProjectRoot(), "docs", "articles.json");

  if (!fs.existsSync(articlesPath)) {
    fail(`${articlesPath} not found`);
  }

  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(articlesPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`JSON parse error: ${message}`);
  }

  if (!Array.isArray(data)) {
    fail("Expected top-level JSON array of articles");
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
    } else if (!Number.isInteger(article.id)) {
      errors.push(
        `item[${index}] 'id' is not an int (value=${JSON.stringify(article.id)})`,
      );
    } else {
      ids.push(article.id as number);
    }

    if (!("title" in article)) {
      errors.push(`item[${index}] missing 'title'`);
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

  if (errors.length > 0) {
    console.error("Validation failed with the following issues:");
    errors.forEach((error) => console.error(" -", error));
    process.exit(2);
  }

  console.log("articles.json validation passed");
}

main();
