import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { cardsForUnit, chooseSession, flattenContent, isCorrect, normalize, resetState, schedule } from "../dist/app.js";

const packFiles = readdirSync(new URL("../content/", import.meta.url)).filter((name) => name.endsWith(".json"));
const content = {
  version: 1,
  packs: packFiles.map((name) => JSON.parse(readFileSync(new URL(`../content/${name}`, import.meta.url), "utf8"))),
};
const cards = flattenContent(content);

test("browser assets cannot stay stale after a deployment", () => {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const server = readFileSync(new URL("../main.go", import.meta.url), "utf8");
  assert.match(html, /styles\.css\?v=\d+/);
  assert.match(html, /app\.js\?v=\d+/);
  assert.match(server, /Cache-Control", "no-store"/);
});

test("authenticated learners can log out through the proxy", () => {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /href="\/oauth2\/sign_out\?rd=%2F">Log out<\/a>/);
});

test("the lesson deck is broad, grouped, and free of duplicate ids", () => {
  assert.equal(cards.length, 499);
  assert.equal(new Set(cards.map(({ id }) => id)).size, cards.length);
  assert.deepEqual(new Set(cards.map(({ topic }) => topic)), new Set(["conversation", "plans", "numbers", "people", "verbs", "places", "shopping", "routines", "food", "abilities"]));
  assert.equal(content.packs.length, 16);
  assert.ok(content.packs.every(({ id, title, stage, cards }) => id && title && stage && cards.length));
});

test("future course units contain substantial original practice", () => {
  const units = content.packs.filter(({ id }) => /^a1-unit-[3-9]-/.test(id));
  assert.equal(units.length, 7);
  assert.ok(units.every(({ cards, source }) => cards.length === 42 && source.startsWith("Original exercises")));
});

test("future units stay out of practice until the learner unlocks them", () => {
  assert.equal(cardsForUnit(cards, 2).length, 205);
  assert.equal(cardsForUnit(cards, 3).length, 247);
  assert.equal(cardsForUnit(cards, 9).length, 499);
});

test("profession prompts identify the profession instead of asking for a guess", () => {
  const professionCards = cards.filter(({ kind }) => kind === "Professions");
  assert.equal(professionCards.length, 18);
  assert.ok(professionCards.every(({ translation }) => translation.startsWith("Profession: ")));
  assert.equal(cards.find(({ id }) => id === "profession-business-owner-m").translation, "Profession: business owner.");
});

test("answer matching ignores punctuation, case, and missing accents", () => {
  assert.equal(normalize(" ¿CÓMO estás? "), "como estas");
  assert.equal(isCorrect(cards.find(({ id }) => id === "how-are-you"), "como estas"), true);
  assert.equal(isCorrect(cards.find(({ id }) => id === "comer-yo"), "comes"), false);
});

test("remembered cards are spaced farther out and missed cards return soon", () => {
  const now = 1_000_000;
  const first = schedule({}, "comer-yo", true, now);
  const second = schedule(first, "comer-yo", true, now);
  const missed = schedule(second, "comer-yo", false, now);
  assert.equal(first["comer-yo"].due, now + 86_400_000);
  assert.equal(second["comer-yo"].due, now + 3 * 86_400_000);
  assert.equal(missed["comer-yo"].due, now + 10 * 60_000);
});

test("starting over creates a newer empty state for cross-device sync", () => {
  assert.deepEqual(resetState(1234), { cards: {}, streak: {}, courseUnit: 2, updatedAt: 1234 });
});

test("session selection returns ten prompts with overdue work first", () => {
  const progress = Object.fromEntries(cards.map((card) => [card.id, { level: 2, due: 9_999_999 }]));
  progress.hello = { level: 0, due: 0 };
  const session = chooseSession(cards, progress, 100, 10);
  assert.equal(session.length, 10);
  assert.equal(session[0].id, "hello");
});
