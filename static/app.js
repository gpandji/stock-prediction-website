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
  "1d": 2,
  "5d": 5,
  "1m": 21,
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
  LearningConfidence: "Learning Consensus",
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
  "Learning Consensus": "This shows how strongly similar historical setups agree with the current forecast.",
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
let activeChartMode = "line";
let lastScrollY = window.scrollY;
let hasPromptHistory = false;
let attachedFiles = [];
let dashboardPrimed = false;
let latestNewsItems = [];
let newsExpanded = false;
let latestPrediction = null;
let activeHistoryRange = DEFAULT_HISTORY_RANGE;
const INTRADAY_BAR_WIDTH = 15;
const INTRADAY_FORECAST_BAR_WIDTH = 18;
const INTRADAY_MIN_CHART_WIDTH = 1700;

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
  chartModeToggle: document.getElementById("chartModeToggle"),
  historyRangeLabel: document.getElementById("historyRangeLabel"),
  chartWrap: document.getElementById("chartWrap"),
  chartScrollViewport: document.getElementById("chartScrollViewport"),
  chartScrollSurface: document.getElementById("chartScrollSurface"),
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
  scenarioList: document.getElementById("scenarioList"),
  executionBiasValue: document.getElementById("executionBiasValue"),
  executionEntryValue: document.getElementById("executionEntryValue"),
  executionStopValue: document.getElementById("executionStopValue"),
  executionTargetOneValue: document.getElementById("executionTargetOneValue"),
  executionTargetTwoValue: document.getElementById("executionTargetTwoValue"),
  executionRrValue: document.getElementById("executionRrValue"),
  executionInvalidationValue: document.getElementById("executionInvalidationValue"),
  analogList: document.getElementById("analogList"),
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
  if (activeHistoryRange === "1d") {
    return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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

function reliabilityLabel(score) {
  if (score >= 64) {
    return "High trust";
  }
  if (score >= 46) {
    return "Moderate trust";
  }
  return "Caution";
}

function percentileBand(prediction) {
  const baseReturn = Number(prediction.expectedReturn30dPct || 0);
  const volatility = Math.max(Number(prediction.indicators?.volatilityPct || 0), 0.8);
  const confidence = Number(prediction.confidencePct || 55);
  const confidenceDrag = Math.max((100 - confidence) / 100, 0.08);
  const swing = volatility * (0.85 + confidenceDrag);
  return {
    lowerPct: baseReturn - swing,
    upperPct: baseReturn + swing,
  };
}

function inferRegime(prediction) {
  const rsi = Number(prediction.indicators?.rsi || 50);
  const momentum = Number(prediction.indicators?.momentum20Pct || 0);
  const volatility = Number(prediction.indicators?.volatilityPct || 0);

  if (volatility >= 3.8) {
    return "High-volatility expansion";
  }
  if (momentum >= 4 && rsi >= 58) {
    return "Trend continuation";
  }
  if (momentum <= -4 && rsi <= 42) {
    return "Downtrend pressure";
  }
  if (rsi > 68) {
    return "Momentum extension";
  }
  if (rsi < 32) {
    return "Mean-reversion rebound";
  }
  if (rsi >= 45 && rsi <= 55) {
    return "Range-bound balance";
  }
  return "Transitional regime";
}

function inferSetup(prediction) {
  const expected7d = Number(prediction.expectedReturn7dPct || 0);
  const expected30d = Number(prediction.expectedReturn30dPct || 0);
  const momentum = Number(prediction.indicators?.momentum20Pct || 0);

  if (expected30d >= 0 && expected7d >= 0 && momentum >= 2.5) {
    return "Pullback continuation";
  }
  if (expected30d >= 0 && expected7d < 0) {
    return "Short-term dip, higher-timeframe recovery";
  }
  if (expected30d < 0 && expected7d < 0) {
    return "Bearish continuation";
  }
  if (expected30d > 0 && momentum < 0) {
    return "Early reversal attempt";
  }
  return "Balanced swing setup";
}

function buildReliability(prediction) {
  let score = Number(prediction.confidencePct || 55) - 24;
  if (prediction.learning?.enabled) {
    score += 3;
  }
  if (typeof prediction.diagnostics?.testMAE === "number") {
    score += 2;
  }
  if (prediction.model?.fallbackReason) {
    score -= 18;
  } else {
    score -= 6;
  }
  const sampleCount = Number(prediction.learning?.horizons?.["7d"]?.sampleCount || 0);
  if (sampleCount < 10) {
    score -= 8;
  }
  if (Number(prediction.indicators?.volatilityPct || 0) >= 2.2) {
    score -= 7;
  }
  score = Math.round(clampNumber(score, 12, 78));

  const notes = [];
  if (prediction.learning?.enabled) {
    notes.push(`Adaptive memory found ${sampleCount} similar setups feeding the 7-day view.`);
  }
  if (prediction.model?.fallbackReason) {
    notes.push("Primary ML layer is unavailable, so this forecast is blending fallback signals and learned analogs.");
  } else {
    notes.push("Even with the primary model stack active, the trust score stays conservative until the setup proves itself.");
  }
  const band = percentileBand(prediction);
  notes.push(`The current 30-day distribution spans roughly ${formatPercent(band.lowerPct)} to ${formatPercent(band.upperPct)}.`);

  return {
    score,
    label: reliabilityLabel(score),
    notes,
  };
}

function buildScenarios(prediction) {
  const currentPrice = Number(prediction.currentPrice || 0);
  const baseReturn = Number(prediction.expectedReturn30dPct || 0);
  const confidence = Number(prediction.confidencePct || 55);
  const volatility = Number(prediction.indicators?.volatilityPct || 0);
  const bullProbability = Math.round(clampNumber(confidence + Math.max(baseReturn, 0) * 2.6, 18, 82));
  const bearProbability = Math.round(clampNumber((100 - confidence) + Math.max(-baseReturn, 0) * 1.9, 10, 62));
  const baseProbability = Math.max(100 - bullProbability - bearProbability, 12);
  const bullReturn = baseReturn + Math.max(volatility * 1.7, 2.1);
  const bearReturn = baseReturn - Math.max(volatility * 2.1, 2.8);

  return [
    {
      label: "Bull",
      tone: "bull",
      probability: bullProbability,
      movePct: bullReturn,
      targetPrice: currentPrice * (1 + bullReturn / 100),
    },
    {
      label: "Base",
      tone: "base",
      probability: baseProbability,
      movePct: baseReturn,
      targetPrice: currentPrice * (1 + baseReturn / 100),
    },
    {
      label: "Bear",
      tone: "bear",
      probability: bearProbability,
      movePct: bearReturn,
      targetPrice: currentPrice * (1 + bearReturn / 100),
    },
  ];
}

function buildTradePlan(prediction) {
  const currentPrice = Number(prediction.currentPrice || 0);
  const dayChangePct = Math.abs(Number(prediction.dayChangePct || 0));
  const volatility = Number(prediction.indicators?.volatilityPct || 1);
  const expected30d = Number(prediction.expectedReturn30dPct || 0);
  const bullish = expected30d >= 0;
  const entryBuffer = Math.max(volatility * 0.35, 0.6);
  const stopBuffer = Math.max(volatility * 1.3, 1.8);
  const targetBuffer = Math.max(Math.abs(expected30d) * 0.58, 2.4);

  let entryLow;
  let entryHigh;
  let stopPrice;
  let targetOne;
  let invalidation;

  if (bullish) {
    entryLow = currentPrice - entryBuffer;
    entryHigh = currentPrice + Math.max(dayChangePct * 0.15, 0.45);
    stopPrice = currentPrice - stopBuffer;
    targetOne = currentPrice + targetBuffer * 0.65;
    invalidation = "Lose the near-term pivot and close below the stop.";
  } else {
    entryLow = currentPrice - Math.max(dayChangePct * 0.15, 0.45);
    entryHigh = currentPrice + entryBuffer;
    stopPrice = currentPrice + stopBuffer;
    targetOne = currentPrice - targetBuffer * 0.65;
    invalidation = "Squeeze back above the stop with momentum confirmation.";
  }

  const targetTwo = Number(prediction.predictedPrice30d || prediction.predictedPrice7d || currentPrice);
  const riskPerShare = Math.abs(entryHigh - stopPrice);
  const rewardPerShare = Math.abs(targetTwo - entryHigh);

  return {
    bias: bullish ? "Long" : "Short",
    entryZone: [entryLow, entryHigh],
    stopPrice,
    targetOne,
    targetTwo,
    riskReward: rewardPerShare / Math.max(riskPerShare, 0.01),
    invalidation,
  };
}

function buildAnalogMatches(prediction) {
  return (prediction.learning?.horizons?.["7d"]?.matches || []).slice(0, 3);
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

function renderWorkspace(prediction) {
  const scenarios = buildScenarios(prediction);
  const tradePlan = buildTradePlan(prediction);
  const analogs = buildAnalogMatches(prediction);

  if (elements.scenarioList) {
    elements.scenarioList.innerHTML = "";
    scenarios.forEach((scenario) => {
      const card = document.createElement("article");
      card.className = `workspace-scenario-card ${scenario.tone}`;
      card.innerHTML = `
        <div class="workspace-scenario-head">
          <strong>${scenario.label}</strong>
          <span>${scenario.probability}% probability</span>
        </div>
        <div class="workspace-scenario-values">
          <div>
            <span>Move</span>
            <strong>${formatPercent(scenario.movePct)}</strong>
          </div>
          <div>
            <span>Target</span>
            <strong>${formatCurrency(scenario.targetPrice)}</strong>
          </div>
        </div>
      `;
      elements.scenarioList.appendChild(card);
    });
  }

  setTextIfPresent(elements.executionBiasValue, tradePlan.bias);
  setTextIfPresent(
    elements.executionEntryValue,
    `${formatCurrency(tradePlan.entryZone[0])} to ${formatCurrency(tradePlan.entryZone[1])}`,
  );
  setTextIfPresent(elements.executionStopValue, formatCurrency(tradePlan.stopPrice));
  setTextIfPresent(elements.executionTargetOneValue, formatCurrency(tradePlan.targetOne));
  setTextIfPresent(elements.executionTargetTwoValue, formatCurrency(tradePlan.targetTwo));
  setTextIfPresent(elements.executionRrValue, `${tradePlan.riskReward.toFixed(2)}:1`);
  setTextIfPresent(elements.executionInvalidationValue, tradePlan.invalidation);

  if (elements.analogList) {
    elements.analogList.innerHTML = "";
    if (!analogs.length) {
      const empty = document.createElement("article");
      empty.className = "workspace-analog-card";
      empty.innerHTML = "<strong>No analog data yet</strong><p>Similar setup matches will appear here as the learning layer finds cleaner comparisons.</p>";
      elements.analogList.appendChild(empty);
    } else {
      analogs.forEach((analog) => {
        const card = document.createElement("article");
        card.className = "workspace-analog-card";
        card.innerHTML = `
          <div class="workspace-analog-head">
            <strong>${formatDateLabel(analog.featureDate)}</strong>
            <span>distance ${Number(analog.distance || 0).toFixed(3)}</span>
          </div>
          <div class="workspace-scenario-values">
            <div>
              <span>Resolved</span>
              <strong>${formatDateLabel(analog.targetDate)}</strong>
            </div>
            <div>
              <span>Realized</span>
              <strong>${formatPercent(Number(analog.realizedReturnPct || 0))}</strong>
            </div>
          </div>
        `;
        elements.analogList.appendChild(card);
      });
    }
  }
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
  renderWorkspace(prediction);
  renderChartFromPrediction(prediction);
}

function buildCandlestickSeries(actualSeries) {
  return actualSeries.map((point, index) => {
    const prevClose = Number((actualSeries[index - 1]?.close ?? actualSeries[index - 1]?.price ?? point.price));
    const close = Number((point.close ?? point.price ?? 0));
    const open = Number(point.open ?? prevClose);
    const spread = Math.max(Math.abs(close - open), close * 0.0018);
    const rawHigh = Number(point.high ?? (Math.max(open, close) + spread));
    const rawLow = Number(point.low ?? (Math.min(open, close) - spread));
    const high = Math.max(rawHigh, open, close);
    const low = Math.min(rawLow, open, close);
    return {
      date: point.date,
      open,
      high,
      low,
      close,
      up: close >= open,
    };
  });
}

function buildShortHorizonForecast(prediction) {
  const intradaySeries = prediction?.series?.intraday || [];
  const predictionUpdatedAt = prediction?.predictionUpdatedAt || prediction?.cache?.generatedAt || null;
  const updateTime = predictionUpdatedAt ? new Date(predictionUpdatedAt) : new Date();
  const resolvedUpdateTime = Number.isNaN(updateTime.getTime()) ? new Date() : updateTime;
  const actualSeries = intradaySeries.filter((point) => {
    if (!predictionUpdatedAt) {
      return true;
    }
    return String(point?.date || "") <= predictionUpdatedAt;
  });
  const lastPoint = actualSeries[actualSeries.length - 1] || intradaySeries[intradaySeries.length - 1] || null;
  const startPrice = Number((lastPoint?.close ?? prediction.currentPrice ?? 0));
  const expectedReturn7d = Number(prediction.expectedReturn7dPct || 0) / 100;
  const totalIntervals = 24;
  const twoHourReturn = expectedReturn7d * (2 / (7 * 6.5));
  const points = [];

  for (let index = 1; index <= totalIntervals; index += 1) {
    const progress = index / totalIntervals;
    const projectedPrice = startPrice * (1 + (twoHourReturn * progress));
    points.push({
      date: new Date(resolvedUpdateTime.getTime() + (5 * 60 * 1000 * index)).toISOString(),
      price: Number(projectedPrice.toFixed(4)),
    });
  }

  return points;
}

function filterIntradayToPredictionUpdate(prediction) {
  const predictionUpdatedAt = prediction?.predictionUpdatedAt || prediction?.cache?.generatedAt || null;
  const intradaySeries = prediction?.series?.intraday || [];
  if (!predictionUpdatedAt) {
    return intradaySeries;
  }
  return intradaySeries.filter((point) => String(point?.date || "") <= predictionUpdatedAt);
}

function chartBounds(actualSeries, forecastSeries, candleSeries = []) {
  const values = [];
  actualSeries.forEach((point) => values.push(Number(point.price || 0)));
  forecastSeries.forEach((point) => values.push(Number(point.price || 0)));
  candleSeries.forEach((candle) => {
    values.push(Number(candle.low || 0));
    values.push(Number(candle.high || 0));
  });

  const cleanValues = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!cleanValues.length) {
    return {};
  }

  const minValue = Math.min(...cleanValues);
  const maxValue = Math.max(...cleanValues);
  const span = Math.max(maxValue - minValue, maxValue * 0.015);
  const padding = span * 0.28;

  return {
    min: Number((minValue - padding).toFixed(2)),
    max: Number((maxValue + padding).toFixed(2)),
  };
}

function intradayCanvasWidth(actualCount, forecastCount) {
  const baseWidth = (actualCount * INTRADAY_BAR_WIDTH) + (forecastCount * INTRADAY_FORECAST_BAR_WIDTH) + 220;
  return Math.max(INTRADAY_MIN_CHART_WIDTH, baseWidth);
}

function configureChartViewport(actualCount, forecastCount) {
  const canvas = document.getElementById("priceChart");
  if (!canvas || !elements.chartScrollSurface || !elements.chartScrollViewport || !elements.chartWrap) {
    return;
  }

  if (activeHistoryRange === "1d") {
    const width = intradayCanvasWidth(actualCount, forecastCount);
    elements.chartWrap.classList.add("is-scrollable");
    elements.chartScrollSurface.style.width = `${width}px`;
    canvas.width = width;
    canvas.style.width = `${width}px`;
    return;
  }

  elements.chartWrap.classList.remove("is-scrollable");
  elements.chartScrollSurface.style.width = "100%";
  canvas.style.width = "100%";
  canvas.removeAttribute("width");
}

function scrollChartViewportToLatest() {
  if (activeHistoryRange !== "1d" || !elements.chartScrollViewport) {
    return;
  }

  window.requestAnimationFrame(() => {
    const viewport = elements.chartScrollViewport;
    viewport.scrollLeft = Math.max(viewport.scrollWidth - viewport.clientWidth, 0);
  });
}

function renderLineChart(context, actualSeries, forecastSeries, ticker, historyLabel, theme) {
  const actualGradient = context.createLinearGradient(0, 0, 0, context.canvas.height || 360);
  actualGradient.addColorStop(0, "rgba(74, 157, 255, 0.22)");
  actualGradient.addColorStop(1, "rgba(74, 157, 255, 0.02)");
  const forecastGradient = context.createLinearGradient(0, 0, 0, context.canvas.height || 360);
  forecastGradient.addColorStop(0, "rgba(85, 227, 194, 0.18)");
  forecastGradient.addColorStop(1, "rgba(85, 227, 194, 0.02)");

  const labels = actualSeries.map((point) => formatDateLabel(point.date));
  labels.push(...forecastSeries.map((point) => formatDateLabel(point.date)));

  const actualData = actualSeries.map((point) => point.price);
  actualData.push(...Array(forecastSeries.length).fill(null));

  const forecastData = Array(Math.max(actualSeries.length - 1, 0)).fill(null);
  forecastData.push(actualSeries[actualSeries.length - 1]?.price || null);
  forecastData.push(...forecastSeries.map((point) => point.price));

  const bounds = chartBounds(actualSeries, forecastSeries);

  const forecastLabel = activeHistoryRange === "1d" ? "2H Forecast" : "30D Forecast";
  const titleLabel = activeHistoryRange === "1d"
    ? `${ticker} 24H Price + 2-Hour Forecast`
    : `${ticker} ${historyLabel} History + 30-Day Forecast`;

  return new Chart(context, {
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
          label: forecastLabel,
          data: forecastData,
          borderColor: "rgba(85, 227, 194, 1)",
          backgroundColor: forecastGradient,
          borderWidth: 2,
          borderDash: [7, 4],
          fill: true,
          pointRadius: activeHistoryRange === "1d" ? 2.5 : 0,
          pointHoverRadius: 5,
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
          text: titleLabel,
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
            maxTicksLimit: activeHistoryRange === "1d" ? 22 : 12,
          },
          grid: { color: theme.gridColor },
        },
        y: {
          beginAtZero: false,
          min: bounds.min,
          max: bounds.max,
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

function renderCandlestickChart(context, actualSeries, forecastSeries, ticker, historyLabel, theme) {
  const candles = buildCandlestickSeries(actualSeries);
  const labels = actualSeries.map((point) => formatDateLabel(point.date));
  labels.push(...forecastSeries.map((point) => formatDateLabel(point.date)));

  const actualData = actualSeries.map((point) => point.price);
  actualData.push(...Array(forecastSeries.length).fill(null));

  const forecastData = Array(Math.max(actualSeries.length - 1, 0)).fill(null);
  forecastData.push(actualSeries[actualSeries.length - 1]?.price || null);
  forecastData.push(...forecastSeries.map((point) => point.price));

  const bounds = chartBounds(actualSeries, forecastSeries, candles);
  const forecastLabel = activeHistoryRange === "1d" ? "2H Forecast" : "30D Forecast";
  const titleLabel = activeHistoryRange === "1d"
    ? `${ticker} 24H Candles + 2-Hour Forecast`
    : `${ticker} ${historyLabel} Candles + 30-Day Forecast`;

  const candlestickOverlay = {
    id: "candlestickOverlay",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      const yScale = scales.y;
      if (!chartArea || !xScale || !yScale) {
        return;
      }

      const slotWidth = candles.length > 1
        ? Math.abs(xScale.getPixelForValue(1) - xScale.getPixelForValue(0))
        : Math.max(chartArea.width - 24, 10);
      const bodyWidth = Math.max(Math.min(slotWidth * 0.55, 14), 4);

      ctx.save();
      ctx.beginPath();
      ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
      ctx.clip();

      candles.forEach((candle, index) => {
        const centerX = xScale.getPixelForValue(index);
        const openY = yScale.getPixelForValue(candle.open);
        const closeY = yScale.getPixelForValue(candle.close);
        const highY = yScale.getPixelForValue(candle.high);
        const lowY = yScale.getPixelForValue(candle.low);
        const top = Math.min(openY, closeY);
        const height = Math.max(Math.abs(closeY - openY), 2);
        const color = candle.up ? "#34d399" : "#ff6b7d";
        const wickColor = candle.up ? "rgba(52, 211, 153, 0.55)" : "rgba(255, 107, 125, 0.55)";

        ctx.strokeStyle = wickColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(centerX, highY);
        ctx.lineTo(centerX, lowY);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.fillRect(centerX - (bodyWidth / 2), top, bodyWidth, height);
      });

      ctx.restore();
    },
  };

  return new Chart(context, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Candles",
          data: actualData,
          borderColor: "rgba(0,0,0,0)",
          backgroundColor: "rgba(0,0,0,0)",
          borderWidth: 0,
          pointRadius: 0,
          pointHoverRadius: 0,
          pointHitRadius: activeHistoryRange === "1d" ? 14 : 10,
          fill: false,
          tension: 0,
        },
        {
          label: forecastLabel,
          data: forecastData,
          borderColor: "rgba(85, 227, 194, 1)",
          backgroundColor: "rgba(85, 227, 194, 0.08)",
          borderWidth: 2,
          borderDash: [7, 4],
          fill: false,
          pointRadius: activeHistoryRange === "1d" ? 2.5 : 0,
          pointHoverRadius: 5,
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
          text: titleLabel,
          color: theme.titleColor,
          font: { family: "Sora", size: 13 },
        },
        tooltip: {
          displayColors: true,
          callbacks: {
            title(items) {
              const item = items?.[0];
              if (!item) {
                return "";
              }
              const index = item.dataIndex;
              const sourcePoint = index < actualSeries.length
                ? actualSeries[index]
                : forecastSeries[index - actualSeries.length];
              return sourcePoint?.date ? formatDateLabel(sourcePoint.date) : labels[index] || "";
            },
            label(item) {
              const index = item.dataIndex;
              if (item.datasetIndex === 0 && index < candles.length) {
                const candle = candles[index];
                return [
                  `Open ${formatCurrency(candle.open)}`,
                  `High ${formatCurrency(candle.high)}`,
                  `Low ${formatCurrency(candle.low)}`,
                  `Close ${formatCurrency(candle.close)}`,
                ];
              }
              if (item.datasetIndex === 1 && index >= Math.max(actualSeries.length - 1, 0)) {
                const value = item.raw;
                return `${forecastLabel} ${formatCurrency(value)}`;
              }
              return `${item.dataset.label} ${formatCurrency(item.raw)}`;
            },
          },
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: activeHistoryRange === "1d" ? "Time" : "Date",
            color: theme.tickColor,
            font: { family: "IBM Plex Sans", size: 11, weight: "600" },
          },
          ticks: {
            color: theme.tickColor,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: activeHistoryRange === "1d" ? 22 : 12,
          },
          grid: { color: theme.gridColor },
        },
        y: {
          beginAtZero: false,
          min: bounds.min,
          max: bounds.max,
          title: {
            display: true,
            text: "Price (USD)",
            color: theme.tickColor,
            font: { family: "IBM Plex Sans", size: 11, weight: "600" },
          },
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
    plugins: [candlestickOverlay],
  });
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
  const viewportForecastCount = forecastSeries.length;
  configureChartViewport(actualSeries.length, viewportForecastCount);
  if (priceChart) {
    priceChart.destroy();
  }

  priceChart = activeChartMode === "candles"
    ? renderCandlestickChart(context, actualSeries, forecastSeries, ticker, historyLabel, theme)
    : renderLineChart(context, actualSeries, forecastSeries, ticker, historyLabel, theme);
  scrollChartViewportToLatest();
}

function historyRangeLabel(rangeId) {
  return {
    "1d": "24H",
    "5d": "5D",
    "1m": "1M Daily",
    "3m": "3M",
    "6m": "6M",
    "1y": "1Y",
    "2y": "2Y",
  }[rangeId] || "6M";
}

function renderChartModeControls(prediction) {
  if (!elements.chartModeToggle) {
    return;
  }

  const modes = [
    { id: "line", label: "Line" },
    { id: "candles", label: "Candles" },
  ];

  elements.chartModeToggle.innerHTML = "";

  modes.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-range-btn chart-mode-btn${mode.id === activeChartMode ? " active" : ""}`;
    button.dataset.chartMode = mode.id;
    button.textContent = mode.label;
    button.addEventListener("click", () => {
      activeChartMode = mode.id;
      renderChartModeControls(prediction);
      renderChartFromPrediction(prediction);
    });
    elements.chartModeToggle.appendChild(button);
  });
}

function renderHistoryRangeControls(prediction) {
  if (!elements.historyRangeToggle || !elements.historyRangeLabel) {
    return;
  }

  const fallbackRanges = [
    { id: "1d", label: "24H" },
    { id: "5d", label: "5D" },
    { id: "1m", label: "1M" },
    { id: "3m", label: "3M" },
    { id: "6m", label: "6M" },
    { id: "1y", label: "1Y" },
    { id: "2y", label: "2Y" },
  ];
  const rangeMap = new Map();
  fallbackRanges.forEach((range) => rangeMap.set(range.id, range));
  (prediction?.chart?.ranges || []).forEach((range) => {
    if (range?.id) {
      rangeMap.set(range.id, { ...rangeMap.get(range.id), ...range });
    }
  });
  const ranges = fallbackRanges
    .map((range) => rangeMap.get(range.id))
    .filter(Boolean);

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

  renderChartModeControls(prediction);
  const forecastLabel = activeHistoryRange === "1d" ? "2H" : "30D";
  elements.historyRangeLabel.textContent = `History: ${historyRangeLabel(activeHistoryRange)} · Forecast: ${forecastLabel}`;
}

function renderChartFromPrediction(prediction) {
  const actualHistory = activeHistoryRange === "1d"
    ? filterIntradayToPredictionUpdate(prediction)
    : (prediction?.series?.actualHistory || prediction?.series?.actual || []);
  const forecastSeries = activeHistoryRange === "1d"
    ? buildShortHorizonForecast(prediction)
    : (prediction?.series?.forecast30 || prediction?.series?.forecast || []);
  const historyDays = HISTORY_RANGE_DAYS[activeHistoryRange] || HISTORY_RANGE_DAYS[DEFAULT_HISTORY_RANGE];
  const actualSeries = activeHistoryRange === "1d"
    ? actualHistory
    : actualHistory.slice(-Math.min(actualHistory.length, historyDays));

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
      feature: "LearningConfidence",
      importance: Math.abs(Number(prediction.learning?.horizons?.["7d"]?.consensusPct || 0)) / 10,
      coefficient: Number(prediction.learning?.horizons?.["7d"]?.consensusPct || 0) - 50,
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
