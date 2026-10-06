import fs from "node:fs";

const file = "src/app/styles.css";

const removeClasses = new Set([
  "action-card",
  "action-center-grid",
  "app-layout",
  "app-main",
  "notice",
  "page-header",
  "required-action-card",
  "sidebar",
  "status-blocked",
  "status-completed",
  "status-in_progress",
  "status-negative",
  "status-neutral",
  "status-positive",
  "status-warning",
]);

function hasTargetClass(selector) {
  return [...removeClasses].some((className) => {
    const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\.${escaped}(?![\\w-])`).test(selector);
  });
}

function findMatchingBrace(css, openIndex) {
  let depth = 0;

  for (let i = openIndex; i < css.length; i++) {
    const char = css[i];

    if (char === "{") depth++;
    if (char === "}") depth--;

    if (depth === 0) return i;
  }

  return -1;
}

function cleanup(css) {
  let output = "";
  let cursor = 0;

  while (cursor < css.length) {
    const open = css.indexOf("{", cursor);

    if (open === -1) {
      output += css.slice(cursor);
      break;
    }

    const close = findMatchingBrace(css, open);

    if (close === -1) {
      output += css.slice(cursor);
      break;
    }

    const preludeStart = Math.max(css.lastIndexOf("}", open), css.lastIndexOf(";", open)) + 1;
    const before = css.slice(cursor, preludeStart);
    const prelude = css.slice(preludeStart, open).trim();
    const body = css.slice(open + 1, close);

    output += before;

    if (prelude.startsWith("@")) {
      const cleanedBody = cleanup(body).trim();

      if (cleanedBody) {
        output += `${prelude} {\n${cleanedBody}\n}`;
      }
    } else if (!hasTargetClass(prelude)) {
      output += `${prelude} {${body}}`;
    }

    cursor = close + 1;
  }

  return output
    .replace(/\n{4,}/g, "\n\n\n")
    .trimEnd() + "\n";
}

const original = fs.readFileSync(file, "utf8");
const cleaned = cleanup(original);

fs.writeFileSync(file, cleaned, "utf8");

console.log(JSON.stringify({
  file,
  removedClasses: [...removeClasses],
  beforeBytes: Buffer.byteLength(original),
  afterBytes: Buffer.byteLength(cleaned),
  savedBytes: Buffer.byteLength(original) - Buffer.byteLength(cleaned),
}, null, 2));
