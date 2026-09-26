const DAY = 86_400_000;
const SESSION_SIZE = 10;
const STORAGE_KEY = "dale-progress-v1";
const INTERVALS = [1, 3, 7, 14, 30];

const starterCards = [
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

const people = [
  { slug: "yo", subject: "Yo", label: "1st person singular", english: "I" },
  { slug: "tu", subject: "Tú", label: "2nd person singular", english: "You" },
  { slug: "ella", subject: "Ella", label: "3rd person singular", english: "She" },
  { slug: "nosotros", subject: "Nosotros", label: "1st person plural", english: "We" },
  { slug: "vosotros", subject: "Vosotros", label: "2nd person plural", english: "You all" },
  { slug: "ellos", subject: "Ellos", label: "3rd person plural", english: "They" },
];

const numberCards = [
  [1, "uno", ["uno", "una", "un"]], [2, "dos"], [3, "tres"], [4, "cuatro"], [5, "cinco"],
  [6, "seis"], [7, "siete"], [8, "ocho"], [9, "nueve"], [10, "diez"], [11, "once"],
  [12, "doce"], [13, "trece"], [14, "catorce"], [15, "quince"], [16, "dieciséis"],
  [17, "diecisiete"], [18, "dieciocho"], [19, "diecinueve"], [20, "veinte"],
  [21, "veintiuno", ["veintiuno", "veintiuna", "veintiun"]], [22, "veintidós"],
  [23, "veintitrés"], [24, "veinticuatro"], [25, "veinticinco"], [26, "veintiséis"],
  [27, "veintisiete"], [28, "veintiocho"], [29, "veintinueve"], [30, "treinta"],
  [31, "treinta y uno", ["treinta y uno", "treinta y una", "treinta y un"]], [32, "treinta y dos"],
  [40, "cuarenta"], [50, "cincuenta"], [60, "sesenta"], [70, "setenta"], [80, "ochenta"],
  [90, "noventa"], [100, "cien"], [101, "ciento uno"], [182, "ciento ochenta y dos"],
  [200, "doscientos", ["doscientos", "doscientas"]], [300, "trescientos", ["trescientos", "trescientas"]],
  [400, "cuatrocientos", ["cuatrocientos", "cuatrocientas"]], [500, "quinientos", ["quinientos", "quinientas"]],
  [600, "seiscientos", ["seiscientos", "seiscientas"]], [700, "setecientos", ["setecientos", "setecientas"]],
  [800, "ochocientos", ["ochocientos", "ochocientas"]], [900, "novecientos", ["novecientos", "novecientas"]],
  [1000, "mil"], [1001, "mil uno"], [1010, "mil diez"], [1100, "mil cien"],
  [10000, "diez mil"], [100000, "cien mil"], [1000000, "un millón"],
].map(([number, answer, answers = [answer]]) => ({
  id: `number-${number}`,
  topic: "numbers",
  kind: "Numbers",
  prompt: `${number.toLocaleString("en-US")} → ___`,
  translation: "Write the number in Spanish.",
  answers,
  answer,
  note: number >= 1000 ? "Mil is not plural in compound numbers." : "Say it aloud once more before moving on.",
}));

const nationalities = [
  ["estados-unidos", "Estados Unidos", "estadounidense", "estadounidense"],
  ["alemania", "Alemania", "alemán", "alemana"], ["inglaterra", "Inglaterra", "inglés", "inglesa"],
  ["argentina", "Argentina", "argentino", "argentina"], ["japon", "Japón", "japonés", "japonesa"],
  ["belgica", "Bélgica", "belga", "belga"], ["italia", "Italia", "italiano", "italiana"],
  ["noruega", "Noruega", "noruego", "noruega"], ["espana", "España", "español", "española"],
  ["portugal", "Portugal", "portugués", "portuguesa"], ["francia", "Francia", "francés", "francesa"],
  ["uganda", "Uganda", "ugandés", "ugandesa"],
].flatMap(([slug, country, masculine, feminine]) => [
  { id: `nationality-${slug}-m`, topic: "people", kind: "Nationalities", prompt: `Él es de ${country}. Es ___.`, translation: `He is from ${country}.`, person: "masculine singular", answers: [masculine], answer: masculine, note: "Nationality words agree with the person." },
  { id: `nationality-${slug}-f`, topic: "people", kind: "Nationalities", prompt: `Ella es de ${country}. Es ___.`, translation: `She is from ${country}.`, person: "feminine singular", answers: [feminine], answer: feminine, note: masculine === feminine ? "This nationality has the same form for men and women." : "Nationality words agree with the person." },
]);

const professions = [
  ["business-owner", "business owner", "empresario", "empresaria"], ["photographer", "photographer", "fotógrafo", "fotógrafa"],
  ["dentist", "dentist", "dentista", "dentista"], ["doctor", "doctor", "médico", "médica"],
  ["journalist", "journalist", "periodista", "periodista"], ["engineer", "engineer", "ingeniero", "ingeniera"],
  ["teacher", "teacher", "profesor", "profesora"], ["lawyer", "lawyer", "abogado", "abogada"],
  ["waiter", "waiter", "camarero", "camarera"],
].flatMap(([slug, english, masculine, feminine]) => [
  { id: `profession-${slug}-m`, topic: "people", kind: "Professions", prompt: `Él es ___.`, translation: `Profession: ${english}.`, person: "masculine singular", answers: [masculine], answer: masculine, note: "After ser, professions normally do not need un or una." },
  { id: `profession-${slug}-f`, topic: "people", kind: "Professions", prompt: `Ella es ___.`, translation: `Profession: ${english}.`, person: "feminine singular", answers: [feminine], answer: feminine, note: masculine === feminine ? "This profession has the same form for men and women." : "The ending agrees with the person." },
]);

const regularVerbs = [
  ["cocinar", "cocin", ["cocino", "cocinas", "cocina", "cocinamos", "cocináis", "cocinan"], "en casa", "cook", "at home"],
  ["nadar", "nad", ["nado", "nadas", "nada", "nadamos", "nadáis", "nadan"], "los sábados", "swim", "on Saturdays"],
  ["limpiar", "limpi", ["limpio", "limpias", "limpia", "limpiamos", "limpiáis", "limpian"], "la cocina", "clean", "the kitchen"],
  ["visitar", "visit", ["visito", "visitas", "visita", "visitamos", "visitáis", "visitan"], "museos", "visit", "museums"],
  ["cantar", "cant", ["canto", "cantas", "canta", "cantamos", "cantáis", "cantan"], "en la ducha", "sing", "in the shower"],
  ["correr", "corr", ["corro", "corres", "corre", "corremos", "corréis", "corren"], "en el parque", "run", "in the park"],
].flatMap(([verb, stem, forms, tail, englishVerb, englishTail]) => people.map((person, position) => ({
  id: `${verb}-${person.slug}-lesson`,
  topic: "verbs",
  kind: `Regular -${verb.slice(-2)} verb`,
  prompt: `${person.subject} ___ ${tail}.`,
  translation: `${person.english} ${englishVerb}${position === 2 ? "s" : ""} ${englishTail}.`,
  verb,
  person: person.label,
  clue: `${stem}- + ${forms[position].slice(stem.length)}`,
  answers: [forms[position]],
  answer: forms[position],
  note: `This is the present tense of ${verb}.`,
})));

const irregularVerbs = [
  ["ser", ["soy", "eres", "es", "somos", "sois", "son"], "de Suecia", "from Sweden"],
  ["estar", ["estoy", "estás", "está", "estamos", "estáis", "están"], "en casa", "at home"],
  ["tener", ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"], "mucho trabajo", "a lot of work"],
  ["querer", ["quiero", "quieres", "quiere", "queremos", "queréis", "quieren"], "comer ahora", "to eat now"],
].flatMap(([verb, forms, tail, englishTail]) => people.map((person, position) => ({
  id: `${verb}-${person.slug}`,
  topic: "verbs",
  kind: "Useful irregular verb",
  prompt: `${person.subject} ___ ${tail}.`,
  translation: `Use ${verb} with ${person.subject.toLowerCase()}: ${englishTail}.`,
  verb,
  person: person.label,
  answers: [forms[position]],
  answer: forms[position],
  note: `${verb} is irregular, so learn its present-tense forms as a pattern.`,
})));

const lessonPhrases = [
  { id: "what-is-up", kind: "Conversation", prompt: "How’s it going?", translation: "Use the short greeting from class.", answers: ["que tal"], answer: "¿Qué tal?", note: "A common, informal way to ask how things are." },
  { id: "what-is-your-name", kind: "Introductions", prompt: "What is your name?", translation: "Ask one person informally.", answers: ["como te llamas"], answer: "¿Cómo te llamas?", note: "The reply begins Me llamo…" },
  { id: "my-name-is", kind: "Introductions", prompt: "My name is Ana.", translation: "Introduce yourself.", answers: ["me llamo ana"], answer: "Me llamo Ana.", note: "Literally: I call myself Ana." },
  { id: "where-from", kind: "Introductions", prompt: "Where are you from?", translation: "Ask one person informally.", answers: ["de donde eres"], answer: "¿De dónde eres?", note: "Use ser for origin." },
  { id: "from-sweden", kind: "Introductions", prompt: "I am from Sweden.", translation: "Reply in Spanish.", answers: ["soy de suecia"], answer: "Soy de Suecia.", note: "Use ser + de + place." },
  { id: "what-work", kind: "Introductions", prompt: "What do you do for work?", translation: "Use the trabajar question from class.", answers: ["en que trabajas"], answer: "¿En qué trabajas?", note: "You can also ask ¿A qué te dedicas?" },
  { id: "what-do-you-do", kind: "Introductions", prompt: "What do you do?", translation: "Use the dedicarse question from class.", answers: ["a que te dedicas"], answer: "¿A qué te dedicas?", note: "A natural way to ask about someone’s work." },
  { id: "age-question", kind: "Introductions", prompt: "How old are you?", translation: "Ask one person informally.", answers: ["cuantos anos tienes"], answer: "¿Cuántos años tienes?", note: "Spanish uses tener, to have, for age." },
  { id: "age-answer", kind: "Introductions", prompt: "I am forty-two years old.", translation: "Reply in Spanish.", answers: ["tengo cuarenta y dos anos"], answer: "Tengo cuarenta y dos años.", note: "Literally: I have forty-two years." },
  { id: "children-question", kind: "Introductions", prompt: "Do you have children?", translation: "Ask one person informally.", answers: ["tienes hijos"], answer: "¿Tienes hijos?", note: "Tienes is the tú form of tener." },
  { id: "phone-question", kind: "Introductions", prompt: "Do you have a mobile phone?", translation: "Ask one person informally.", answers: ["tienes movil"], answer: "¿Tienes móvil?", note: "Móvil has an accent on the first syllable." },
  { id: "email-question", kind: "Introductions", prompt: "Do you have an email address?", translation: "Ask one person informally.", answers: ["tienes correo electronico"], answer: "¿Tienes correo electrónico?", note: "Correo electrónico means email address." },
  { id: "free-time", kind: "Likes & plans", prompt: "What do you like doing in your free time?", translation: "Ask one person informally.", answers: ["que te gusta hacer en tu tiempo libre"], answer: "¿Qué te gusta hacer en tu tiempo libre?", note: "An activity after gustar stays in the infinitive." },
  { id: "like-chocolate", kind: "Likes & plans", prompt: "Nos ___ el chocolate.", translation: "We like chocolate.", verb: "gustar", answers: ["gusta"], answer: "gusta", note: "Chocolate is singular, so use gusta." },
  { id: "like-cats", kind: "Likes & plans", prompt: "Nos ___ los gatos.", translation: "We like cats.", verb: "gustar", answers: ["gustan"], answer: "gustan", note: "Gatos is plural, so use gustan." },
  { id: "me-too", kind: "Agreeing", prompt: "Me gusta cocinar. — Me too.", translation: "Agree in Spanish.", answers: ["a mi tambien", "yo tambien"], answer: "A mí también.", note: "También agrees with an affirmative statement." },
  { id: "me-neither", kind: "Agreeing", prompt: "No me gusta correr. — Me neither.", translation: "Agree in Spanish.", answers: ["a mi tampoco", "yo tampoco"], answer: "A mí tampoco.", note: "Tampoco agrees with a negative statement." },
  { id: "not-me", kind: "Agreeing", prompt: "Me gusta correr. — I don’t.", translation: "Disagree in Spanish.", answers: ["a mi no", "yo no"], answer: "A mí no.", note: "Use no to disagree with an affirmative statement." },
  { id: "but-i-do", kind: "Agreeing", prompt: "No me gusta correr. — I do.", translation: "Disagree in Spanish.", answers: ["a mi si", "yo si"], answer: "A mí sí.", note: "Use sí to disagree with a negative statement." },
  { id: "want-dinner", kind: "Likes & plans", prompt: "Do you want to go out for dinner?", translation: "Ask one person informally.", answers: ["quieres salir a cenar"], answer: "¿Quieres salir a cenar?", note: "Querer is followed by an infinitive." },
  { id: "want-beer", kind: "Likes & plans", prompt: "I want a beer.", translation: "Order in Spanish.", answers: ["quiero una cerveza"], answer: "Quiero una cerveza.", note: "Quiero is the yo form of querer." },
];

function starterTopic(card) {
  if (card.kind.startsWith("Regular")) return "verbs";
  if (card.kind === "Likes") return "plans";
  return "conversation";
}

export const cards = [
  ...starterCards.map((card) => ({ ...card, topic: starterTopic(card) })),
  ...numberCards,
  ...nationalities,
  ...professions,
  ...regularVerbs,
  ...irregularVerbs,
  ...lessonPhrases.map((card) => ({ ...card, topic: card.kind === "Introductions" ? "conversation" : "plans" })),
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

function emptyState() { return { cards: {}, streak: {}, updatedAt: 0 }; }

function normalizeState(saved) {
  if (!saved || typeof saved !== "object") return emptyState();
  const normalized = {
    cards: saved.cards && typeof saved.cards === "object" ? saved.cards : {},
    streak: saved.streak && typeof saved.streak === "object" ? saved.streak : {},
    updatedAt: Number.isFinite(saved.updatedAt) ? saved.updatedAt : 0,
  };
  if (!normalized.updatedAt && (Object.keys(normalized.cards).length || normalized.streak.count)) normalized.updatedAt = Date.now();
  return normalized;
}

function loadState() {
  try { return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { return emptyState(); }
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
  const records = Object.values(state.cards);
  element("due-count").textContent = cards.filter((card) => (state.cards[card.id]?.due ?? 0) <= now).length;
  element("learned-count").textContent = records.filter((record) => record.level >= 2).length;
  element("streak-count").textContent = state.streak.count || 0;
  element("deck-count").textContent = cards.length;
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
  const topic = element("topic-filter").value;
  const pool = topic === "all" ? cards : cards.filter((card) => card.topic === topic);
  session = chooseSession(pool, state.cards);
  index = 0;
  score = 0;
  element("practice-card").hidden = false;
  document.querySelector(".session-controls").hidden = false;
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
  element("show-answer-button").addEventListener("click", revealSpokenAnswer);
  element("missed-button").addEventListener("click", () => gradeSpokenAnswer(false));
  element("remembered-button").addEventListener("click", () => gradeSpokenAnswer(true));
  element("next-button").addEventListener("click", nextCard);
  element("restart-button").addEventListener("click", startSession);
  element("topic-filter").addEventListener("change", startSession);
  element("speaking-mode").addEventListener("change", () => {
    if (!answered) renderCard();
  });
  document.querySelectorAll('input[name="difficulty"]').forEach((input) => input.addEventListener("change", () => {
    if (!answered) renderCard();
  }));
  element("reset-button").addEventListener("click", () => {
    if (!confirm("Reset all saved practice progress on every device?")) return;
    state = emptyState();
    saveState();
    startSession();
  });
  hydrateUser();
  hydrateState().finally(startSession);
}
