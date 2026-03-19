const STORAGE_KEY = "unlimit-search-history";
const MAX_HISTORY = 10;
const THEME_KEY = "unlimit-search-theme";
const ONBOARDING_KEY = "unlimit-search-onboarding-dismissed";
const AI_MODE_KEY = "unlimit-search-ai-mode";
const AI_ENDPOINT = "http://127.0.0.1:8000/ai-search";

function isResultsPage() {
return window.location.pathname.toLowerCase().endsWith("results.html");
}

function getCurrentQuery() {
const params = new URLSearchParams(window.location.search);
return (params.get("q") || "").trim();
}

function isAiQuery() {
const params = new URLSearchParams(window.location.search);
return params.get("mode") === "ai";
}

function getHistory() {
try {
const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
return Array.isArray(parsed) ? parsed : [];
} catch {
return [];
}
}

function saveHistory(history) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function addToHistory(query) {
const clean = query.trim();
if (!clean) return;
const history = getHistory().filter((item) => item.toLowerCase() !== clean.toLowerCase());
history.unshift(clean);
saveHistory(history);
}

function clearHistory() {
localStorage.removeItem(STORAGE_KEY);
}

function getAiModeEnabled() {
return localStorage.getItem(AI_MODE_KEY) === "true";
}

function setAiModeEnabled(enabled) {
localStorage.setItem(AI_MODE_KEY, enabled ? "true" : "false");
}

function getSavedTheme() {
const theme = localStorage.getItem(THEME_KEY);
return theme === "dark" || theme === "light" ? theme : "light";
}

function applyTheme(theme) {
document.documentElement.setAttribute("data-theme", theme);
const themeToggle = document.getElementById("theme-toggle");
if (themeToggle) {
themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}
}

function toggleTheme() {
const current = document.documentElement.getAttribute("data-theme") || "light";
const next = current === "dark" ? "light" : "dark";
localStorage.setItem(THEME_KEY, next);
applyTheme(next);
}

function escapeHtml(value) {
const map = {
"&": "&amp;",
"<": "&lt;",
">": "&gt;",
'"': "&quot;",
"'": "&#039;"
};
return value.replace(/[&<>"']/g, (char) => map[char]);
}

function formatInlineMarkdown(text) {
return text
.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
.replace(/\*(.+?)\*/g, "<em>$1</em>")
.replace(/`(.+?)`/g, "<code>$1</code>");
}

function markdownToSafeHtml(markdown) {
const lines = escapeHtml(markdown || "").split(/\r?\n/);
const chunks = [];
let inList = false;

const closeList = () => {
if (!inList) return;
chunks.push("</ul>");
inList = false;
};

for (const rawLine of lines) {
const line = rawLine.trim();
if (!line) {
closeList();
continue;
}

const listMatch = line.match(/^[-*]\s+(.*)$/);
if (listMatch) {
if (!inList) {
chunks.push("<ul>");
inList = true;
}
chunks.push(`<li>${formatInlineMarkdown(listMatch[1])}</li>`);
continue;
}

closeList();
chunks.push(`<p>${formatInlineMarkdown(line)}</p>`);
}

closeList();
return chunks.join("");
}

function renderRecentSearches() {
const container = document.getElementById("recent-searches");
if (!container) return;

const history = getHistory();
if (!history.length) {
container.innerHTML = '<p class="empty-state">No searches yet. Your recent queries will show up here.</p>';
return;
}

const items = history
.map((query) => `<a class="recent-item" href="results.html?q=${encodeURIComponent(query)}">${escapeHtml(query)}</a>`)
.join("");

container.innerHTML = items;
}

function renderStats() {
const container = document.getElementById("search-stats");
if (!container) return;

const history = getHistory();
const uniqueTerms = new Set(history.map((item) => item.toLowerCase())).size;
const latest = history[0] || "-";

container.innerHTML = `
<article class="stat-card">
<p class="stat-label">Saved Queries</p>
<p class="stat-value">${history.length}</p>
</article>
<article class="stat-card">
<p class="stat-label">Unique Topics</p>
<p class="stat-value">${uniqueTerms}</p>
</article>
<article class="stat-card stat-card-wide">
<p class="stat-label">Latest Search</p>
<p class="stat-value stat-text">${escapeHtml(latest)}</p>
</article>
`;
}

function waitForSearchInput(callback) {
const existing = document.querySelector("input.gsc-input");
if (existing) {
callback(existing);
return;
}

const observer = new MutationObserver(() => {
const input = document.querySelector("input.gsc-input");
if (!input) return;
observer.disconnect();
callback(input);
});

observer.observe(document.body, { childList: true, subtree: true });
}

function getSearchInput() {
const homeInput = document.getElementById("home-query");
if (homeInput) return homeInput;

const resultsTopInput = document.getElementById("results-top-query");
if (resultsTopInput) return resultsTopInput;

return document.querySelector("input.gsc-input");
}

function ensureSuggestionContainer() {
let container = document.getElementById("search-suggestions");
if (container) return container;

container = document.createElement("div");
container.id = "search-suggestions";
container.className = "search-suggestions hidden";
container.setAttribute("role", "listbox");
document.body.appendChild(container);
return container;
}

function positionSuggestionContainer(container, input) {
const rect = input.getBoundingClientRect();
container.style.left = `${rect.left + window.scrollX}px`;
container.style.top = `${rect.bottom + window.scrollY + 8}px`;
container.style.width = `${rect.width}px`;
}

function navigateToResults(query) {
const params = new URLSearchParams();
params.set("q", query);
if (getAiModeEnabled()) {
params.set("mode", "ai");
}
window.location.href = `results.html?${params.toString()}`;
}

function getAiToggleButtons() {
const buttons = [...document.querySelectorAll("[data-ai-mode-toggle='true']")];
const legacyHome = document.getElementById("ai-mode-toggle");
if (legacyHome && !buttons.includes(legacyHome)) {
buttons.push(legacyHome);
}
return buttons;
}

function renderAiModeState() {
const stateText = document.getElementById("home-ai-state");
const enabled = getAiModeEnabled();

getAiToggleButtons().forEach((btn) => {
btn.classList.toggle("active", enabled);
btn.setAttribute("aria-pressed", enabled ? "true" : "false");
});

if (stateText) {
stateText.classList.toggle("hidden", !enabled);
}
}

function setupAiModeToggle() {
const buttons = getAiToggleButtons();
if (!buttons.length) return;

renderAiModeState();
buttons.forEach((btn) => {
btn.addEventListener("click", () => {
setAiModeEnabled(!getAiModeEnabled());
renderAiModeState();
});
});
}

async function fetchAiAnswer(query) {
const response = await fetch(AI_ENDPOINT, {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ query })
});

if (!response.ok) {
throw new Error(`AI endpoint returned ${response.status}`);
}

const data = await response.json();
return (data.answer || "").trim();
}

async function setupAiAnswerPanel() {
if (!isResultsPage() || !isAiQuery()) return;

setAiModeEnabled(true);
renderAiModeState();

const panel = document.getElementById("ai-answer-panel");
const status = document.getElementById("ai-answer-status");
const content = document.getElementById("ai-answer-content");
if (!panel || !status || !content) return;

panel.classList.remove("hidden");
const query = getCurrentQuery();
if (!query) {
status.textContent = "No query provided for AI mode.";
return;
}

try {
status.textContent = "Generating AI response...";
const answer = await fetchAiAnswer(query);
status.classList.add("hidden");
content.innerHTML = markdownToSafeHtml(answer || "No answer returned.");
} catch {
status.classList.remove("hidden");
status.textContent = "AI service is unavailable. Start ai.py and ensure GROQ_API_KEY is configured.";
content.textContent = "";
}
}

function setupHomeSearchForm() {
const form = document.getElementById("home-search-form");
const input = document.getElementById("home-query");
if (!form || !input) return;

form.addEventListener("submit", (event) => {
event.preventDefault();
const query = input.value.trim();
if (!query) {
input.focus();
return;
}
addToHistory(query);
navigateToResults(query);
});

setupSuggestionInteractions(input);
}

function setupResultsTopSearchForm() {
if (!isResultsPage()) return;

const form = document.getElementById("results-top-form");
const input = document.getElementById("results-top-query");
if (!form || !input) return;

const current = getCurrentQuery();
if (current) {
input.value = current;
}

form.addEventListener("submit", (event) => {
event.preventDefault();
const query = input.value.trim();
if (!query) {
input.focus();
return;
}

addToHistory(query);
const params = new URLSearchParams();
params.set("q", query);
if (getAiModeEnabled()) {
params.set("mode", "ai");
}
window.location.href = `results.html?${params.toString()}`;
});

setupSuggestionInteractions(input);
}

function renderSuggestions(input) {
const container = ensureSuggestionContainer();
const term = input.value.trim().toLowerCase();
if (!term) {
container.classList.add("hidden");
container.innerHTML = "";
return;
}

const suggestions = getHistory().filter((item) => item.toLowerCase().includes(term)).slice(0, 6);
if (!suggestions.length) {
container.classList.add("hidden");
container.innerHTML = "";
return;
}

container.innerHTML = suggestions
.map((query) => `<button type="button" class="suggestion-item" data-query="${encodeURIComponent(query)}">${escapeHtml(query)}</button>`)
.join("");

positionSuggestionContainer(container, input);
container.classList.remove("hidden");
}

function setupSuggestionInteractions(input) {
const container = ensureSuggestionContainer();

input.addEventListener("input", () => renderSuggestions(input));
input.addEventListener("focus", () => renderSuggestions(input));

input.addEventListener("blur", () => {
window.setTimeout(() => {
container.classList.add("hidden");
}, 120);
});

window.addEventListener("resize", () => {
if (!container.classList.contains("hidden")) {
positionSuggestionContainer(container, input);
}
});

window.addEventListener("scroll", () => {
if (!container.classList.contains("hidden")) {
positionSuggestionContainer(container, input);
}
});

container.addEventListener("click", (event) => {
const button = event.target.closest(".suggestion-item");
if (!button) return;
const query = decodeURIComponent(button.getAttribute("data-query") || "");
if (!query) return;
addToHistory(query);
navigateToResults(query);
});

input.addEventListener("keydown", (event) => {
if (event.key === "Escape") {
container.classList.add("hidden");
}
});
}

function setupSearchInput() {
if (!isResultsPage()) return;

waitForSearchInput((input) => {
const currentQuery = getCurrentQuery();
if (currentQuery) {
input.value = currentQuery;
}

input.addEventListener("keydown", (event) => {
if (event.key === "Enter") {
addToHistory(input.value);
}
});

input.setAttribute("aria-label", "Search query");
setupSuggestionInteractions(input);
});
}

function setupSearchButtonCapture() {
document.addEventListener("click", (event) => {
const button = event.target.closest(".gsc-search-button-v2, .gsc-search-button");
if (!button) return;
const input = document.querySelector("input.gsc-input");
if (input) addToHistory(input.value);
});
}

function setupGlobalShortcut() {
document.addEventListener("keydown", (event) => {
const isSlash = event.key === "/";
const isCommandPaletteLike = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
if (!isSlash && !isCommandPaletteLike) return;

const activeTag = (document.activeElement?.tagName || "").toLowerCase();
if (activeTag === "input" || activeTag === "textarea") return;

event.preventDefault();
const input = getSearchInput();
if (input) input.focus();
});
}

function setupThemeToggle() {
applyTheme(getSavedTheme());
const button = document.getElementById("theme-toggle");
if (!button) return;
button.addEventListener("click", toggleTheme);
}

function setupOnboardingTip() {
const tip = document.getElementById("onboarding-tip");
if (!tip) return;
const dismissed = localStorage.getItem(ONBOARDING_KEY) === "true";
if (dismissed) {
tip.classList.add("hidden");
return;
}

const dismissButton = document.getElementById("dismiss-onboarding");
if (!dismissButton) return;
dismissButton.addEventListener("click", () => {
localStorage.setItem(ONBOARDING_KEY, "true");
tip.classList.add("hidden");
});
}

function setupClearHistory() {
const button = document.getElementById("clear-history");
if (!button) return;
button.addEventListener("click", () => {
clearHistory();
renderRecentSearches();
renderStats();
});
}

function setupResultsContext() {
const target = document.getElementById("results-query");
if (!target) return;
const currentQuery = getCurrentQuery();
target.textContent = currentQuery || "your latest query";
if (currentQuery) addToHistory(currentQuery);
}

function setupResultsTabTransitions() {
if (!isResultsPage()) return;

document.addEventListener("click", (event) => {
const tab = event.target.closest(".gsc-tabHeader");
if (!tab) return;

const container = document.querySelector(".gsc-results-wrapper-overlay, .gsc-results-wrapper-nooverlay");
if (!container) return;

container.classList.add("tab-switching");
window.setTimeout(() => {
container.classList.remove("tab-switching");
}, 230);
});
}

document.addEventListener("DOMContentLoaded", () => {
setupThemeToggle();
setupOnboardingTip();
setupAiModeToggle();
setupHomeSearchForm();
setupResultsTopSearchForm();
setupSearchInput();
setupSearchButtonCapture();
setupGlobalShortcut();
setupClearHistory();
setupResultsContext();
setupResultsTabTransitions();
setupAiAnswerPanel();
renderRecentSearches();
renderStats();
});
