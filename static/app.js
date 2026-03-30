const WATCHLIST = ["TSLA", "NVDA", "AMZN", "AAPL", "MSFT", "GOOGL"];
const ASSISTANT_MODELS = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
  { id: "claude", label: "Claude" },
  { id: "grok", label: "Grok" },
  { id: "perplexity", label: "Perplexity" },
];
const WATCHLIST_META = {
  TSLA: { name: "Tesla Inc.", badge: "TS", accent: "#ff6b61" },
  NVDA: { name: "NVIDIA Corp.", badge: "NV", accent: "#58d17a" },
  AMZN: { name: "Amazon.com Inc.", badge: "AM", accent: "#ffb24d" },
  AAPL: { name: "Apple Inc.", badge: "AP", accent: "#8ea6c9" },
  MSFT: { name: "Microsoft Corp.", badge: "MS", accent: "#61a9ff" },
  GOOGL: { name: "Alphabet Inc.", badge: "GO", accent: "#6b8dff" },
};
const THEME_STORAGE_KEY = "trading-pro-theme";
const HISTORY_RANGE_DAYS = {
  "3m": 63,
  "6m": 126,
  "1y": 252,
  "2y": 504,
};
const DEFAULT_HISTORY_RANGE = "6m";
const FEATURE_LABELS = {
  Close_lag1: "Prev Close",
  Close_lag5: "5D Anchor",
  Close_lag10: "10D Anchor",
  Return_1d: "1D Return",
  Return_5d: "5D Return",
  Return_20d: "20D Return",
  MA_10: "10D Average",
  MA_50: "50D Average",
  MA_200: "200D Average",
  Volatility_10d: "10D Volatility",
  Volatility_30d: "30D Volatility",
  RSI: "RSI",
  Month: "Month",
  Quarter: "Quarter",
  DayOfWeek: "Day of Week",
  Momentum20: "20D Momentum",
  GeoSignal: "Geo Signal",
  Sentiment: "News Sentiment",
};
const DRIVER_EXPLANATIONS = {
  "Prev Close": "This shows how the last closing price affects the forecast.",
  "5D Anchor": "This shows where the stock was trading about 5 days ago.",
  "10D Anchor": "This shows where the stock was trading about 10 days ago.",
  "1D Return": "This shows how the stock moved over the last day.",
  "5D Return": "This shows how the stock moved over the last 5 days.",
  "20D Return": "This shows how the stock moved over the last 20 days.",
  "10D Average": "This shows the average price over the last 10 days.",
  "50D Average": "This shows the average price over the last 50 days.",
  "200D Average": "This shows the long-term average price over the last 200 days.",
  "10D Volatility": "This shows how jumpy the stock has been recently.",
  "30D Volatility": "This shows how jumpy the stock has been over the last month.",
  RSI: "This shows if the stock may be overbought or oversold.",
  Month: "This shows how this time of year has behaved in the past.",
  Quarter: "This shows how this part of the year has behaved in the past.",
  "Day of Week": "This shows if this day of the week matters in the data.",
  "20D Momentum": "This shows whether the recent trend has been moving up or down.",
  "Geo Signal": "This shows whether global market exposure is helping or hurting the stock.",
  "News Sentiment": "This shows whether recent news is helping or hurting the stock.",
};

let activeTicker = WATCHLIST[0];
let activeAssistantModel = ASSISTANT_MODELS[0].id;
let lastPrompt = "";
let priceChart = null;
let watchlistSnapshot = [];
let geoMap = null;
let geoTileLayer = null;
let geoMarkers = [];
let latestMapInsights = null;
let activeGeoMode = "investments";
let lastScrollY = window.scrollY;
let hasPromptHistory = false;
let attachedFiles = [];
let dashboardPrimed = false;
let latestNewsItems = [];
let newsExpanded = false;
let latestPrediction = null;
let activeHistoryRange = DEFAULT_HISTORY_RANGE;

const elements = {
  workspace: document.querySelector(".workspace"),
  heroPanel: document.getElementById("heroPanel"),
  heroCopy: document.querySelector(".hero-copy"),
  composerDock: document.getElementById("composerDock"),
  resultsShell: document.getElementById("resultsShell"),
  modelPillRow: document.getElementById("modelPillRow"),
  landingStockRail: document.getElementById("landingStockRail"),
  assistantForm: document.getElementById("assistantForm"),
  assistantModelSelect: document.getElementById("assistantModelSelect"),
  themeToggle: document.getElementById("themeToggle"),
  themeToggleLabel: document.getElementById("themeToggleLabel"),
  attachmentBtn: document.getElementById("attachmentBtn"),
  attachmentInput: document.getElementById("attachmentInput"),
  attachmentStrip: document.getElementById("attachmentStrip"),
  promptInput: document.getElementById("promptInput"),
  loadTickerBtn: document.getElementById("loadTickerBtn"),
  refreshBtn: document.getElementById("refreshBtn"),
  asOfText: document.getElementById("asOfText"),
  marketCards: document.getElementById("marketCards"),
  assistantSwitch: document.getElementById("assistantSwitch"),
  activeTickerLabel: document.getElementById("activeTickerLabel"),
  tickerTitle: document.getElementById("tickerTitle"),
  priceLine: document.getElementById("priceLine"),
  predictionDirection: document.getElementById("predictionDirection"),
  predictionDirectionCopy: document.getElementById("predictionDirectionCopy"),
  deltaPill: document.getElementById("deltaPill"),
  deltaPill30: document.getElementById("deltaPill30"),
  historyRangeToggle: document.getElementById("historyRangeToggle"),
  historyRangeLabel: document.getElementById("historyRangeLabel"),
  tradeCallCard: document.getElementById("tradeCallCard"),
  tradeCallAction: document.getElementById("tradeCallAction"),
  tradeCallSummary: document.getElementById("tradeCallSummary"),
  tradeCallMeta: document.getElementById("tradeCallMeta"),
  analysisSummaryText: document.getElementById("analysisSummaryText"),
  analysisSummaryReasons: document.getElementById("analysisSummaryReasons"),
  confidenceValue: document.getElementById("confidenceValue"),
  confidenceMeter: document.getElementById("confidenceMeter"),
  targetValue: document.getElementById("targetValue"),
  targetMeter: document.getElementById("targetMeter"),
  target30Value: document.getElementById("target30Value"),
  target30Meter: document.getElementById("target30Meter"),
  riskValue: document.getElementById("riskValue"),
  riskMeter: document.getElementById("riskMeter"),
  aiScoreValue: document.getElementById("aiScoreValue"),
  sentimentValue: document.getElementById("sentimentValue"),
  rsiValue: document.getElementById("rsiValue"),
  volatilityValue: document.getElementById("volatilityValue"),
  avgVolumeValue: document.getElementById("avgVolumeValue"),
  momentumValue: document.getElementById("momentumValue"),
  modelValue: document.getElementById("modelValue"),
  testMaeValue: document.getElementById("testMaeValue"),
  driverList: document.getElementById("driverList"),
  newsList: document.getElementById("newsList"),
  newsToggleBtn: document.getElementById("newsToggleBtn"),
  mapProviderText: document.getElementById("mapProviderText"),
  sentimentMap: document.getElementById("sentimentMap"),
  geoModeBar: document.getElementById("geoModeBar"),
  regionModeText: document.getElementById("regionModeText"),
  regionList: document.getElementById("regionList"),
};

function sanitizeTicker(raw) {
  return (raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9.^-]/g, "")
    .slice(0, 12);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(2)}%`;
}

function formatSignedCurrency(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${sign}${formatCurrency(Math.abs(number))}`;
}

function formatSignedScore(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(3)}`;
}

function formatDateLabel(dateText) {
  const parsed = new Date(dateText);
  if (Number.isNaN(parsed.getTime())) {
    return dateText;
  }
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCompact(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function setTextIfPresent(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function clampNumber(value, lower, upper) {
  return Math.min(upper, Math.max(lower, Number(value || 0)));
}

function prettifyFeatureLabel(featureName) {
  if (FEATURE_LABELS[featureName]) {
    return FEATURE_LABELS[featureName];
  }

  return String(featureName || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed (${response.status})`);
  }
  return response.json();
}

function badgeClassFromSentiment(sentiment) {
  const value = (sentiment || "").toLowerCase();
  if (value === "bullish") {
    return "bullish";
  }
  if (value === "bearish") {
    return "bearish";
  }
  return "neutral";
}

function mapColorByScore(score) {
  if (score > 0.035) {
    return "#27d68f";
  }
  if (score < -0.035) {
    return "#ff6d7f";
  }
  return "#7ab4ff";
}

function geoModeColor(mode, score) {
  const normalizedMode = mode || "investments";
  if (normalizedMode === "origin") {
    if (score > 0.035) {
      return "#2bd8c7";
    }
    if (score < -0.035) {
      return "#168b80";
    }
    return "#6be6d9";
  }
  if (normalizedMode === "affected") {
    if (score > 0.035) {
      return "#ffbe62";
    }
    if (score < -0.035) {
      return "#f28b6e";
    }
    return "#ffd69b";
  }
  return mapColorByScore(score);
}

function autoResizePrompt() {
  if (!elements.promptInput) {
    return;
  }
  elements.promptInput.style.height = "auto";
  elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 180)}px`;
}

function syncLandingComposerPosition() {
  if (!elements.workspace || !elements.heroCopy) {
    return;
  }

  if (document.body.classList.contains("has-results")) {
    elements.workspace.style.removeProperty("--landing-composer-top");
    return;
  }

  const workspaceRect = elements.workspace.getBoundingClientRect();
  const heroCopyRect = elements.heroCopy.getBoundingClientRect();
  const composerTop = Math.max(0, heroCopyRect.bottom - workspaceRect.top + 20);

  elements.workspace.style.setProperty("--landing-composer-top", `${Math.round(composerTop)}px`);
}

function getThemeTokens() {
  const isLight = document.body.dataset.theme === "light";
  return {
    titleColor: isLight ? "#12253d" : "#e7f1ff",
    legendColor: isLight ? "#27415f" : "#d9e8ff",
    tickColor: isLight ? "#6b7d95" : "#8fa9d4",
    gridColor: isLight ? "rgba(69, 101, 145, 0.09)" : "rgba(140, 163, 209, 0.08)",
  };
}

function refreshChartTheme() {
  if (!priceChart) {
    return;
  }

  const theme = getThemeTokens();
  priceChart.options.plugins.legend.labels.color = theme.legendColor;
  priceChart.options.plugins.title.color = theme.titleColor;
  priceChart.options.scales.x.ticks.color = theme.tickColor;
  priceChart.options.scales.x.grid.color = theme.gridColor;
  priceChart.options.scales.y.ticks.color = theme.tickColor;
  priceChart.options.scales.y.grid.color = theme.gridColor;
  priceChart.update();
}

function applyTheme(theme, persist = true) {
  const nextTheme = theme === "light" ? "light" : "dark";
  document.body.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;

  if (elements.themeToggle) {
    const isLight = nextTheme === "light";
    elements.themeToggle.setAttribute("aria-pressed", String(isLight));
    elements.themeToggle.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
  }

  if (elements.themeToggleLabel) {
    elements.themeToggleLabel.textContent = nextTheme === "light" ? "Light" : "Dark";
  }

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (error) {
      console.warn("Unable to persist theme choice", error);
    }
  }

  refreshChartTheme();
}

function loadStoredTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) || "dark";
  } catch (error) {
    return "dark";
  }
}

function fileIdentity(file) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function renderAttachments() {
  if (!elements.attachmentStrip) {
    return;
  }

  elements.attachmentStrip.innerHTML = "";

  if (!attachedFiles.length) {
    elements.attachmentStrip.classList.add("hidden");
    return;
  }

  attachedFiles.forEach((file) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";

    const typeLabel = file.type.startsWith("image/") ? "Image" : "File";
    chip.innerHTML = `
      <span>${typeLabel}</span>
      <span class="attachment-chip-label" title="${file.name}">${file.name}</span>
      <button class="attachment-remove" type="button" aria-label="Remove ${file.name}">×</button>
    `;

    chip.querySelector(".attachment-remove")?.addEventListener("click", () => {
      attachedFiles = attachedFiles.filter((item) => fileIdentity(item) !== fileIdentity(file));
      renderAttachments();
    });

    elements.attachmentStrip.appendChild(chip);
  });

  elements.attachmentStrip.classList.remove("hidden");
}

function resetLandingState() {
  hasPromptHistory = false;
  dashboardPrimed = false;
  attachedFiles = [];
  latestMapInsights = null;
  renderAttachments();
  resetPromptField();
  document.body.classList.remove("has-results", "has-prompt-history", "composer-compact");
  elements.resultsShell.classList.add("hidden");
  syncLandingComposerPosition();
}

function inferTickerFromPrompt(promptText) {
  const tokens = String(promptText || "").match(/[A-Za-z][A-Za-z0-9.^-]{0,11}/g);
  if (!tokens) {
    return "";
  }

  const ignoreWords = new Set([
    "A",
    "SHOW",
    "WITH",
    "WHAT",
    "WHATS",
    "IS",
    "ARE",
    "DO",
    "DOES",
    "CAN",
    "COULD",
    "WOULD",
    "SHOULD",
    "HOW",
    "WHY",
    "WHEN",
    "WHERE",
    "TELL",
    "ABOUT",
    "NEXT",
    "ANOTHER",
    "ANY",
    "CHECK",
    "CLAUDE",
    "DAYS",
    "DAY",
    "WEEK",
    "WEEKS",
    "MONTH",
    "MONTHS",
    "YEAR",
    "YEARS",
    "OPENAI",
    "GEMINI",
    "CLAUDE",
    "GROK",
    "PERPLEXITY",
    "AND",
    "THE",
    "FOR",
    "OF",
    "TO",
    "IN",
    "OUTLOOK",
    "STOCK",
    "STOCKS",
    "ANALYZE",
    "STUDY",
    "COMPARE",
    "ME",
    "PREDICT",
    "PREDICTION",
    "PREDICTIONS",
    "FORECAST",
    "FIND",
    "IF",
    "LATEST",
    "MIND",
    "MY",
    "ON",
    "PRICE",
    "REVIEW",
    "SEARCH",
    "THIS",
    "USE",
    "USED",
    "YOU",
  ]);

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (WATCHLIST.includes(upper)) {
      return upper;
    }
  }

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (ignoreWords.has(upper) || upper.length > 5 || upper === "AI") {
      continue;
    }

    if (/^[A-Z0-9.^-]{1,5}$/.test(token) && /[A-Z]/.test(token)) {
      return upper;
    }
  }

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (ignoreWords.has(upper) || upper.length < 2 || upper.length > 5 || upper === "AI") {
      continue;
    }

    if (/^[A-Z0-9.^-]{2,5}$/.test(upper)) {
      return upper;
    }
  }

  return "";
}

function inferAssistantModelFromPrompt(promptText) {
  const text = String(promptText || "").toLowerCase();
  if (!text) {
    return "";
  }

  const modelMatchers = [
    { id: "openai", patterns: ["openai", "open ai", "gpt", "chatgpt"] },
    { id: "gemini", patterns: ["gemini", "google gemini"] },
    { id: "claude", patterns: ["claude", "anthropic"] },
    { id: "grok", patterns: ["grok", "xai", "x.ai"] },
    { id: "perplexity", patterns: ["perplexity", "sonar"] },
  ];

  for (const model of modelMatchers) {
    if (model.patterns.some((pattern) => text.includes(pattern))) {
      return model.id;
    }
  }

  return "";
}

function showAnalysisLoading() {
  elements.resultsShell.classList.remove("hidden");
  document.body.classList.add("has-results");
}

function hideAnalysisLoading() {}

function scrollToAnalysis() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function setLoadingState(isLoading) {
  if (elements.loadTickerBtn) {
    elements.loadTickerBtn.disabled = isLoading;
    elements.loadTickerBtn.textContent = isLoading ? "Analyzing..." : "Analyze";
    elements.loadTickerBtn.classList.toggle("is-loading", isLoading);
  }
  if (elements.refreshBtn) {
    elements.refreshBtn.disabled = isLoading;
  }
  if (elements.promptInput) {
    elements.promptInput.disabled = isLoading;
  }
  if (elements.assistantModelSelect) {
    elements.assistantModelSelect.disabled = isLoading;
  }
  if (elements.attachmentBtn) {
    elements.attachmentBtn.disabled = isLoading;
  }
  if (elements.attachmentInput) {
    elements.attachmentInput.disabled = isLoading;
  }
}

function resetPromptField() {
  if (!elements.promptInput) {
    return;
  }

  elements.promptInput.value = "";
  elements.promptInput.placeholder = "What's next on your mind?";
  autoResizePrompt();
}

function lockComposerAfterFirstSearch() {
  if (hasPromptHistory) {
    return;
  }

  hasPromptHistory = true;
  document.body.classList.add("has-prompt-history");
  document.body.classList.remove("composer-compact");
}

function syncComposerStateOnScroll() {
  if (document.body.classList.contains("has-prompt-history")) {
    document.body.classList.remove("composer-compact");
    return;
  }

  const currentY = window.scrollY;
  const delta = currentY - lastScrollY;
  const nearTop = currentY < 90;

  if (nearTop || delta < -8) {
    document.body.classList.remove("composer-compact");
  } else if (delta > 8) {
    document.body.classList.add("composer-compact");
  }

  lastScrollY = currentY;
}

function currentAssistantLabel() {
  const model = ASSISTANT_MODELS.find((item) => item.id === activeAssistantModel);
  return model ? model.label : "OpenAI";
}

function buildAnalysisPrompt(ticker) {
  const cleanTicker = sanitizeTicker(ticker) || WATCHLIST[0];
  return `Analyze ${cleanTicker} with ${currentAssistantLabel()} for 7-day and 30-day stock outlook`;
}

function setAssistantModel(modelId) {
  activeAssistantModel = modelId;
  if (elements.assistantModelSelect) {
    elements.assistantModelSelect.value = modelId;
  }
  const pills = elements.modelPillRow?.querySelectorAll(".model-pill") || [];
  pills.forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.model === modelId);
  });
  const switchButtons = elements.assistantSwitch?.querySelectorAll(".ticker-chip") || [];
  switchButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.model === modelId);
  });
  if (elements.asOfText && watchlistSnapshot.length) {
    elements.asOfText.textContent = `Click any stock to run it with ${currentAssistantLabel()}`;
  }
  if (watchlistSnapshot.length) {
    renderLandingCards(watchlistSnapshot);
  }
}

function renderModelControls() {
  elements.assistantModelSelect.innerHTML = "";
  elements.modelPillRow.innerHTML = "";

  ASSISTANT_MODELS.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.label;
    elements.assistantModelSelect.appendChild(option);

    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `model-pill${model.id === activeAssistantModel ? " active" : ""}`;
    pill.dataset.model = model.id;
    pill.textContent = model.label;
    pill.addEventListener("click", () => setAssistantModel(model.id));
    elements.modelPillRow.appendChild(pill);
  });

  elements.assistantModelSelect.value = activeAssistantModel;
}

function renderAssistantSwitch() {
  if (!elements.assistantSwitch) {
    return;
  }

  elements.assistantSwitch.innerHTML = "";
  ASSISTANT_MODELS.forEach((model) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ticker-chip${model.id === activeAssistantModel ? " active" : ""}`;
    btn.dataset.model = model.id;
    btn.textContent = model.label;
    btn.addEventListener("click", () => loadAssistantModel(model.id));
    elements.assistantSwitch.appendChild(btn);
  });
}

function renderWatchlist(items) {
  watchlistSnapshot = items;
  elements.marketCards.innerHTML = "";
  elements.asOfText.textContent = `Click any stock to run it with ${currentAssistantLabel()}`;

  items.forEach((stock) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `market-card market-watch-card${stock.ticker === activeTicker ? " active" : ""}`;

    const directionClass = stock.latest.changePct > 0 ? "up" : stock.latest.changePct < 0 ? "down" : "neutral";

    btn.innerHTML = `
      <p class="market-name">${stock.ticker}</p>
      <p class="market-price">${formatCurrency(stock.latest.price)}</p>
      <p class="market-change ${directionClass}">${formatPercent(stock.latest.changePct)} today</p>
    `;

    btn.setAttribute("aria-label", `Analyze ${stock.ticker} with ${currentAssistantLabel()}`);
    btn.addEventListener("click", () => loadTicker(stock.ticker));
    elements.marketCards.appendChild(btn);
  });
}

function renderLandingCards(items) {
  if (!elements.landingStockRail) {
    return;
  }

  elements.landingStockRail.innerHTML = "";

  (items || []).forEach((stock, index) => {
    const meta = WATCHLIST_META[stock.ticker] || {
      name: "Tracked Stock",
      badge: stock.ticker.slice(0, 2),
      accent: "#5e96ff",
    };
    const directionClass = stock.latest.changePct > 0 ? "up" : stock.latest.changePct < 0 ? "down" : "neutral";
    const directionIcon = directionClass === "down" ? "↘" : directionClass === "up" ? "↗" : "→";
    const button = document.createElement("button");

    button.type = "button";
    button.className = `landing-stock-card ${directionClass}`;
    button.style.setProperty("--stock-accent", meta.accent);
    button.setAttribute("aria-label", `Analyze ${stock.ticker} with ${currentAssistantLabel()}`);
    button.innerHTML = `
      <div class="landing-stock-card-head">
        <div class="landing-stock-ident">
          <span class="landing-stock-badge">${meta.badge}</span>
          <div class="landing-stock-copy">
            <p class="landing-stock-symbol">${stock.ticker}</p>
            <p class="landing-stock-company">${meta.name}</p>
          </div>
        </div>
        <span class="landing-stock-arrow ${directionClass}">${directionIcon}</span>
      </div>
      <div class="landing-stock-card-body">
        <p class="landing-stock-price">${formatCurrency(stock.latest.price)}</p>
        <p class="landing-stock-change ${directionClass}">${formatSignedCurrency(stock.latest.change)} · ${formatPercent(stock.latest.changePct)}</p>
      </div>
    `;

    button.addEventListener("click", () => loadTicker(stock.ticker));
    elements.landingStockRail.appendChild(button);
  });
}

function renderInsights(items) {
  if (!elements.insightsList) {
    return;
  }

  elements.insightsList.innerHTML = "";

  (items || []).forEach((insight) => {
    const block = document.createElement("article");
    block.className = `insight ${insight.type || "info"}`;
    block.innerHTML = `
      <h4>${insight.title}</h4>
      <p>${insight.body}</p>
    `;
    elements.insightsList.appendChild(block);
  });
}

function renderNews(items) {
  latestNewsItems = Array.isArray(items) ? items : [];
  elements.newsList.innerHTML = "";

  const visibleItems = newsExpanded ? latestNewsItems : latestNewsItems.slice(0, 3);

  visibleItems.forEach((news) => {
    const badgeClass = badgeClassFromSentiment(news.sentiment);
    const item = document.createElement("li");
    item.className = "news-item";
    item.innerHTML = `
      <a href="${news.link}" target="_blank" rel="noopener noreferrer">${news.title}</a>
      <div class="news-meta">
        <span>${news.published || "Recent"}</span>
        <span class="badge ${badgeClass}">${news.sentiment || "Neutral"}</span>
      </div>
    `;
    elements.newsList.appendChild(item);
  });

  if (!elements.newsToggleBtn) {
    return;
  }

  if (latestNewsItems.length > 3) {
    elements.newsToggleBtn.textContent = newsExpanded ? "Show Less" : "Show More";
    elements.newsToggleBtn.classList.remove("hidden");
  } else {
    elements.newsToggleBtn.classList.add("hidden");
  }
}

function renderGeoModeControls(payload) {
  if (!elements.geoModeBar) {
    return;
  }

  const availableModes = payload?.availableModes || [];
  if (!availableModes.length) {
    elements.geoModeBar.innerHTML = "";
    return;
  }

  if (!payload.modes?.[activeGeoMode]) {
    activeGeoMode = payload.defaultMode || availableModes[0].id;
  }

  elements.geoModeBar.innerHTML = "";
  availableModes.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `map-mode-btn${mode.id === activeGeoMode ? " active" : ""}`;
    button.dataset.mode = mode.id;
    button.textContent = mode.label;
    elements.geoModeBar.appendChild(button);
  });
}

function renderRegionSignals(regions, modePayload) {
  elements.regionList.innerHTML = "";
  if (elements.regionModeText && modePayload?.description) {
    elements.regionModeText.textContent = modePayload.description;
  }

  if (!(regions || []).length) {
    const li = document.createElement("li");
    li.className = "region-item";
    li.innerHTML =
      '<div class="region-name">No strong regional signals</div><div class="region-note">Trading Pro did not find enough geo-linked exposure data for this mode yet.</div>';
    elements.regionList.appendChild(li);
    return;
  }

  (regions || []).forEach((marker) => {
    const li = document.createElement("li");
    li.className = "region-item";
    const badgeClass = badgeClassFromSentiment(marker.sentiment);
    li.innerHTML = `
      <div class="top">
        <span class="region-name">${marker.region}</span>
        <span class="badge ${badgeClass}">${marker.sentiment}</span>
      </div>
      <div class="region-meta">Signal: ${formatSignedScore(marker.sentimentScore)} · Relevance: ${marker.relevancePct || 0}% · Articles: ${marker.articleCount || 0}</div>
      <div class="region-note">${marker.driver || `${marker.region} remains relevant for this stock.`}</div>
    `;
    elements.regionList.appendChild(li);
  });
}

function ensureGeoMap() {
  if (typeof L === "undefined" || !elements.sentimentMap) {
    return null;
  }
  if (geoMap) {
    return geoMap;
  }

  geoMap = L.map(elements.sentimentMap, {
    zoomControl: true,
    attributionControl: true,
  });
  geoMap.setView([25, 10], 2);
  return geoMap;
}

function clearGeoMarkers() {
  geoMarkers.forEach((marker) => marker.remove());
  geoMarkers = [];
}

function applyGeoMode(modeId) {
  if (!latestMapInsights?.modes) {
    return;
  }

  const modePayload = latestMapInsights.modes[modeId];
  if (!modePayload) {
    return;
  }

  activeGeoMode = modeId;
  renderGeoModeControls(latestMapInsights);

  const topRegion = modePayload.topRegion || latestMapInsights.topRegion || "N/A";
  const geoScore = Number(modePayload.compositeScore ?? latestMapInsights.geoSentimentScore ?? 0);
  elements.mapProviderText.textContent =
    `${latestMapInsights.mappingProvider || "Mapping API"} · ${modePayload.label} · Top region: ${topRegion} (${geoScore.toFixed(3)})`;

  renderRegionSignals(modePayload.regions || [], modePayload);

  if (typeof L === "undefined") {
    if (elements.sentimentMap) {
      elements.sentimentMap.innerHTML =
        "<p style='color:#b8cae7;font-size:0.9rem;padding:1rem;'>Leaflet failed to load, but regional sentiment data is still available.</p>";
    }
    return;
  }

  const map = ensureGeoMap();
  if (!map) {
    return;
  }

  if (!geoTileLayer) {
    geoTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 6,
    }).addTo(map);
  }

  clearGeoMarkers();

  const bounds = [];
  (modePayload.regions || []).forEach((marker) => {
    if (!Number.isFinite(marker.lat) || !Number.isFinite(marker.lon)) {
      return;
    }

    const circle = L.circleMarker([marker.lat, marker.lon], {
      radius: 6 + Math.round((marker.relevancePct || 0) / 18) + Math.min((marker.articleCount || 0), 3),
      color: "#f7fbff",
      fillColor: geoModeColor(modeId, Number(marker.sentimentScore || 0)),
      fillOpacity: 0.45 + Math.min((marker.relevancePct || 0) / 200, 0.35),
      weight: 2,
    })
      .bindPopup(
        `<strong>${marker.region}</strong><br>${modePayload.label}<br>Signal: ${formatSignedScore(marker.sentimentScore)}<br>Relevance: ${marker.relevancePct || 0}%<br>Articles: ${marker.articleCount || 0}<br>${marker.driver || ""}`,
      )
      .addTo(map);

    geoMarkers.push(circle);
    bounds.push([marker.lat, marker.lon]);
  });

  const hq = latestMapInsights.headquarters || latestMapInsights.companyHeadquarters;
  if (hq && Number.isFinite(hq.lat) && Number.isFinite(hq.lon)) {
    const hqMarker = L.circleMarker([hq.lat, hq.lon], {
      radius: 9,
      color: "#f9fbff",
      fillColor: geoModeColor(modeId, 0.08),
      fillOpacity: 0.9,
      weight: 2,
    })
      .bindPopup(`<strong>${latestMapInsights.ticker} HQ</strong><br>${hq.name || "Headquarters"}`)
      .addTo(map);
    geoMarkers.push(hqMarker);
    bounds.push([hq.lat, hq.lon]);
  }

  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 4 });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 3);
  } else {
    map.setView([25, 10], 2);
  }

  window.setTimeout(() => {
    map.invalidateSize();
  }, 0);
}

function renderMapInsights(payload) {
  if (!payload) {
    elements.mapProviderText.textContent = "Mapping data unavailable";
    latestMapInsights = null;
    if (elements.geoModeBar) {
      elements.geoModeBar.innerHTML = "";
    }
    if (elements.regionModeText) {
      elements.regionModeText.textContent = "Mode-aware regional exposure and sentiment signals";
    }
    if (elements.sentimentMap) {
      elements.sentimentMap.innerHTML =
        "<p style='color:#b8cae7;font-size:0.9rem;padding:1rem;'>Unable to load map signals.</p>";
    }
    return;
  }

  latestMapInsights = payload;
  renderGeoModeControls(payload);

  if (typeof L === "undefined") {
    if (elements.sentimentMap) {
      elements.sentimentMap.innerHTML =
        "<p style='color:#b8cae7;font-size:0.9rem;padding:1rem;'>Leaflet failed to load, but regional sentiment data is still available.</p>";
    }
    return;
  }

  applyGeoMode(activeGeoMode);
}

function renderSession(response) {
  elements.resultsShell.classList.remove("hidden");
  document.body.classList.add("has-results");
}

function summaryDriverLabels(prediction) {
  return (Array.isArray(prediction.topFeatures) ? prediction.topFeatures : [])
    .map((driver) => prettifyFeatureLabel(driver.feature))
    .filter(Boolean)
    .slice(0, 3);
}

function buildPredictionNarrative(prediction, assistantProvider) {
  const providerSummary = String(assistantProvider?.summary || "").trim();
  if (providerSummary) {
    return providerSummary;
  }

  const expected30d = Number(prediction.expectedReturn30dPct || prediction.expectedReturn7dPct || 0);
  const directionWord = expected30d >= 0 ? "rise" : "fall";
  const driverLabels = summaryDriverLabels(prediction);
  const driverText = driverLabels.length >= 2 ? `${driverLabels[0]} and ${driverLabels[1]}` : driverLabels[0] || "recent price patterns";
  const sentimentText = (prediction.sentiment || "Neutral").toLowerCase();
  const newsClause = sentimentText === "neutral" ? "news tone is mixed" : `news tone is ${sentimentText}`;
  const topRegion = prediction.geoSentiment?.topRegion;
  const geoClause = topRegion ? `, and ${topRegion} is the strongest region signal` : "";

  return `${prediction.ticker} may ${directionWord} because ${driverText} are leading the forecast, while ${newsClause}${geoClause}.`;
}

function buildPredictionReasons(prediction, assistantProvider) {
  const providerReasons = Array.isArray(assistantProvider?.reasons)
    ? assistantProvider.reasons.filter((reason) => String(reason || "").trim())
    : [];
  if (providerReasons.length) {
    return providerReasons.slice(0, 3);
  }

  const reasons = [];
  const driverLabels = summaryDriverLabels(prediction);
  if (driverLabels[0]) {
    reasons.push(`${driverLabels[0]} is one of the strongest chart signals right now.`);
  }

  if (prediction.sentiment) {
    reasons.push(`News tone is ${prediction.sentiment.toLowerCase()} for ${prediction.ticker}.`);
  }

  const rsi = Number(prediction.indicators?.rsi || 0);
  if (rsi > 70) {
    reasons.push("RSI is high, so pullback risk is still elevated.");
  } else if (rsi < 30) {
    reasons.push("RSI is low, so rebound potential is still in play.");
  } else if (prediction.geoSentiment?.topRegion) {
    reasons.push(`${prediction.geoSentiment.topRegion} is the strongest regional signal in the model.`);
  }

  return reasons.slice(0, 3);
}

function renderAnalysisSummary(prediction, assistantProvider) {
  setTextIfPresent(elements.analysisSummaryText, buildPredictionNarrative(prediction, assistantProvider));

  if (!elements.analysisSummaryReasons) {
    return;
  }

  const reasons = buildPredictionReasons(prediction, assistantProvider);
  elements.analysisSummaryReasons.innerHTML = "";

  reasons.forEach((reason) => {
    const item = document.createElement("li");
    item.textContent = reason;
    elements.analysisSummaryReasons.appendChild(item);
  });

  elements.analysisSummaryReasons.classList.toggle("hidden", reasons.length === 0);
}

function renderPrediction(prediction, assistantLabel, assistantProvider) {
  const expected7d = Number(prediction.expectedReturn7dPct || 0);
  const expected30d = Number(prediction.expectedReturn30dPct || 0);
  const dayClass = prediction.dayChangePct > 0 ? "up" : prediction.dayChangePct < 0 ? "down" : "neutral";
  const dayPrefix = prediction.dayChange > 0 ? "+" : "";
  const modelBaseLabel = prediction.model?.name === "LinearRegression" ? "LR (15F)" : "Hybrid";
  const isUpTrend = (expected30d || expected7d) >= 0;
  const tradeSignal = isUpTrend ? "BUY" : "SELL";
  const tradeTone = isUpTrend ? "buy" : "sell";
  const tradeTargetPrice = prediction.predictedPrice30d || prediction.predictedPrice7d;

  latestPrediction = prediction;
  if (!prediction.chart?.ranges?.some((range) => range.id === activeHistoryRange)) {
    activeHistoryRange = prediction.chart?.defaultRange || DEFAULT_HISTORY_RANGE;
  }

  const providerStatusLabel = assistantProvider?.used
    ? `${assistantLabel} API`
    : assistantProvider?.configured
      ? `${assistantLabel} fallback`
      : `${assistantLabel} mode`;
  setTextIfPresent(elements.activeTickerLabel, `${providerStatusLabel} forecast for ${prediction.ticker}`);
  setTextIfPresent(elements.tickerTitle, prediction.ticker);
  setTextIfPresent(
    elements.priceLine,
    `${formatCurrency(prediction.currentPrice)}  ${dayPrefix}${prediction.dayChange.toFixed(2)} (${formatPercent(prediction.dayChangePct)}) today`,
  );
  setTextIfPresent(elements.deltaPill, `7D ${formatPercent(expected7d)}`);
  setTextIfPresent(elements.deltaPill30, `30D ${formatPercent(expected30d)}`);
  elements.deltaPill.className = `delta-pill ${expected7d >= 0 ? "up" : "down"}`;
  elements.deltaPill30.className = `delta-pill secondary ${expected30d >= 0 ? "up" : "down"}`;

  setTextIfPresent(elements.confidenceValue, `${prediction.confidencePct}%`);
  setTextIfPresent(elements.targetValue, formatCurrency(prediction.predictedPrice7d));
  setTextIfPresent(elements.target30Value, formatCurrency(prediction.predictedPrice30d || prediction.predictedPrice7d));
  setTextIfPresent(elements.riskValue, prediction.riskLevel);

  setTextIfPresent(elements.aiScoreValue, `${prediction.aiScore}/10`);
  setTextIfPresent(elements.sentimentValue, prediction.sentiment);
  setTextIfPresent(elements.rsiValue, `${prediction.indicators.rsi}`);
  setTextIfPresent(elements.volatilityValue, `${prediction.indicators.volatilityPct}%`);
  setTextIfPresent(elements.avgVolumeValue, formatCompact(prediction.avgVolume20 || 0));
  setTextIfPresent(elements.momentumValue, `${prediction.indicators.momentum20Pct}%`);
  setTextIfPresent(elements.modelValue, prediction.learning?.enabled ? `${modelBaseLabel} + Learn` : modelBaseLabel);
  setTextIfPresent(elements.predictionDirection, isUpTrend ? "UP" : "DOWN");
  setTextIfPresent(
    elements.predictionDirectionCopy,
    isUpTrend ? "Good outlook in the coming days" : "Bad outlook in the coming days",
  );
  if (elements.predictionDirection) {
    elements.predictionDirection.className = `prediction-direction ${isUpTrend ? "up" : "down"}`;
  }
  setTextIfPresent(elements.tradeCallAction, tradeSignal);
  setTextIfPresent(
    elements.tradeCallSummary,
    isUpTrend
      ? `${prediction.ticker} is expected to move higher over the next 30 days.`
      : `${prediction.ticker} is expected to move lower over the next 30 days.`,
  );
  setTextIfPresent(
    elements.tradeCallMeta,
    `Confidence ${prediction.confidencePct}% · Risk ${prediction.riskLevel} · 30D target ${formatCurrency(tradeTargetPrice)}`,
  );
  if (elements.tradeCallCard) {
    elements.tradeCallCard.className = `trade-call-card ${tradeTone}`;
  }

  const testMae = prediction.diagnostics?.testMAE;
  const baselineMae = prediction.diagnostics?.baselineMAE;
  if (typeof testMae === "number") {
    const beatBaseline = typeof baselineMae === "number" && testMae <= baselineMae;
    setTextIfPresent(elements.testMaeValue, `${formatCurrency(testMae)}${beatBaseline ? " ✓" : ""}`);
  } else {
    setTextIfPresent(elements.testMaeValue, "--");
  }

  elements.priceLine.className = `price-line ${dayClass}`;

  renderHistoryRangeControls(prediction);
  renderPredictionMeters(prediction, expected7d, expected30d);
  renderAnalysisSummary(prediction, assistantProvider);
  renderDriverList(prediction);
  renderChartFromPrediction(prediction);
}

function renderChart(actualSeries, forecastSeries, ticker, historyLabel) {
  const canvas = document.getElementById("priceChart");
  const theme = getThemeTokens();
  if (typeof Chart === "undefined") {
    const wrap = canvas?.parentElement;
    if (wrap) {
      wrap.innerHTML =
        "<p style='color:#b8cae7;font-size:0.9rem;padding:1rem;'>Chart library failed to load. Forecast data is still available in the metric cards.</p>";
    }
    return;
  }

  const context = canvas.getContext("2d");
  const actualGradient = context.createLinearGradient(0, 0, 0, canvas.height || 360);
  actualGradient.addColorStop(0, "rgba(74, 157, 255, 0.22)");
  actualGradient.addColorStop(1, "rgba(74, 157, 255, 0.02)");
  const forecastGradient = context.createLinearGradient(0, 0, 0, canvas.height || 360);
  forecastGradient.addColorStop(0, "rgba(85, 227, 194, 0.18)");
  forecastGradient.addColorStop(1, "rgba(85, 227, 194, 0.02)");

  const labels = actualSeries.map((point) => formatDateLabel(point.date));
  labels.push(...forecastSeries.map((point) => formatDateLabel(point.date)));

  const actualData = actualSeries.map((point) => point.price);
  actualData.push(...Array(forecastSeries.length).fill(null));

  const forecastData = Array(actualSeries.length - 1).fill(null);
  forecastData.push(actualSeries[actualSeries.length - 1]?.price || null);
  forecastData.push(...forecastSeries.map((point) => point.price));

  if (priceChart) {
    priceChart.destroy();
  }

  priceChart = new Chart(context, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Actual Price",
          data: actualData,
          borderColor: "rgba(74, 157, 255, 1)",
          backgroundColor: actualGradient,
          borderWidth: 2.5,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
        },
        {
          label: "30D Forecast",
          data: forecastData,
          borderColor: "rgba(85, 227, 194, 1)",
          backgroundColor: forecastGradient,
          borderWidth: 2,
          borderDash: [7, 4],
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.32,
        },
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: { duration: 450 },
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          labels: {
            color: theme.legendColor,
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: "line",
          },
        },
        title: {
          display: true,
          text: `${ticker} ${historyLabel} History + 30-Day Forecast`,
          color: theme.titleColor,
          font: { family: "Sora", size: 13 },
        },
      },
      scales: {
        x: {
          ticks: {
            color: theme.tickColor,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12,
          },
          grid: { color: theme.gridColor },
        },
        y: {
          ticks: {
            color: theme.tickColor,
            callback(value) {
              return `$${Number(value).toFixed(0)}`;
            },
          },
          grid: { color: theme.gridColor },
        },
      },
    },
  });
}

function historyRangeLabel(rangeId) {
  return {
    "3m": "3M",
    "6m": "6M",
    "1y": "1Y",
    "2y": "2Y",
  }[rangeId] || "6M";
}

function renderHistoryRangeControls(prediction) {
  if (!elements.historyRangeToggle || !elements.historyRangeLabel) {
    return;
  }

  const ranges = prediction?.chart?.ranges?.length
    ? prediction.chart.ranges
    : [
        { id: "3m", label: "3M" },
        { id: "6m", label: "6M" },
        { id: "1y", label: "1Y" },
        { id: "2y", label: "2Y" },
      ];

  elements.historyRangeToggle.innerHTML = "";

  ranges.forEach((range) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-range-btn${range.id === activeHistoryRange ? " active" : ""}`;
    button.dataset.range = range.id;
    button.textContent = range.label;
    button.addEventListener("click", () => {
      activeHistoryRange = range.id;
      renderHistoryRangeControls(prediction);
      renderChartFromPrediction(prediction);
    });
    elements.historyRangeToggle.appendChild(button);
  });

  elements.historyRangeLabel.textContent = `History: ${historyRangeLabel(activeHistoryRange)} · Forecast: 30D`;
}

function renderChartFromPrediction(prediction) {
  const actualHistory = prediction?.series?.actualHistory || prediction?.series?.actual || [];
  const forecastSeries = prediction?.series?.forecast30 || prediction?.series?.forecast || [];
  const historyDays = HISTORY_RANGE_DAYS[activeHistoryRange] || HISTORY_RANGE_DAYS[DEFAULT_HISTORY_RANGE];
  const actualSeries = actualHistory.slice(-Math.min(actualHistory.length, historyDays));

  renderChart(actualSeries, forecastSeries, prediction.ticker, historyRangeLabel(activeHistoryRange));
}

function setMeterFill(element, percentage, tone) {
  if (!element) {
    return;
  }

  element.style.width = `${clampNumber(percentage, 10, 100)}%`;
  element.dataset.tone = tone;
}

function renderPredictionMeters(prediction, expected7d, expected30d) {
  const confidenceTone = prediction.confidencePct >= 72 ? "up" : prediction.confidencePct >= 56 ? "neutral" : "down";
  const riskTone = prediction.riskLevel === "High" ? "down" : prediction.riskLevel === "Medium" ? "neutral" : "up";
  const riskLevelWidth = {
    Low: 32,
    Medium: 62,
    High: 92,
  };

  setMeterFill(elements.confidenceMeter, prediction.confidencePct, confidenceTone);
  setMeterFill(elements.riskMeter, riskLevelWidth[prediction.riskLevel] || 48, riskTone);
}

function renderDriverList(prediction) {
  if (!elements.driverList) {
    return;
  }

  const primaryDrivers = Array.isArray(prediction.topFeatures) ? prediction.topFeatures.slice(0, 5) : [];
  const fallbackDrivers = [
    {
      feature: "Momentum20",
      importance: Math.abs(Number(prediction.indicators?.momentum20Pct || 0)) / 10,
      coefficient: Number(prediction.indicators?.momentum20Pct || 0),
    },
    {
      feature: "RSI",
      importance: Math.abs(Number(prediction.indicators?.rsi || 50) - 50) / 50,
      coefficient: Number(prediction.indicators?.rsi || 50) - 50,
    },
    {
      feature: "Volatility_30d",
      importance: Math.abs(Number(prediction.indicators?.volatilityPct || 0)) / 10,
      coefficient: -Math.abs(Number(prediction.indicators?.volatilityPct || 0)),
    },
    {
      feature: "GeoSignal",
      importance: Math.abs(Number(prediction.geoSentiment?.score || 0)) * 8,
      coefficient: Number(prediction.geoSentiment?.score || 0),
    },
    {
      feature: "Sentiment",
      importance: Math.abs(Number(prediction.sentimentScore || 0)) * 8,
      coefficient: Number(prediction.sentimentScore || 0),
    },
  ];

  const drivers = (primaryDrivers.length ? primaryDrivers : fallbackDrivers).map((driver) => ({
    feature: driver.feature,
    importance: Math.abs(Number(driver.importance || 0)),
    coefficient: Number(driver.coefficient || 0),
  }));

  elements.driverList.innerHTML = "";

  drivers.forEach((driver) => {
    const tone = driver.coefficient >= 0 ? "up" : "down";
    const featureLabel = prettifyFeatureLabel(driver.feature);
    const toneLabel = tone === "up" ? "GOOD" : "BAD";
    const row = document.createElement("article");
    row.className = "driver-row";
    row.innerHTML = `
      <div class="driver-meta">
        <div class="driver-copy-block">
          <span class="driver-name">${featureLabel}</span>
        </div>
        <span class="driver-tone ${tone}">${toneLabel}</span>
      </div>
    `;
    elements.driverList.appendChild(row);
  });
}

function showTemporaryError(message) {
  elements.resultsShell.classList.remove("hidden");
  document.body.classList.add("has-results");
  elements.deltaPill.textContent = "7D error";
  elements.deltaPill30.textContent = "30D error";
  elements.activeTickerLabel.textContent = message;
}

async function loadWatchlist() {
  const requests = WATCHLIST.map(async (ticker) => {
    try {
      return await fetchJson(`/api/stock?ticker=${encodeURIComponent(ticker)}&days=60`);
    } catch (error) {
      return {
        ticker,
        latest: {
          price: 0,
          change: 0,
          changePct: 0,
          date: "N/A",
        },
      };
    }
  });

  const items = await Promise.all(requests);
  renderWatchlist(items);
  renderLandingCards(items);
}

async function primeDashboardData() {
  if (dashboardPrimed) {
    return;
  }

  await loadWatchlist().catch((error) => {
    console.error(error);
  });
  dashboardPrimed = true;
}

async function runAssistantQuery(promptText) {
  const trimmedPrompt = (promptText || "").trim();
  if (!trimmedPrompt) {
    return;
  }

  const promptedModel = inferAssistantModelFromPrompt(trimmedPrompt);
  if (promptedModel && promptedModel !== activeAssistantModel) {
    setAssistantModel(promptedModel);
    renderAssistantSwitch();
  }

  lockComposerAfterFirstSearch();
  resetPromptField();
  newsExpanded = false;
  setLoadingState(true);
  lastPrompt = trimmedPrompt;
  showAnalysisLoading();
  scrollToAnalysis();

  try {
    const [payload] = await Promise.all([
      fetchJson(`/api/assistant-query?model=${encodeURIComponent(activeAssistantModel)}&prompt=${encodeURIComponent(trimmedPrompt)}`),
      primeDashboardData(),
    ]);

    activeTicker = payload.ticker || activeTicker;
    renderAssistantSwitch();
    renderSession(payload);
    renderPrediction(payload.prediction, payload.assistantModel?.label || currentAssistantLabel(), payload.assistantProvider || null);
    renderNews(payload.news?.items || []);
    renderMapInsights(payload.prediction?.mapInsights || null);
    hideAnalysisLoading();

    if (watchlistSnapshot.length) {
      renderWatchlist(watchlistSnapshot);
    }
  } catch (error) {
    console.error(error);
    showTemporaryError("Trading Pro could not resolve that request. Try a ticker like TSLA or a company name like Tesla.");
  } finally {
    setLoadingState(false);
  }
}

function loadTicker(ticker) {
  const cleanTicker = sanitizeTicker(ticker) || WATCHLIST[0];
  activeTicker = cleanTicker;
  const prompt = buildAnalysisPrompt(cleanTicker);
  elements.promptInput.value = prompt;
  autoResizePrompt();
  runAssistantQuery(prompt);
}

function loadAssistantModel(modelId) {
  if (!modelId) {
    return;
  }

  setAssistantModel(modelId);
  renderAssistantSwitch();
  if (!document.body.classList.contains("has-results")) {
    return;
  }

  const prompt = buildAnalysisPrompt(activeTicker);
  elements.promptInput.value = prompt;
  autoResizePrompt();
  runAssistantQuery(prompt);
}

function bindEvents() {
  elements.assistantModelSelect.addEventListener("change", (event) => {
    const nextModel = event.target.value;
    if (nextModel === activeAssistantModel) {
      return;
    }

    setAssistantModel(nextModel);
    renderAssistantSwitch();

    if (document.body.classList.contains("has-results")) {
      const prompt = buildAnalysisPrompt(activeTicker);
      elements.promptInput.value = prompt;
      autoResizePrompt();
      runAssistantQuery(prompt);
    }
  });

  elements.themeToggle.addEventListener("click", () => {
    applyTheme(document.body.dataset.theme === "light" ? "dark" : "light");
  });

  elements.attachmentBtn.addEventListener("click", () => {
    elements.attachmentInput.click();
  });

  elements.attachmentInput.addEventListener("change", (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    const existing = new Set(attachedFiles.map((file) => fileIdentity(file)));

    incomingFiles.forEach((file) => {
      const identity = fileIdentity(file);
      if (!existing.has(identity)) {
        attachedFiles.push(file);
        existing.add(identity);
      }
    });

    event.target.value = "";
    renderAttachments();
  });

  elements.assistantForm.addEventListener("submit", (event) => {
    event.preventDefault();
    runAssistantQuery(elements.promptInput.value);
  });

  elements.promptInput.addEventListener("input", autoResizePrompt);
  elements.promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      runAssistantQuery(elements.promptInput.value);
    }
  });

  document.querySelectorAll(".prompt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const prompt = chip.dataset.prompt || chip.textContent || "";
      elements.promptInput.value = prompt;
      autoResizePrompt();
      runAssistantQuery(prompt);
    });
  });

  elements.refreshBtn.addEventListener("click", async () => {
    await primeDashboardData();
    if (lastPrompt) {
      await runAssistantQuery(lastPrompt);
    }
  });

  elements.newsToggleBtn?.addEventListener("click", () => {
    newsExpanded = !newsExpanded;
    renderNews(latestNewsItems);
  });

  elements.geoModeBar?.addEventListener("click", (event) => {
    const button = event.target.closest(".map-mode-btn");
    if (!button || !button.dataset.mode) {
      return;
    }
    applyGeoMode(button.dataset.mode);
  });

  window.addEventListener("scroll", syncComposerStateOnScroll, { passive: true });
  window.addEventListener("resize", syncLandingComposerPosition);
  window.addEventListener("load", syncLandingComposerPosition);
}

async function bootstrap() {
  applyTheme(loadStoredTheme(), false);
  resetLandingState();
  renderModelControls();
  renderAssistantSwitch();
  setAssistantModel(activeAssistantModel);
  bindEvents();
  autoResizePrompt();
  syncLandingComposerPosition();
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      syncLandingComposerPosition();
    });
  }
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
  window.scrollTo({ top: 0, behavior: "auto" });
  primeDashboardData().catch((error) => {
    console.error(error);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  showTemporaryError("Trading Pro failed to initialize. Refresh the page and try again.");
});
