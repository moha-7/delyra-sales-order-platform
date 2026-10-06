import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cssPath = path.join(root, "src/app/styles.css");
const sourceRoot = path.join(root, "src");

function walk(dir, ext, out = []) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, ext, out);
    else if (ext.some((suffix) => item.name.endsWith(suffix))) out.push(full);
  }
  return out;
}

const css = fs.readFileSync(cssPath, "utf8");
const classes = [...new Set([...css.matchAll(/\.([_a-zA-Z][-_a-zA-Z0-9]*)/g)].map((m) => m[1]))].sort();
const source = walk(sourceRoot, [".ts", ".tsx"]).map((file) => fs.readFileSync(file, "utf8")).join("\n");
const unused = classes.filter((name) => !new RegExp(`(?<![\\w-])${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}(?![\\w-])`).test(source));

console.log(JSON.stringify({ totalClasses: classes.length, likelyUnused: unused.length, unused }, null, 2));