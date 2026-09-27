const DAY = 86_400_000;
const SESSION_SIZE = 10;
const STORAGE_KEY = "dale-progress-v1";
const INTERVALS = [1, 3, 7, 14, 30];

export let cards = [];

export function flattenContent(content) {
  if (!content || content.version !== 1 || !Array.isArray(content.packs)) throw new Error("invalid content response");
  return content.packs.flatMap((pack) => {
    if (!pack || !pack.topic || !Number.isInteger(pack.unit) || !Array.isArray(pack.cards)) throw new Error("invalid content pack");
    return pack.cards.map((card) => ({ ...card, topic: pack.topic, pack: pack.id, unit: pack.unit }));
  });
}

export function cardsForUnit(allCards, unit) {
  return allCards.filter((card) => card.unit <= unit);
}

async function hydrateContent() {
  const response = await fetch("/api/content", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("content load failed: " + response.status);
  cards = flattenContent(await response.json());
  if (!cards.length) throw new Error("content is empty");
}

export function normalize(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[¿?¡!.,;:]/g, "").replace(/\s+/g, " ").trim();
}

export function isCorrect(card, value) {
  const attempt = normalize(value);
  return card.answers.some((answer) => normalize(answer) === attempt);
}

export function chooseSession(allCards, progress, now = Date.now(), size = SESSION_SIZE) {
  return [...allCards]
    .map((card) => ({ card, due: progress[card.id]?.due ?? 0, level: progress[card.id]?.level ?? -1, tie: Math.random() }))
    .sort((a, b) => (a.due - b.due) || (a.level - b.level) || (a.tie - b.tie))
    .filter((item, index, list) => item.due <= now || index < Math.min(size, list.length))
    .slice(0, size)
    .map((item) => item.card);
}

export function schedule(progress, id, remembered, now = Date.now()) {
  const previous = progress[id] ?? { level: -1, due: 0, attempts: 0 };
  const level = remembered ? Math.min(previous.level + 1, INTERVALS.length - 1) : 0;
  return { ...progress, [id]: { level, attempts: previous.attempts + 1, due: now + (remembered ? INTERVALS[level] * DAY : 10 * 60_000) } };
}

function emptyState() { return { cards: {}, streak: {}, courseUnit: 2, updatedAt: 0 }; }

function normalizeState(saved) {
  if (!saved || typeof saved !== "object") return emptyState();
  const normalized = {
    cards: saved.cards && typeof saved.cards === "object" ? saved.cards : {},
    streak: saved.streak && typeof saved.streak === "object" ? saved.streak : {},
    courseUnit: Number.isInteger(saved.courseUnit) && saved.courseUnit >= 2 && saved.courseUnit <= 9 ? saved.courseUnit : 2,
    updatedAt: Number.isFinite(saved.updatedAt) ? saved.updatedAt : 0,
  };
  if (!normalized.updatedAt && (Object.keys(normalized.cards).length || normalized.streak.count)) normalized.updatedAt = Date.now();
  return normalized;
}

function loadState() {
  try { return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return emptyState(); }
}

export function resetState(now = Date.now()) {
  return { ...emptyState(), updatedAt: now };
}

let syncChain = Promise.resolve();

async function uploadState(snapshot) {
  const response = await fetch("/api/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: snapshot,
    keepalive: true,
  });
  if (!response.ok) throw new Error(`progress save failed: ${response.status}`);
}

function queueSync() {
  if (typeof fetch === "undefined") return;
  const snapshot = JSON.stringify(state);
  syncChain = syncChain.catch(() => {}).then(() => uploadState(snapshot));
}

function saveState() {
  state.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  queueSync();
}

async function wipeProgress() {
  if (!confirm("Wipe all saved practice progress and start over on every device?")) return;
  const reset = resetState();
  try {
    await syncChain.catch(() => {});
    await uploadState(JSON.stringify(reset));
  } catch {
    alert("Progress could not be wiped. Please try again.");
    return;
  }
  state = reset;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  startSession();
}

async function hydrateState() {
  try {
    const response = await fetch("/api/progress", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const remote = await response.json();
    const remoteState = normalizeState(remote.state);
    if (remote.exists && remoteState.updatedAt >= state.updatedAt) {
      state = remoteState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else if (state.updatedAt) {
      await uploadState(JSON.stringify(state));
    }
  } catch {
    // Local storage remains the offline source until a later save or reload retries.
  }
}

async function hydrateUser() {
  try {
    const response = await fetch("/api/me", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const profile = await response.json();
    if (!profile.name) return;
    element("user-greeting").textContent = `Hey, ${profile.name}`;
    element("user-greeting").hidden = false;
  } catch {
    // Greeting is optional; practice still works if profile loading fails.
  }
}
function dayKey(date = new Date()) { return date.toISOString().slice(0, 10); }

function updateStreak() {
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - DAY));
  if (state.streak.last === today) return;
  state.streak.count = state.streak.last === yesterday ? (state.streak.count || 0) + 1 : 1;
  state.streak.last = today;
}

let state = typeof localStorage === "undefined" ? emptyState() : loadState();
let session = [];
let index = 0;
let score = 0;
let answered = false;
const element = (id) => document.getElementById(id);
const difficulty = () => document.querySelector('input[name="difficulty"]:checked').value;
const speaking = () => element("speaking-mode").checked;

function renderStats() {
  const now = Date.now();
  const unlocked = cardsForUnit(cards, state.courseUnit);
  const records = unlocked.map((card) => state.cards[card.id]).filter(Boolean);
  element("due-count").textContent = unlocked.filter((card) => (state.cards[card.id]?.due ?? 0) <= now).length;
  element("learned-count").textContent = records.filter((record) => record.level >= 2).length;
  element("streak-count").textContent = state.streak.count || 0;
  element("deck-count").textContent = unlocked.length;
}

function renderCard() {
  const card = session[index];
  answered = false;
  element("current-number").textContent = index + 1;
  element("progress-bar").style.width = `${((index + 1) / SESSION_SIZE) * 100}%`;
  element("card-kind").textContent = card.kind;
  element("card-verb").textContent = card.verb ? `Infinitive: ${card.verb}` : "";
  element("card-prompt").textContent = card.prompt;
  element("card-translation").textContent = card.translation;
  const level = difficulty();
  element("card-person").textContent = level === "challenge" ? "" : (card.person || "Phrase recall");
  element("card-clue").textContent = level === "guided" ? (card.clue || "Say the whole phrase from memory.") : "";
  element("answer").value = "";
  element("answer").disabled = false;
  element("answer-form").hidden = speaking();
  element("speaking-prompt").hidden = !speaking();
  element("feedback").hidden = true;
  element("feedback").classList.remove("wrong");
  element("self-grade").hidden = true;
  element("next-button").hidden = false;
  element("reveal-button").hidden = speaking();
  (speaking() ? element("show-answer-button") : element("answer")).focus({ preventScroll: true });
}

function showFeedback(remembered) {
  if (answered) return;
  answered = true;
  const card = session[index];
  state.cards = schedule(state.cards, card.id, remembered);
  if (remembered) score += 1;
  saveState();
  renderStats();
  element("answer").disabled = true;
  element("feedback").hidden = false;
  element("feedback").classList.toggle("wrong", !remembered);
  element("feedback-title").textContent = remembered ? "¡Exacto!" : `Answer: ${card.answer}`;
  element("feedback-copy").textContent = card.note;
  element("reveal-button").hidden = true;
  element("next-button").focus();
}

function revealSpokenAnswer() {
  if (answered) return;
  answered = true;
  const card = session[index];
  element("feedback").hidden = false;
  element("feedback-title").textContent = `Answer: ${card.answer}`;
  element("feedback-copy").textContent = card.note;
  element("self-grade").hidden = false;
  element("next-button").hidden = true;
  element("remembered-button").focus();
}

function gradeSpokenAnswer(remembered) {
  const card = session[index];
  state.cards = schedule(state.cards, card.id, remembered);
  if (remembered) score += 1;
  saveState();
  renderStats();
  nextCard();
}

function finishSession() {
  updateStreak();
  saveState();
  renderStats();
  element("practice-card").hidden = true;
  document.querySelector(".session-controls").hidden = true;
  element("summary").hidden = false;
  element("score").textContent = score;
  element("summary-copy").textContent = score >= 8 ? "Strong recall. Give it some space before the next round." : "Good work. The missed prompts are now scheduled to return sooner.";
  element("restart-button").focus();
}

function nextCard() {
  index += 1;
  if (index >= session.length) finishSession();
  else renderCard();
}

function startSession() {
  element("course-unit").value = String(state.courseUnit);
  const unlocked = cardsForUnit(cards, state.courseUnit);
  for (const option of element("topic-filter").options) option.disabled = option.value !== "all" && !unlocked.some((card) => card.topic === option.value);
  if (element("topic-filter").selectedOptions[0].disabled) element("topic-filter").value = "all";
  const topic = element("topic-filter").value;
  const pool = topic === "all" ? unlocked : unlocked.filter((card) => card.topic === topic);
  session = chooseSession(pool, state.cards);
  index = 0;
  score = 0;
  element("practice-card").hidden = false;
  document.querySelector(".session-controls").hidden = false;
  element("summary").hidden = true;
  renderStats();
  renderCard();
}

function showContentError() {
  element("practice-card").hidden = true;
  document.querySelector(".session-controls").hidden = true;
  element("summary").hidden = false;
  element("summary-title").textContent = "Practice could not load";
  element("score").parentElement.hidden = true;
  element("summary-copy").textContent = "Reload the page to try again.";
  element("restart-button").hidden = true;
}

if (typeof document !== "undefined") {
  element("practice-card").hidden = true;
  document.querySelector(".session-controls").hidden = true;
  element("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const attempt = element("answer").value;
    if (!attempt.trim()) return element("answer").focus();
    showFeedback(isCorrect(session[index], attempt));
  });
  element("reveal-button").addEventListener("click", () => showFeedback(false));
  element("show-answer-button").addEventListener("click", revealSpokenAnswer);
  element("missed-button").addEventListener("click", () => gradeSpokenAnswer(false));
  element("remembered-button").addEventListener("click", () => gradeSpokenAnswer(true));
  element("next-button").addEventListener("click", nextCard);
  element("restart-button").addEventListener("click", startSession);
  element("topic-filter").addEventListener("change", startSession);
  element("course-unit").addEventListener("change", () => {
    state.courseUnit = Number(element("course-unit").value);
    saveState();
    startSession();
  });
  element("speaking-mode").addEventListener("change", () => {
    if (!answered) renderCard();
  });
  document.querySelectorAll('input[name="difficulty"]').forEach((input) => input.addEventListener("change", () => {
    if (!answered) renderCard();
  }));
  element("reset-button").addEventListener("click", wipeProgress);
  hydrateUser();
  Promise.all([hydrateContent(), hydrateState()]).then(startSession).catch(showContentError);
}
