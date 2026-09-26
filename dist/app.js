const DAY = 86_400_000;
const SESSION_SIZE = 10;
const STORAGE_KEY = "dale-progress-v1";
const INTERVALS = [1, 3, 7, 14, 30];

export const cards = [
  { id: "hello", kind: "Greeting", prompt: "Hello!", translation: "Say it in Spanish.", answers: ["hola"], answer: "¡Hola!", note: "A friendly greeting at any time of day." },
  { id: "good-morning", kind: "Greeting", prompt: "Good morning.", translation: "Say it in Spanish.", answers: ["buenos dias"], answer: "Buenos días.", note: "Use the plural: buenos días." },
  { id: "how-are-you", kind: "Conversation", prompt: "How are you?", translation: "Ask one person informally.", answers: ["como estas"], answer: "¿Cómo estás?", note: "Tú uses estás, with an accent." },
  { id: "very-well", kind: "Conversation", prompt: "Very well, thank you.", translation: "Reply in Spanish.", answers: ["muy bien gracias"], answer: "Muy bien, gracias.", note: "A useful whole phrase to retrieve together." },
  { id: "and-you", kind: "Conversation", prompt: "And you?", translation: "Ask one person informally.", answers: ["y tu"], answer: "¿Y tú?", note: "Tú has an accent when it means “you”." },
  { id: "like-coffee", kind: "Likes", prompt: "Me ___ el café.", translation: "I like coffee.", verb: "gustar", person: "3rd person singular", clue: "Singular thing liked → gust- + -a", answers: ["gusta"], answer: "gusta", note: "The thing liked is singular, so use gusta." },
  { id: "like-books", kind: "Likes", prompt: "Me ___ los libros.", translation: "I like books.", verb: "gustar", person: "3rd person plural", clue: "Plural things liked → gust- + -an", answers: ["gustan"], answer: "gustan", note: "The things liked are plural, so use gustan." },
  { id: "dont-like", kind: "Likes", prompt: "No me ___ correr.", translation: "I don’t like running.", verb: "gustar", person: "3rd person singular", clue: "An activity counts as singular → gust- + -a", answers: ["gusta"], answer: "gusta", note: "An infinitive such as correr takes gusta." },
  { id: "hablar-yo", kind: "Regular -ar verb", prompt: "Yo ___ un poco de español.", translation: "I speak a little Spanish.", verb: "hablar", person: "1st person singular", clue: "habl- + -o", answers: ["hablo"], answer: "hablo", note: "For regular present-tense verbs, yo ends in -o." },
  { id: "estudiar-tu", kind: "Regular -ar verb", prompt: "Tú ___ español los martes.", translation: "You study Spanish on Tuesdays.", verb: "estudiar", person: "2nd person singular", clue: "estudi- + -as", answers: ["estudias"], answer: "estudias", note: "Regular -ar verbs use -as with tú." },
  { id: "trabajar-ella", kind: "Regular -ar verb", prompt: "Ella ___ en Madrid.", translation: "She works in Madrid.", verb: "trabajar", person: "3rd person singular", clue: "trabaj- + -a", answers: ["trabaja"], answer: "trabaja", note: "Regular -ar verbs use -a with él, ella, or usted." },
  { id: "bailar-nosotros", kind: "Regular -ar verb", prompt: "Nosotros ___ los viernes.", translation: "We dance on Fridays.", verb: "bailar", person: "1st person plural", clue: "bail- + -amos", answers: ["bailamos"], answer: "bailamos", note: "Regular -ar verbs use -amos with nosotros." },
  { id: "escuchar-vosotros", kind: "Regular -ar verb", prompt: "Vosotros ___ música.", translation: "You all listen to music.", verb: "escuchar", person: "2nd person plural", clue: "escuch- + -áis", answers: ["escuchais"], answer: "escucháis", note: "In Spain, regular -ar verbs use -áis with vosotros." },
  { id: "viajar-ellos", kind: "Regular -ar verb", prompt: "Ellos ___ mucho.", translation: "They travel a lot.", verb: "viajar", person: "3rd person plural", clue: "viaj- + -an", answers: ["viajan"], answer: "viajan", note: "Regular -ar verbs use -an with ellos or ellas." },
  { id: "comer-yo", kind: "Regular -er verb", prompt: "Yo ___ fruta por la mañana.", translation: "I eat fruit in the morning.", verb: "comer", person: "1st person singular", clue: "com- + -o", answers: ["como"], answer: "como", note: "Yo ends in -o for regular -ar, -er, and -ir verbs." },
  { id: "beber-tu", kind: "Regular -er verb", prompt: "Tú ___ café.", translation: "You drink coffee.", verb: "beber", person: "2nd person singular", clue: "beb- + -es", answers: ["bebes"], answer: "bebes", note: "Regular -er verbs use -es with tú." },
  { id: "aprender-el", kind: "Regular -er verb", prompt: "Él ___ español.", translation: "He learns Spanish.", verb: "aprender", person: "3rd person singular", clue: "aprend- + -e", answers: ["aprende"], answer: "aprende", note: "Regular -er verbs use -e with él, ella, or usted." },
  { id: "comer-nosotras", kind: "Regular -er verb", prompt: "Nosotras ___ juntas.", translation: "We eat together.", verb: "comer", person: "1st person plural", clue: "com- + -emos", answers: ["comemos"], answer: "comemos", note: "Regular -er verbs use -emos with nosotros or nosotras." },
  { id: "beber-vosotras", kind: "Regular -er verb", prompt: "Vosotras ___ agua.", translation: "You all drink water.", verb: "beber", person: "2nd person plural", clue: "beb- + -éis", answers: ["bebeis"], answer: "bebéis", note: "In Spain, regular -er verbs use -éis with vosotros or vosotras." },
  { id: "comprender-ellos", kind: "Regular -er verb", prompt: "Ellos ___ la pregunta.", translation: "They understand the question.", verb: "comprender", person: "3rd person plural", clue: "comprend- + -en", answers: ["comprenden"], answer: "comprenden", note: "Regular -er verbs use -en with ellos or ellas." },
  { id: "vivir-yo", kind: "Regular -ir verb", prompt: "Yo ___ en España.", translation: "I live in Spain.", verb: "vivir", person: "1st person singular", clue: "viv- + -o", answers: ["vivo"], answer: "vivo", note: "Regular -ir verbs also use -o with yo." },
  { id: "escribir-tu", kind: "Regular -ir verb", prompt: "Tú ___ un mensaje.", translation: "You write a message.", verb: "escribir", person: "2nd person singular", clue: "escrib- + -es", answers: ["escribes"], answer: "escribes", note: "Regular -ir verbs use -es with tú." },
  { id: "abrir-ella", kind: "Regular -ir verb", prompt: "Ella ___ la puerta.", translation: "She opens the door.", verb: "abrir", person: "3rd person singular", clue: "abr- + -e", answers: ["abre"], answer: "abre", note: "Regular -ir verbs use -e with él, ella, or usted." },
  { id: "vivir-nosotros", kind: "Regular -ir verb", prompt: "Nosotros ___ aquí.", translation: "We live here.", verb: "vivir", person: "1st person plural", clue: "viv- + -imos", answers: ["vivimos"], answer: "vivimos", note: "Regular -ir verbs use -imos with nosotros." },
  { id: "escribir-vosotros", kind: "Regular -ir verb", prompt: "Vosotros ___ correos.", translation: "You all write emails.", verb: "escribir", person: "2nd person plural", clue: "escrib- + -ís", answers: ["escribis"], answer: "escribís", note: "In Spain, regular -ir verbs use -ís with vosotros." },
  { id: "abrir-ellas", kind: "Regular -ir verb", prompt: "Ellas ___ las ventanas.", translation: "They open the windows.", verb: "abrir", person: "3rd person plural", clue: "abr- + -en", answers: ["abren"], answer: "abren", note: "Regular -ir verbs use -en with ellos or ellas." },
];

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

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? { cards: {}, streak: {} }; }
  catch { return { cards: {}, streak: {} }; }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function dayKey(date = new Date()) { return date.toISOString().slice(0, 10); }

function updateStreak() {
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - DAY));
  if (state.streak.last === today) return;
  state.streak.count = state.streak.last === yesterday ? (state.streak.count || 0) + 1 : 1;
  state.streak.last = today;
}

let state = typeof localStorage === "undefined" ? { cards: {}, streak: {} } : loadState();
let session = [];
let index = 0;
let score = 0;
let answered = false;
const element = (id) => document.getElementById(id);
const difficulty = () => document.querySelector('input[name="difficulty"]:checked').value;

function renderStats() {
  const now = Date.now();
  const records = Object.values(state.cards);
  element("due-count").textContent = cards.filter((card) => (state.cards[card.id]?.due ?? 0) <= now).length;
  element("learned-count").textContent = records.filter((record) => record.level >= 2).length;
  element("streak-count").textContent = state.streak.count || 0;
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
  element("answer-form").hidden = false;
  element("feedback").hidden = true;
  element("feedback").classList.remove("wrong");
  element("reveal-button").hidden = false;
  element("answer").focus({ preventScroll: true });
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

function finishSession() {
  updateStreak();
  saveState();
  renderStats();
  element("practice-card").hidden = true;
  document.querySelector(".difficulty").hidden = true;
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
  session = chooseSession(cards, state.cards);
  index = 0;
  score = 0;
  element("practice-card").hidden = false;
  document.querySelector(".difficulty").hidden = false;
  element("summary").hidden = true;
  renderStats();
  renderCard();
}

if (typeof document !== "undefined") {
  element("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const attempt = element("answer").value;
    if (!attempt.trim()) return element("answer").focus();
    showFeedback(isCorrect(session[index], attempt));
  });
  element("reveal-button").addEventListener("click", () => showFeedback(false));
  element("next-button").addEventListener("click", nextCard);
  element("restart-button").addEventListener("click", startSession);
  document.querySelectorAll('input[name="difficulty"]').forEach((input) => input.addEventListener("change", () => {
    if (!answered) renderCard();
  }));
  element("reset-button").addEventListener("click", () => {
    if (!confirm("Reset all saved practice progress on this device?")) return;
    state = { cards: {}, streak: {} };
    saveState();
    startSession();
  });
  startSession();
}
