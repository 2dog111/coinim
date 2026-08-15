#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const targetName = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]) || "home";
const writeCopy = process.argv.includes("--write");
const targets = {
  home: {
    html: "index.html",
    copy: "copy/home.en.md",
    sections: [
      ["Hero", "hero", /<section class="home-hero"[\s\S]*?<\/section>/],
      ["The record", "proof", /<section class="home-proof"[\s\S]*?<\/section>/],
      ["Stage one", "stage-1", /<section id="stage-1"[\s\S]*?<\/section>/],
      ["Stage two", "stage-2", /<section id="stage-2"[\s\S]*?<\/section>/],
      ["Stage three", "stage-3", /<section id="stage-3"[\s\S]*?<\/section>/],
      ["Stage four", "stage-4", /<section id="stage-4"[\s\S]*?<\/section>/],
      ["Rest band", "rest-1", /<div class="rest-band">[\s\S]*?<\/div>/],
      ["The objects", "objects", /<section id="objects"[\s\S]*?<\/section>/],
      ["Rest band", "rest-2", /<div class="rest-band">[\s\S]*?<\/div>/g],
      ["How we work together", "how", /<section id="how"[\s\S]*?<\/section>/],
      ["The obvious questions", "faq", /<section id="faq"[\s\S]*?<\/section>/],
      ["Start here", "contact", /<section id="contact"[\s\S]*?<\/section>/]
    ]
  },
  ms: {
    html: "ms.html",
    copy: "copy/ms.en.md",
    sections: []
  }
};

const target = targets[targetName];
if (!target) {
  console.error(`Unknown target: ${targetName}`);
  process.exit(2);
}

const decodeEntities = (value) => value
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, "\"")
  .replace(/&apos;|&#39;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)));

const normalise = (value) => decodeEntities(value).replace(/\s+/g, " ").trim();
const textNodes = (value) => normalise(value
  .replace(/<!--([\s\S]*?)-->/g, " ")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " "));

const getMain = (html) => {
  const match = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (!match) throw new Error("Main content was not found.");
  return match[1];
};

const getSectionCopy = (html) => {
  const main = getMain(html);
  const section = (pattern) => {
    const match = main.match(pattern);
    return match ? match[0] : "";
  };
  const restBands = [...main.matchAll(/<div class="rest-band(?: [^"]*)?"[^>]*>[\s\S]*?<\/div>/g)]
    .map((match) => match[0])
    .filter((source) => !/\bhome-rest\b/.test(source))
    .filter((source) => textNodes(source));
  const sections = [
    ["Hero", "hero", section(/<section\b[^>]*class="[^"]*\bhome-hero\b[^"]*"[^>]*>[\s\S]*?<\/section>/)],
    ["Object one", "object-one", section(/<section id="object-one"[\s\S]*?<\/section>/)],
    ["The record", "proof", section(/<section\b[^>]*class="[^"]*\bhome-proof\b[^"]*"[^>]*>[\s\S]*?<\/section>/)],
    ["Record bridge", "record-bridge", section(/<div class="rest-band home-rest"[^>]*>[\s\S]*?<\/div>/)],
    ["Stage one", "stage-1", section(/<section id="stage-1"[\s\S]*?<\/section>/)],
    ["Stage two", "stage-2", section(/<section id="stage-2"[\s\S]*?<\/section>/)],
    ["Stage three", "stage-3", section(/<section id="stage-3"[\s\S]*?<\/section>/)],
    ["Stage four", "stage-4", section(/<section id="stage-4"[\s\S]*?<\/section>/)],
    ["Rest band", "rest-1", restBands[0]],
    ["The objects", "objects", section(/<section id="objects"[\s\S]*?<\/section>/)],
    ["Before a word is read", "before-reading", section(/<section id="before-reading"[\s\S]*?<\/section>/)],
    ["Why paper, when email is free", "why-paper", section(/<section id="why-paper"[\s\S]*?<\/section>/)],
    ["Rest band", "rest-2", restBands[1]],
    ["How we work together", "how", section(/<section id="how"[\s\S]*?<\/section>/)],
    ["The obvious questions", "faq", section(/<section id="faq"[\s\S]*?<\/section>/)],
    ["Start here", "contact", section(/<section id="contact"[\s\S]*?<\/section>/)]
  ];

  return sections
    .filter(([, , source]) => source)
    .map(([label, anchor, source]) => `## ${label} {#${anchor}}\n\n${textNodes(source)}`)
    .join("\n\n") + "\n";
};

const extractSourceText = (markdown) => normalise(markdown
  .replace(/<!--([\s\S]*?)-->/g, " ")
  .replace(/^#{1,6}\s+.*\{#[^}]+\}\s*$/gm, " "));

const firstDifference = (expected, actual) => {
  const expectedWords = expected.split(" ");
  const actualWords = actual.split(" ");
  const length = Math.max(expectedWords.length, actualWords.length);
  for (let index = 0; index < length; index += 1) {
    if (expectedWords[index] !== actualWords[index]) {
      const start = Math.max(0, index - 6);
      const end = index + 7;
      return {
        word: index + 1,
        expected: expectedWords.slice(start, end).join(" "),
        actual: actualWords.slice(start, end).join(" ")
      };
    }
  }
  return null;
};

const html = fs.readFileSync(path.join(root, target.html), "utf8");
const copyPath = path.join(root, target.copy);

if (writeCopy) {
  if (targetName !== "home") {
    console.error("Market Scan copy is intentionally a separate work item.");
    process.exit(2);
  }
  fs.mkdirSync(path.dirname(copyPath), { recursive: true });
  fs.writeFileSync(copyPath, getSectionCopy(html));
  console.log(`Wrote ${path.relative(root, copyPath)}`);
  process.exit(0);
}

if (!fs.existsSync(copyPath)) {
  console.error(`${path.relative(root, copyPath)} is not present.`);
  process.exit(2);
}

const expected = extractSourceText(fs.readFileSync(copyPath, "utf8"));
const actual = textNodes(getMain(html));

if (expected === actual) {
  console.log(`${targetName} copy matches.`);
  process.exit(0);
}

const difference = firstDifference(expected, actual);
console.error(`${targetName} copy does not match.`);
if (difference) {
  console.error(`First difference at word ${difference.word}.`);
  console.error(`Copy: ${difference.expected}`);
  console.error(`HTML: ${difference.actual}`);
}
process.exit(1);
