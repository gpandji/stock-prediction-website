const WATCHLIST = ["TSLA", "NVDA", "AMZN", "AAPL", "MSFT", "GOOGL"];
const ASSISTANT_MODELS = [
  { id: "openai", label: "OpenAI" },
  { id: "gemini", label: "Gemini" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "claude", label: "Claude" },
  { id: "grok", label: "Grok" },
  { id: "perplexity", label: "Perplexity" },
];
const THEME_STORAGE_KEY = "trading-pro-theme";

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

const elements = {
  heroPanel: document.getElementById("heroPanel"),
  composerDock: document.getElementById("composerDock"),
  resultsShell: document.getElementById("resultsShell"),
  modelPillRow: document.getElementById("modelPillRow"),
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
  tickerSwitch: document.getElementById("tickerSwitch"),
  watchlistItems: document.getElementById("watchlistItems"),
  activeTickerLabel: document.getElementById("activeTickerLabel"),
  tickerTitle: document.getElementById("tickerTitle"),
  priceLine: document.getElementById("priceLine"),
  deltaPill: document.getElementById("deltaPill"),
  deltaPill30: document.getElementById("deltaPill30"),
  confidenceValue: document.getElementById("confidenceValue"),
  targetValue: document.getElementById("targetValue"),
  target30Value: document.getElementById("target30Value"),
  riskValue: document.getElementById("riskValue"),
  insightsList: document.getElementById("insightsList"),
  aiScoreValue: document.getElementById("aiScoreValue"),
  sentimentValue: document.getElementById("sentimentValue"),
  rsiValue: document.getElementById("rsiValue"),
  volatilityValue: document.getElementById("volatilityValue"),
  avgVolumeValue: document.getElementById("avgVolumeValue"),
  momentumValue: document.getElementById("momentumValue"),
  modelValue: document.getElementById("modelValue"),
  testMaeValue: document.getElementById("testMaeValue"),
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
}

function inferTickerFromPrompt(promptText) {
  const words = String(promptText || "")
    .toUpperCase()
    .match(/[A-Z]{1,5}/g);

  if (!words) {
    return "";
  }

  const ignoreWords = new Set([
    "SHOW",
    "WITH",
    "NEXT",
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
    "DEEPSEEK",
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
    "PRICE",
  ]);

  return words.find((word) => WATCHLIST.includes(word) || !ignoreWords.has(word)) || "";
}

function showAnalysisLoading() {
  elements.resultsShell.classList.remove("hidden");
  document.body.classList.add("has-results");
}

function hideAnalysisLoading() {}

function scrollToAnalysis() {
  if (!elements.resultsShell) {
    return;
  }

  const targetTop = elements.resultsShell.getBoundingClientRect().top + window.scrollY - 132;
  window.scrollTo({
    top: Math.max(targetTop, 0),
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

function setAssistantModel(modelId) {
  activeAssistantModel = modelId;
  if (elements.assistantModelSelect) {
    elements.assistantModelSelect.value = modelId;
  }
  const pills = elements.modelPillRow?.querySelectorAll(".model-pill") || [];
  pills.forEach((pill) => {
    pill.classList.toggle("active", pill.dataset.model === modelId);
  });
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

function renderTickerSwitch() {
  elements.tickerSwitch.innerHTML = "";
  WATCHLIST.forEach((ticker) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ticker-chip${ticker === activeTicker ? " active" : ""}`;
    btn.textContent = ticker;
    btn.addEventListener("click", () => loadTicker(ticker));
    elements.tickerSwitch.appendChild(btn);
  });
}

function renderMarketOverview(payload) {
  elements.marketCards.innerHTML = "";
  elements.asOfText.textContent = payload?.asOf
    ? `As of ${payload.asOf}`
    : "Live market snapshot";

  (payload?.indices || []).forEach((item) => {
    const card = document.createElement("article");
    card.className = "market-card";
    const directionClass = item.changePct > 0 ? "up" : item.changePct < 0 ? "down" : "neutral";

    card.innerHTML = `
      <p class="market-name">${item.name} (${item.ticker})</p>
      <p class="market-price">${item.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
      <p class="market-change ${directionClass}">${formatPercent(item.changePct)} today</p>
    `;

    elements.marketCards.appendChild(card);
  });
}

function renderWatchlist(items) {
  watchlistSnapshot = items;
  elements.watchlistItems.innerHTML = "";

  items.forEach((stock) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `watch-item${stock.ticker === activeTicker ? " active" : ""}`;

    const directionClass = stock.latest.changePct > 0 ? "up" : stock.latest.changePct < 0 ? "down" : "neutral";

    btn.innerHTML = `
      <span class="symbol">${stock.ticker}</span>
      <span class="price">${formatCurrency(stock.latest.price)}</span>
      <span class="change ${directionClass}">${formatPercent(stock.latest.changePct)}</span>
    `;

    btn.addEventListener("click", () => loadTicker(stock.ticker));
    elements.watchlistItems.appendChild(btn);
  });
}

function renderInsights(items) {
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

function renderPrediction(prediction, assistantLabel) {
  const expected7d = Number(prediction.expectedReturn7dPct || 0);
  const expected30d = Number(prediction.expectedReturn30dPct || 0);
  const dayClass = prediction.dayChangePct > 0 ? "up" : prediction.dayChangePct < 0 ? "down" : "neutral";
  const dayPrefix = prediction.dayChange > 0 ? "+" : "";

  elements.activeTickerLabel.textContent = `${assistantLabel} assistant + Trading Pro forecast engine`;
  elements.tickerTitle.textContent = prediction.ticker;
  elements.priceLine.textContent =
    `${formatCurrency(prediction.currentPrice)}  ${dayPrefix}${prediction.dayChange.toFixed(2)} (${formatPercent(prediction.dayChangePct)}) today`;
  elements.deltaPill.textContent = `7D ${formatPercent(expected7d)}`;
  elements.deltaPill30.textContent = `30D ${formatPercent(expected30d)}`;
  elements.deltaPill.className = `delta-pill ${expected7d >= 0 ? "up" : "down"}`;
  elements.deltaPill30.className = `delta-pill secondary ${expected30d >= 0 ? "up" : "down"}`;

  elements.confidenceValue.textContent = `${prediction.confidencePct}%`;
  elements.targetValue.textContent = formatCurrency(prediction.predictedPrice7d);
  elements.target30Value.textContent = formatCurrency(prediction.predictedPrice30d || prediction.predictedPrice7d);
  elements.riskValue.textContent = prediction.riskLevel;

  elements.aiScoreValue.textContent = `${prediction.aiScore}/10`;
  elements.sentimentValue.textContent = prediction.sentiment;
  elements.rsiValue.textContent = `${prediction.indicators.rsi}`;
  elements.volatilityValue.textContent = `${prediction.indicators.volatilityPct}%`;
  elements.avgVolumeValue.textContent = formatCompact(prediction.avgVolume20 || 0);
  elements.momentumValue.textContent = `${prediction.indicators.momentum20Pct}%`;
  elements.modelValue.textContent = prediction.model?.name === "LinearRegression" ? "LR (15F)" : "Hybrid Fallback";

  const testMae = prediction.diagnostics?.testMAE;
  const baselineMae = prediction.diagnostics?.baselineMAE;
  if (typeof testMae === "number") {
    const beatBaseline = typeof baselineMae === "number" && testMae <= baselineMae;
    elements.testMaeValue.textContent = `${formatCurrency(testMae)}${beatBaseline ? " ✓" : ""}`;
  } else {
    elements.testMaeValue.textContent = "--";
  }

  elements.priceLine.className = `price-line ${dayClass}`;

  renderInsights(prediction.insights);
  renderChart(prediction.series.actual, prediction.series.forecast30 || prediction.series.forecast, prediction.ticker);
}

function renderChart(actualSeries, forecastSeries, ticker) {
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
          backgroundColor: "rgba(74, 157, 255, 0.12)",
          borderWidth: 2.3,
          pointRadius: 0,
          tension: 0.35,
        },
        {
          label: "Forecast",
          data: forecastData,
          borderColor: "rgba(85, 227, 194, 1)",
          backgroundColor: "rgba(85, 227, 194, 0.12)",
          borderWidth: 2,
          borderDash: [7, 4],
          pointRadius: 0,
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
          text: `${ticker} Price Trajectory & 30-Day Forecast`,
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
            maxTicksLimit: 10,
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

function showTemporaryError(message) {
  elements.resultsShell.classList.remove("hidden");
  document.body.classList.add("has-results");
  elements.deltaPill.textContent = "7D error";
  elements.deltaPill30.textContent = "30D error";
  elements.activeTickerLabel.textContent = message;
}

async function loadMarketOverview() {
  const data = await fetchJson("/api/market/overview");
  renderMarketOverview(data);
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
}

async function primeDashboardData() {
  if (dashboardPrimed) {
    return;
  }

  await Promise.all([
    loadMarketOverview().catch((error) => {
      console.error(error);
    }),
    loadWatchlist().catch((error) => {
      console.error(error);
    }),
  ]);
  dashboardPrimed = true;
}

async function runAssistantQuery(promptText) {
  const trimmedPrompt = (promptText || "").trim();
  if (!trimmedPrompt) {
    return;
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
    renderTickerSwitch();
    renderSession(payload);
    renderPrediction(payload.prediction, payload.assistantModel?.label || currentAssistantLabel());
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
  renderTickerSwitch();
  const prompt = `Analyze ${cleanTicker} with ${currentAssistantLabel()} for 7-day and 30-day stock outlook`;
  elements.promptInput.value = prompt;
  autoResizePrompt();
  runAssistantQuery(prompt);
}

function bindEvents() {
  elements.assistantModelSelect.addEventListener("change", (event) => {
    setAssistantModel(event.target.value);
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
}

async function bootstrap() {
  applyTheme(loadStoredTheme(), false);
  resetLandingState();
  renderModelControls();
  renderTickerSwitch();
  bindEvents();
  autoResizePrompt();
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
  window.scrollTo({ top: 0, behavior: "auto" });
}

bootstrap().catch((error) => {
  console.error(error);
  showTemporaryError("Trading Pro failed to initialize. Refresh the page and try again.");
});
