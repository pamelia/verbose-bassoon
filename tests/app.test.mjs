import test from "node:test";
import assert from "node:assert/strict";
import { cards, chooseSession, isCorrect, normalize, schedule } from "../dist/app.js";

test("the lesson deck is broad, grouped, and free of duplicate ids", () => {
  assert.equal(cards.length, 205);
  assert.equal(new Set(cards.map(({ id }) => id)).size, cards.length);
  assert.deepEqual(new Set(cards.map(({ topic }) => topic)), new Set(["conversation", "plans", "numbers", "people", "verbs"]));
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

test("session selection returns ten prompts with overdue work first", () => {
  const progress = Object.fromEntries(cards.map((card) => [card.id, { level: 2, due: 9_999_999 }]));
  progress.hello = { level: 0, due: 0 };
  const session = chooseSession(cards, progress, 100, 10);
  assert.equal(session.length, 10);
  assert.equal(session[0].id, "hello");
});
