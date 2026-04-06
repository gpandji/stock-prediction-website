#!/usr/bin/env python3
import csv
import hashlib
import json
import math
import os
import random
import statistics
import time
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen

try:
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import StandardScaler

    SKLEARN_AVAILABLE = True
except Exception:
    LinearRegression = None
    StandardScaler = None
    SKLEARN_AVAILABLE = False

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(ROOT_DIR, "static")
CACHE = {}
APP_USER_AGENT = "TradePro-AI/1.2 (+https://local-app)"
NEWS_API_KEY = os.environ.get("NEWSAPI_KEY", "").strip()
NEWS_API_PROVIDER = os.environ.get("NEWS_API_PROVIDER", "auto").strip().lower()
YAHOO_BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
}

MARKET_SYMBOLS = [
    ("SPY", "S&P 500"),
    ("QQQ", "NASDAQ"),
    ("DIA", "DOW 30"),
    ("IWM", "Russell 2000"),
]

ASSISTANT_MODELS = [
    {"id": "openai", "label": "OpenAI"},
    {"id": "gemini", "label": "Gemini"},
    {"id": "claude", "label": "Claude"},
    {"id": "grok", "label": "Grok"},
    {"id": "perplexity", "label": "Perplexity"},
]

ASSISTANT_PROVIDER_CONFIG = {
    "openai": {
        "apiKeyEnv": "OPENAI_API_KEY",
        "modelEnv": "OPENAI_MODEL",
        "defaultModel": "gpt-5.4",
        "endpoint": "https://api.openai.com/v1/responses",
        "transport": "openai_responses",
    },
    "gemini": {
        "apiKeyEnv": "GEMINI_API_KEY",
        "modelEnv": "GEMINI_MODEL",
        "defaultModel": "gemini-2.5-flash",
        "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "transport": "gemini_generate_content",
    },
    "claude": {
        "apiKeyEnv": "ANTHROPIC_API_KEY",
        "modelEnv": "ANTHROPIC_MODEL",
        "defaultModel": "claude-sonnet-4-20250514",
        "endpoint": "https://api.anthropic.com/v1/messages",
        "transport": "anthropic_messages",
    },
    "grok": {
        "apiKeyEnv": "XAI_API_KEY",
        "modelEnv": "XAI_MODEL",
        "defaultModel": "grok-4",
        "endpoint": "https://api.x.ai/v1/chat/completions",
        "transport": "openai_chat_compatible",
    },
    "perplexity": {
        "apiKeyEnv": "PERPLEXITY_API_KEY",
        "modelEnv": "PERPLEXITY_MODEL",
        "defaultModel": "sonar-pro",
        "endpoint": "https://api.perplexity.ai/v1/sonar",
        "transport": "perplexity_sonar",
    },
}

MAX_CHART_HISTORY_DAYS = 504
DEFAULT_CHART_RANGE = "6m"
CHART_RANGE_OPTIONS = [
    {"id": "3m", "label": "3M", "days": 63},
    {"id": "6m", "label": "6M", "days": 126},
    {"id": "1y", "label": "1Y", "days": 252},
    {"id": "2y", "label": "2Y", "days": MAX_CHART_HISTORY_DAYS},
]
SELF_LEARNING_LOOKBACK_ROWS = 220
SELF_LEARNING_MIN_ROWS = 36
SELF_LEARNING_MAX_ANALOGS = 12

TICKER_HEADQUARTERS_QUERY = {
    "TSLA": "Tesla Headquarters Austin Texas",
    "NVDA": "NVIDIA Headquarters Santa Clara California",
    "AMZN": "Amazon Headquarters Seattle Washington",
    "AAPL": "Apple Park Cupertino California",
    "MSFT": "Microsoft Headquarters Redmond Washington",
    "GOOGL": "Googleplex Mountain View California",
    "META": "Meta Headquarters Menlo Park California",
    "NFLX": "Netflix Headquarters Los Gatos California",
    "LMT": "Lockheed Martin Headquarters Bethesda Maryland",
}

TICKER_HQ_FALLBACK = {
    "TSLA": (30.2672, -97.7431),
    "NVDA": (37.3688, -122.0363),
    "AMZN": (47.6062, -122.3321),
    "AAPL": (37.3349, -122.0090),
    "MSFT": (47.6396, -122.1280),
    "GOOGL": (37.4220, -122.0841),
    "META": (37.4848, -122.1484),
    "NFLX": (37.2577, -122.0325),
    "LMT": (38.9807, -77.1003),
}

TICKER_COMPANY_NAMES = {
    "TSLA": "Tesla",
    "NVDA": "NVIDIA",
    "AMZN": "Amazon",
    "AAPL": "Apple",
    "MSFT": "Microsoft",
    "GOOGL": "Google",
    "META": "Meta",
    "NFLX": "Netflix",
    "LMT": "Lockheed Martin",
    "SPY": "SPDR S&P 500 ETF",
    "QQQ": "Invesco QQQ",
    "DIA": "SPDR Dow Jones ETF",
    "IWM": "iShares Russell 2000 ETF",
}

REGION_HUBS = {
    "North America": {"lat": 40.7128, "lon": -74.0060, "code": "NA"},
    "Europe": {"lat": 51.5074, "lon": -0.1278, "code": "EU"},
    "China": {"lat": 31.2304, "lon": 121.4737, "code": "CN"},
    "East Asia": {"lat": 35.6762, "lon": 139.6503, "code": "EA"},
    "Southeast Asia": {"lat": 1.3521, "lon": 103.8198, "code": "SEA"},
    "India": {"lat": 19.0760, "lon": 72.8777, "code": "IN"},
    "Middle East": {"lat": 25.2048, "lon": 55.2708, "code": "ME"},
}

REGION_KEYWORDS = {
    "North America": [
        "u.s.",
        "us ",
        "usa",
        "united states",
        "nasdaq",
        "s&p 500",
        "dow",
        "nyse",
        "wall street",
        "new york",
        "canada",
    ],
    "Europe": ["europe", "european", "uk", "britain", "london", "ecb", "eu", "germany", "france"],
    "China": ["china", "chinese", "beijing", "shanghai", "hong kong", "shenzhen"],
    "East Asia": ["japan", "tokyo", "nikkei", "korea", "south korea", "taiwan"],
    "Southeast Asia": ["singapore", "asean", "malaysia", "indonesia", "thailand", "vietnam"],
    "India": ["india", "indian", "mumbai", "nifty", "sensex"],
    "Middle East": ["middle east", "dubai", "uae", "saudi", "qatar", "oil"],
}

GEO_MODE_METADATA = {
    "investments": {
        "label": "Investments",
        "description": "Capital allocation, facilities, and commercial build-out by region",
    },
    "origin": {
        "label": "Stocks Origin",
        "description": "Home-market footprint, listing roots, and primary operating base",
    },
    "affected": {
        "label": "Affected nations",
        "description": "Regions where policy, supply chain, or demand shifts can move the stock",
    },
}

GEO_MODE_BLEND = {
    "investments": 0.35,
    "origin": 0.20,
    "affected": 0.45,
}

TICKER_GEO_PROFILES = {
    "TSLA": {
        "investments": {"North America": 0.98, "China": 0.86, "Europe": 0.74, "Middle East": 0.34},
        "origin": {"North America": 1.0, "China": 0.72, "Europe": 0.62},
        "affected": {"China": 0.97, "North America": 0.9, "Europe": 0.78, "East Asia": 0.66},
    },
    "NVDA": {
        "investments": {"North America": 0.92, "East Asia": 0.96, "China": 0.62, "Southeast Asia": 0.54},
        "origin": {"North America": 1.0, "East Asia": 0.84, "China": 0.62},
        "affected": {"East Asia": 0.97, "China": 0.89, "North America": 0.83, "Southeast Asia": 0.58},
    },
    "AMZN": {
        "investments": {"North America": 0.96, "Europe": 0.68, "India": 0.62, "Southeast Asia": 0.4},
        "origin": {"North America": 1.0, "Europe": 0.64, "India": 0.42},
        "affected": {"North America": 0.93, "Europe": 0.75, "India": 0.68, "East Asia": 0.46},
    },
    "AAPL": {
        "investments": {"North America": 0.88, "China": 0.9, "India": 0.77, "East Asia": 0.82, "Europe": 0.52},
        "origin": {"North America": 1.0, "China": 0.89, "East Asia": 0.84},
        "affected": {"China": 0.98, "India": 0.83, "East Asia": 0.89, "North America": 0.8, "Europe": 0.56},
    },
    "MSFT": {
        "investments": {"North America": 0.94, "Europe": 0.77, "India": 0.72, "Southeast Asia": 0.53, "Middle East": 0.38},
        "origin": {"North America": 1.0, "Europe": 0.68},
        "affected": {"North America": 0.9, "Europe": 0.74, "India": 0.73, "East Asia": 0.49, "Middle East": 0.41},
    },
    "GOOGL": {
        "investments": {"North America": 0.94, "Europe": 0.75, "India": 0.68, "Southeast Asia": 0.57, "Middle East": 0.44},
        "origin": {"North America": 1.0, "Europe": 0.61},
        "affected": {"Europe": 0.82, "North America": 0.8, "India": 0.7, "East Asia": 0.48, "Middle East": 0.42},
    },
    "META": {
        "investments": {"North America": 0.9, "Europe": 0.63, "India": 0.62, "Southeast Asia": 0.51},
        "origin": {"North America": 1.0, "Europe": 0.52, "India": 0.5},
        "affected": {"Europe": 0.82, "North America": 0.77, "India": 0.61, "Middle East": 0.44},
    },
    "NFLX": {
        "investments": {"North America": 0.86, "Europe": 0.73, "India": 0.66, "East Asia": 0.42},
        "origin": {"North America": 1.0, "Europe": 0.55},
        "affected": {"North America": 0.74, "Europe": 0.68, "India": 0.71, "East Asia": 0.52},
    },
    "LMT": {
        "investments": {"North America": 0.93, "Europe": 0.54, "Middle East": 0.69, "East Asia": 0.31},
        "origin": {"North America": 1.0, "Europe": 0.48, "Middle East": 0.52},
        "affected": {"Middle East": 0.82, "North America": 0.76, "Europe": 0.72, "East Asia": 0.44},
    },
}

LR_FORECAST_DAYS = 7
LR_LONG_FORECAST_DAYS = 30
LR_FEATURES = [
    "Close_lag1",
    "Close_lag5",
    "Close_lag10",
    "Return_1d",
    "Return_5d",
    "Return_20d",
    "MA_10",
    "MA_50",
    "MA_200",
    "Volatility_10d",
    "Volatility_30d",
    "RSI",
    "Month",
    "Quarter",
    "DayOfWeek",
]

PROMPT_TICKER_ALIASES = {
    "tesla": "TSLA",
    "nvidia": "NVDA",
    "amazon": "AMZN",
    "apple": "AAPL",
    "microsoft": "MSFT",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "meta": "META",
    "facebook": "META",
    "netflix": "NFLX",
    "lockheed": "LMT",
    "lockheed martin": "LMT",
    "spy": "SPY",
    "qqq": "QQQ",
    "dia": "DIA",
    "iwm": "IWM",
}

POSITIVE_WORDS = {
    "beat",
    "beats",
    "bullish",
    "breakout",
    "buy",
    "climb",
    "confidence",
    "expands",
    "gain",
    "gains",
    "growth",
    "higher",
    "improve",
    "improves",
    "improving",
    "outperform",
    "outperforms",
    "positive",
    "profit",
    "profits",
    "rally",
    "record",
    "recovery",
    "resilient",
    "rise",
    "rises",
    "strong",
    "surge",
    "upside",
    "upgrade",
    "uptrend",
}

NEGATIVE_WORDS = {
    "bearish",
    "below",
    "cut",
    "cuts",
    "decline",
    "declines",
    "downgrade",
    "drop",
    "drops",
    "fall",
    "falls",
    "fear",
    "lawsuit",
    "lower",
    "miss",
    "misses",
    "negative",
    "pullback",
    "recession",
    "reduce",
    "reduced",
    "risk",
    "sell",
    "slump",
    "slowdown",
    "tumble",
    "uncertain",
    "volatility",
    "warning",
    "weaker",
}


def clamp(value, lower, upper):
    return max(lower, min(upper, value))


def safe_float(value, fallback=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def safe_mean(values, fallback=0.0):
    cleaned = [safe_float(value) for value in values if value is not None]
    if not cleaned:
        return fallback
    return sum(cleaned) / len(cleaned)


def pct_change(current, previous):
    if previous == 0:
        return 0.0
    return (current - previous) / previous


def sanitize_ticker(raw_ticker):
    ticker = (raw_ticker or "TSLA").upper().strip()
    allowed = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-^")
    ticker = "".join(ch for ch in ticker if ch in allowed)
    return (ticker or "TSLA")[:12]


def normalize_assistant_model(raw_model):
    raw_value = (raw_model or "openai").strip().lower()
    for item in ASSISTANT_MODELS:
        if raw_value in (item["id"], item["label"].lower()):
            assistant_model = dict(item)
            return enrich_assistant_model(assistant_model)
    return enrich_assistant_model(dict(ASSISTANT_MODELS[0]))


def enrich_assistant_model(assistant_model):
    model_id = assistant_model["id"]
    config = ASSISTANT_PROVIDER_CONFIG.get(model_id, {})
    api_key = os.environ.get(config.get("apiKeyEnv", ""), "").strip()
    model_name = os.environ.get(config.get("modelEnv", ""), "").strip() or config.get("defaultModel", "")

    assistant_model["providerModel"] = model_name
    assistant_model["apiConfigured"] = bool(api_key)
    assistant_model["apiKeyEnv"] = config.get("apiKeyEnv", "")
    assistant_model["transport"] = config.get("transport", "")
    assistant_model["endpoint"] = config.get("endpoint", "")
    return assistant_model


def infer_ticker_from_prompt(prompt_text):
    prompt = (prompt_text or "").strip()
    if not prompt:
        return "TSLA"

    lowered = prompt.lower()
    for alias, ticker in sorted(PROMPT_TICKER_ALIASES.items(), key=lambda pair: len(pair[0]), reverse=True):
        if alias in lowered:
            return ticker

    current = []
    tokens = []
    for ch in prompt:
        if ch.isalnum() or ch in ".-^":
            current.append(ch)
        elif current:
            tokens.append("".join(current))
            current = []
    if current:
        tokens.append("".join(current))

    ignored_tokens = {
        "a",
        "about",
        "ai",
        "analyze",
        "analysis",
        "and",
        "are",
        "bad",
        "best",
        "buy",
        "can",
        "check",
        "claude",
        "compare",
        "could",
        "days",
        "day",
        "do",
        "does",
        "find",
        "forecast",
        "for",
        "from",
        "gemini",
        "give",
        "grok",
        "good",
        "how",
        "in",
        "is",
        "look",
        "latest",
        "market",
        "me",
        "mind",
        "month",
        "months",
        "my",
        "next",
        "of",
        "on",
        "openai",
        "outlook",
        "perplexity",
        "please",
        "predict",
        "prediction",
        "predictions",
        "price",
        "should",
        "show",
        "search",
        "stock",
        "stocks",
        "study",
        "tell",
        "the",
        "this",
        "to",
        "use",
        "used",
        "using",
        "week",
        "weeks",
        "what",
        "whats",
        "when",
        "where",
        "which",
        "why",
        "with",
        "would",
        "year",
        "years",
        "you",
    }

    known_tickers = set(PROMPT_TICKER_ALIASES.values())
    known_tickers.update(ticker for ticker, _name in MARKET_SYMBOLS)
    known_tickers.update(TICKER_HEADQUARTERS_QUERY.keys())

    for token in tokens:
        sanitized = sanitize_ticker(token)
        if sanitized in known_tickers:
            return sanitized

    for token in tokens:
        token_lc = token.lower()
        sanitized = sanitize_ticker(token)
        if token_lc in ignored_tokens or sanitized in ("", "AI"):
            continue
        if 1 <= len(sanitized) <= 5 and token == token.upper() and any(ch.isalpha() for ch in sanitized):
            return sanitized

    for token in tokens:
        token_lc = token.lower()
        if token_lc in ignored_tokens:
            continue
        sanitized = sanitize_ticker(token)
        if not any(ch.isalpha() for ch in sanitized):
            continue
        if len(sanitized) == 1:
            continue
        if 2 <= len(sanitized) <= 5 and sanitized not in ("AI",):
            return sanitized

    return "TSLA"


def next_business_day(day):
    next_day = day + timedelta(days=1)
    while next_day.weekday() >= 5:
        next_day += timedelta(days=1)
    return next_day


def last_business_days(count):
    days = []
    d = date.today()
    while len(days) < count:
        if d.weekday() < 5:
            days.append(d)
        d -= timedelta(days=1)
    days.reverse()
    return days


def fetch_url(url, timeout=12, headers=None):
    final_headers = {
        "User-Agent": APP_USER_AGENT,
        "Accept": "*/*",
    }
    if headers:
        final_headers.update(headers)

    req = Request(
        url,
        headers=final_headers,
    )
    with urlopen(req, timeout=timeout) as response:
        return response.read()


def fetch_json_post(url, payload, timeout=35, headers=None):
    final_headers = {
        "User-Agent": APP_USER_AGENT,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if headers:
        final_headers.update(headers)

    raw_payload = json.dumps(payload).encode("utf-8")
    req = Request(url, data=raw_payload, headers=final_headers, method="POST")
    with urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="ignore"))


def cached(key, ttl_seconds, loader):
    current_time = time.time()
    cached_item = CACHE.get(key)
    if cached_item and cached_item[0] > current_time:
        return cached_item[1]

    value = loader()
    CACHE[key] = (current_time + ttl_seconds, value)
    return value


def stooq_symbol(ticker):
    ticker = sanitize_ticker(ticker)
    index_map = {
        "^GSPC": "^spx",
        "SPX": "^spx",
        "^DJI": "^dji",
        "DJI": "^dji",
        "^IXIC": "^ixic",
        "IXIC": "^ixic",
    }
    if ticker in index_map:
        return index_map[ticker]
    if "." in ticker:
        return ticker.lower()
    return f"{ticker.lower()}.us"


def yahoo_chart_range(points):
    count = max(1, int(points or 0))
    if count <= 5:
        return "5d"
    if count <= 22:
        return "1mo"
    if count <= 66:
        return "3mo"
    if count <= 132:
        return "6mo"
    if count <= 270:
        return "1y"
    return "2y"


def fetch_yahoo_history(ticker, range_value="2y"):
    ticker = sanitize_ticker(ticker)
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(ticker)}"
        f"?interval=1d&range={quote(range_value)}&includePrePost=false&events=div%2Csplits"
    )
    raw = fetch_url(url, headers=YAHOO_BROWSER_HEADERS).decode("utf-8", errors="ignore")
    payload = json.loads(raw)
    chart = payload.get("chart", {})
    result = (chart.get("result") or [None])[0]
    if chart.get("error") or not result:
        raise ValueError(f"Yahoo chart did not return data for {ticker}")

    indicators = result.get("indicators", {})
    quote_rows = (indicators.get("quote") or [{}])[0]
    timestamps = result.get("timestamp") or []

    rows = []
    for idx, timestamp in enumerate(timestamps):
        closes = quote_rows.get("close") or []
        close_raw = closes[idx] if idx < len(closes) else None
        if close_raw in (None, ""):
            continue

        close = safe_float(close_raw, 0.0)
        opens = quote_rows.get("open") or []
        highs = quote_rows.get("high") or []
        lows = quote_rows.get("low") or []
        volumes = quote_rows.get("volume") or []

        open_price = safe_float(opens[idx] if idx < len(opens) else None, close)
        high = safe_float(highs[idx] if idx < len(highs) else None, max(open_price, close))
        low = safe_float(lows[idx] if idx < len(lows) else None, min(open_price, close))
        volume = int(safe_float(volumes[idx] if idx < len(volumes) else None, 0.0))
        point_date = datetime.utcfromtimestamp(int(timestamp)).date().isoformat()

        rows.append(
            {
                "date": point_date,
                "open": round(open_price, 4),
                "high": round(high, 4),
                "low": round(low, 4),
                "close": round(close, 4),
                "volume": volume,
            }
        )

    if len(rows) < 2:
        raise ValueError(f"Yahoo chart returned insufficient rows for {ticker}")

    rows.sort(key=lambda point: point["date"])
    return rows


def fetch_stooq_history(ticker):
    symbol = stooq_symbol(ticker)
    url = f"https://stooq.com/q/d/l/?s={quote(symbol)}&i=d"
    raw = fetch_url(url).decode("utf-8", errors="ignore")

    rows = []
    reader = csv.DictReader(raw.splitlines())
    for row in reader:
        close = row.get("Close", "")
        if close in ("", "N/D"):
            continue

        point = {
            "date": row.get("Date", ""),
            "open": safe_float(row.get("Open")),
            "high": safe_float(row.get("High")),
            "low": safe_float(row.get("Low")),
            "close": safe_float(close),
            "volume": int(safe_float(row.get("Volume"), 0.0)),
        }
        if point["date"]:
            rows.append(point)

    if not rows:
        raise ValueError(f"No historical data returned for {ticker}")

    rows.sort(key=lambda point: point["date"])
    return rows


def fallback_history(ticker, points=MAX_CHART_HISTORY_DAYS + 40):
    ticker = sanitize_ticker(ticker)
    seed = sum((idx + 1) * ord(ch) for idx, ch in enumerate(ticker))
    rng = random.Random(seed)
    days = last_business_days(max(80, points))

    baseline = 50.0 + (seed % 500) / 2.0
    drift = rng.uniform(-0.0002, 0.0012)

    history = []
    price = baseline
    for idx, d in enumerate(days):
        cyclical = math.sin(idx / 14.0) * 0.004
        noise = rng.uniform(-0.015, 0.015)
        daily_move = drift + cyclical + noise

        open_price = max(2.0, price * (1 + rng.uniform(-0.006, 0.006)))
        close = max(2.0, open_price * (1 + daily_move))
        high = max(open_price, close) * (1 + rng.uniform(0.0005, 0.012))
        low = min(open_price, close) * (1 - rng.uniform(0.0005, 0.012))

        history.append(
            {
                "date": d.isoformat(),
                "open": round(open_price, 4),
                "high": round(high, 4),
                "low": round(low, 4),
                "close": round(close, 4),
                "volume": int(rng.uniform(1_800_000, 18_000_000)),
            }
        )
        price = close

    return history


def get_history(ticker, points=180):
    ticker = sanitize_ticker(ticker)
    requested_points = MAX_CHART_HISTORY_DAYS if points <= 0 else points
    range_value = yahoo_chart_range(requested_points)

    def load_history():
        try:
            return fetch_yahoo_history(ticker, range_value=range_value)
        except Exception:
            pass
        try:
            return fetch_stooq_history(ticker)
        except Exception:
            return fallback_history(ticker, MAX_CHART_HISTORY_DAYS + 40)

    full_history = cached(f"history:{ticker}:{range_value}", 60, load_history)
    if points <= 0:
        return full_history
    return full_history[-points:]


def fetch_yahoo_intraday_history(ticker, interval="5m", range_value="2d"):
    ticker = sanitize_ticker(ticker)
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(ticker)}"
        f"?interval={quote(interval)}&range={quote(range_value)}&includePrePost=false&events=div%2Csplits"
    )
    raw = fetch_url(url, headers=YAHOO_BROWSER_HEADERS).decode("utf-8", errors="ignore")
    payload = json.loads(raw)
    chart = payload.get("chart", {})
    result = (chart.get("result") or [None])[0]
    if chart.get("error") or not result:
        raise ValueError(f"Yahoo intraday chart did not return data for {ticker}")

    indicators = result.get("indicators", {})
    quote_rows = (indicators.get("quote") or [{}])[0]
    timestamps = result.get("timestamp") or []

    rows = []
    for idx, timestamp in enumerate(timestamps):
        closes = quote_rows.get("close") or []
        close_raw = closes[idx] if idx < len(closes) else None
        if close_raw in (None, ""):
            continue

        close = safe_float(close_raw, 0.0)
        opens = quote_rows.get("open") or []
        highs = quote_rows.get("high") or []
        lows = quote_rows.get("low") or []
        volumes = quote_rows.get("volume") or []

        open_price = safe_float(opens[idx] if idx < len(opens) else None, close)
        high = safe_float(highs[idx] if idx < len(highs) else None, max(open_price, close))
        low = safe_float(lows[idx] if idx < len(lows) else None, min(open_price, close))
        volume = int(safe_float(volumes[idx] if idx < len(volumes) else None, 0.0))
        point_dt = datetime.utcfromtimestamp(int(timestamp)).replace(second=0, microsecond=0)

        rows.append(
            {
                "date": point_dt.isoformat() + "Z",
                "open": round(open_price, 4),
                "high": round(high, 4),
                "low": round(low, 4),
                "close": round(close, 4),
                "volume": volume,
            }
        )

    if len(rows) < 2:
        raise ValueError(f"Yahoo intraday chart returned insufficient rows for {ticker}")

    rows.sort(key=lambda point: point["date"])
    return rows


def fallback_intraday_history(ticker, points=156):
    base_history = get_history(ticker, points=3)
    last_close = safe_float(base_history[-1]["close"], 100.0)
    prev_close = safe_float(base_history[-2]["close"], last_close)
    rng = random.Random(sum(ord(ch) for ch in sanitize_ticker(ticker)) + points)
    end_dt = datetime.utcnow().replace(second=0, microsecond=0)
    start_dt = end_dt - timedelta(minutes=5 * max(points - 1, 1))

    rows = []
    current_price = prev_close
    target_price = last_close
    for idx in range(points):
        point_dt = start_dt + timedelta(minutes=5 * idx)
        blend = idx / float(max(points - 1, 1))
        baseline = current_price + ((target_price - current_price) * blend)
        open_value = baseline * (1 + rng.uniform(-0.0015, 0.0015))
        close_value = baseline * (1 + rng.uniform(-0.002, 0.002))
        high_value = max(open_value, close_value) * (1 + rng.uniform(0.0006, 0.0026))
        low_value = min(open_value, close_value) * (1 - rng.uniform(0.0006, 0.0026))
        rows.append(
            {
                "date": point_dt.isoformat() + "Z",
                "open": round(open_value, 4),
                "high": round(high_value, 4),
                "low": round(low_value, 4),
                "close": round(close_value, 4),
                "volume": int(rng.uniform(40_000, 280_000)),
            }
        )
        current_price = close_value

    return rows


def get_intraday_history(ticker, points=156):
    ticker = sanitize_ticker(ticker)
    requested_points = int(clamp(points, 24, 288))

    def load_intraday():
        try:
            return fetch_yahoo_intraday_history(ticker, interval="5m", range_value="2d")
        except Exception:
            return fallback_intraday_history(ticker, points=max(requested_points, 156))

    full_history = cached(f"intraday:{ticker}", 2 * 60, load_intraday)
    return full_history[-requested_points:]


def sentiment_score(text):
    words = [token.strip(".,!?()[]{}:;\"'").lower() for token in text.split()]
    words = [word for word in words if word]
    if not words:
        return 0.0

    pos_count = sum(1 for word in words if word in POSITIVE_WORDS)
    neg_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    if pos_count == 0 and neg_count == 0:
        return 0.0

    return (pos_count - neg_count) / max(len(words), 6)


def sentiment_label(score):
    if score > 0.035:
        return "Bullish"
    if score < -0.035:
        return "Bearish"
    return "Neutral"


def normalize_news_date(raw_date):
    if not raw_date:
        return ""

    formats = [
        "%a, %d %b %Y %H:%M:%S %Z",
        "%a, %d %b %Y %H:%M:%S %z",
        "%Y-%m-%dT%H:%M:%SZ",
    ]
    for fmt in formats:
        try:
            parsed = datetime.strptime(raw_date, fmt)
            return parsed.strftime("%Y-%m-%d %H:%M")
        except ValueError:
            continue
    return raw_date[:22]


def build_news_search_terms(ticker):
    ticker = sanitize_ticker(ticker)
    company_name = TICKER_COMPANY_NAMES.get(ticker, ticker)
    return {
        "rss": f"{company_name} {ticker} stock earnings guidance analyst forecast",
        "newsapi": f"\"{ticker}\" OR \"{company_name}\" stock earnings guidance analyst forecast",
        "companyName": company_name,
    }


def news_relevance_score(item, ticker):
    ticker = sanitize_ticker(ticker)
    company_name = TICKER_COMPANY_NAMES.get(ticker, ticker).lower()
    title = (item.get("title") or "").lower()
    description = (item.get("description") or "").lower()
    source_name = (item.get("source") or "").lower()
    text = f"{title} {description} {source_name}"

    score = 0.0
    if ticker.lower() in text:
        score += 2.5
    if company_name and company_name in text:
        score += 2.2
    if title.startswith(ticker.lower()) or (company_name and title.startswith(company_name)):
        score += 0.35
    if any(term in text for term in ("stock", "shares", "equity", "trading")):
        score += 0.35
    if any(term in text for term in ("earnings", "forecast", "guidance", "price target", "analyst", "outlook")):
        score += 0.5
    if any(term in text for term in ("nasdaq", "nyse", "market", "wall street")):
        score += 0.2
    return round(score, 4)


def rank_news_items(ticker, items, limit=8):
    ranked_items = []
    for item in items:
        enriched = dict(item)
        enriched["relevanceScore"] = news_relevance_score(enriched, ticker)
        ranked_items.append(enriched)

    ranked_items.sort(
        key=lambda row: (safe_float(row.get("relevanceScore"), 0.0), row.get("published", "")),
        reverse=True,
    )

    filtered = [row for row in ranked_items if safe_float(row.get("relevanceScore"), 0.0) >= 0.45]
    if not filtered:
        filtered = ranked_items

    return filtered[: max(1, min(limit, 12))]


def fallback_news(ticker):
    ticker = sanitize_ticker(ticker)
    company_name = TICKER_COMPANY_NAMES.get(ticker, ticker)
    samples = [
        f"{company_name} ({ticker}) gains as analysts cite stronger demand outlook",
        f"{company_name} investors watch margin trends ahead of next earnings cycle",
        f"Options activity around {ticker} suggests higher near-term volatility",
        f"{company_name} sentiment mixed as macro data drives broader market swings",
        f"Traders debate whether {ticker} can hold momentum above key resistance",
        f"Institutional flows into {company_name} remain resilient despite risk-off sessions",
    ]

    items = []
    now = datetime.utcnow()
    for index, title in enumerate(samples):
        score = sentiment_score(title)
        items.append(
            {
                "title": title,
                "link": "https://news.google.com",
                "published": (now - timedelta(hours=index * 6)).strftime("%Y-%m-%d %H:%M"),
                "source": "Fallback",
                "description": "",
                "sentiment": sentiment_label(score),
                "sentimentScore": round(score, 4),
            }
        )
    return rank_news_items(ticker, items, limit=len(items))


def fetch_google_rss_news(ticker, limit=8):
    search_terms = build_news_search_terms(ticker)
    query = quote(search_terms["rss"])
    url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
    raw = fetch_url(url)
    root = ET.fromstring(raw)

    items = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        published = normalize_news_date(item.findtext("pubDate") or "")

        if not title:
            continue

        score = sentiment_score(title)
        items.append(
            {
                "title": title,
                "link": link,
                "published": published,
                "source": "Google News RSS",
                "description": "",
                "sentiment": sentiment_label(score),
                "sentimentScore": round(score, 4),
            }
        )

        if len(items) >= limit:
            break

    if not items:
        raise ValueError(f"No news items found for {ticker}")

    return rank_news_items(ticker, items, limit=limit)


def fetch_newsapi_news(ticker, limit=8):
    if not NEWS_API_KEY:
        raise ValueError("NEWSAPI_KEY is not set")

    query = quote(build_news_search_terms(ticker)["newsapi"])
    url = (
        "https://newsapi.org/v2/everything?"
        f"q={query}&language=en&sortBy=publishedAt&pageSize={max(1, min(limit, 20))}"
    )
    raw = fetch_url(url, headers={"X-Api-Key": NEWS_API_KEY})
    payload = json.loads(raw.decode("utf-8", errors="ignore"))

    if payload.get("status") != "ok":
        raise ValueError(payload.get("message", "NewsAPI request failed"))

    items = []
    for article in payload.get("articles", []):
        title = (article.get("title") or "").strip()
        if not title:
            continue

        source_name = (article.get("source") or {}).get("name") or "NewsAPI"
        description = (article.get("description") or "").strip()
        combined = f"{title} {description}".strip()
        score = sentiment_score(combined)

        items.append(
            {
                "title": title,
                "link": (article.get("url") or "").strip(),
                "published": normalize_news_date(article.get("publishedAt") or ""),
                "source": source_name,
                "description": description,
                "sentiment": sentiment_label(score),
                "sentimentScore": round(score, 4),
            }
        )

        if len(items) >= limit:
            break

    if not items:
        raise ValueError(f"No NewsAPI articles found for {ticker}")
    return rank_news_items(ticker, items, limit=limit)


def get_news(ticker, limit=8):
    ticker = sanitize_ticker(ticker)

    def load_news():
        provider = NEWS_API_PROVIDER or "auto"
        if provider not in ("auto", "newsapi", "rss"):
            provider = "auto"

        if provider in ("auto", "newsapi") and NEWS_API_KEY:
            try:
                return fetch_newsapi_news(ticker, limit=limit)
            except Exception:
                if provider == "newsapi":
                    raise

        if provider in ("auto", "rss"):
            try:
                return fetch_google_rss_news(ticker, limit=limit)
            except Exception:
                if provider == "rss":
                    raise

        return fallback_news(ticker)

    items = cached(f"news:{ticker}", 20 * 60, load_news)
    return rank_news_items(ticker, items, limit=limit)


def compact_words(text, limit=24):
    words = str(text or "").split()
    if len(words) <= limit:
        return " ".join(words)
    return " ".join(words[:limit]).strip() + "..."


def build_provider_analysis_prompt(prompt_text, ticker, prediction, news_items):
    ticker = sanitize_ticker(ticker)
    top_features = prediction.get("topFeatures") or []
    top_features_text = ", ".join(
        f"{row.get('feature', 'Signal')} ({safe_float(row.get('coefficient'), 0.0):.4f})"
        for row in top_features[:4]
    )
    if not top_features_text:
        top_features_text = "Momentum20, RSI, Volatility_30d, Sentiment"

    headlines = []
    for item in (news_items or [])[:5]:
        headlines.append(
            f"- {compact_words(item.get('title', ''), 18)} | sentiment={item.get('sentiment', 'Neutral')}"
        )

    chart_meta = prediction.get("chart") or {}
    learning_7d = ((prediction.get("learning") or {}).get("horizons") or {}).get("7d") or {}
    summary_lines = [
        "You are validating a stock forecast using ONLY the data provided below.",
        "Return JSON only.",
        "",
        f"User request: {prompt_text or f'Analyze {ticker}'}",
        f"Ticker: {ticker}",
        f"Current price: {prediction.get('currentPrice')}",
        f"7-day expected return (%): {prediction.get('expectedReturn7dPct')}",
        f"30-day expected return (%): {prediction.get('expectedReturn30dPct')}",
        f"7-day target price: {prediction.get('predictedPrice7d')}",
        f"30-day target price: {prediction.get('predictedPrice30d')}",
        f"Confidence (%): {prediction.get('confidencePct')}",
        f"Risk level: {prediction.get('riskLevel')}",
        f"Sentiment: {prediction.get('sentiment')} ({prediction.get('sentimentScore')})",
        f"Geo sentiment: {(prediction.get('geoSentiment') or {}).get('sentiment')} ({(prediction.get('geoSentiment') or {}).get('score')})",
        f"RSI: {(prediction.get('indicators') or {}).get('rsi')}",
        f"Volatility (%): {(prediction.get('indicators') or {}).get('volatilityPct')}",
        f"Momentum 20D (%): {(prediction.get('indicators') or {}).get('momentum20Pct')}",
        f"Prediction engine: {(prediction.get('model') or {}).get('name')}",
        f"History days available: {chart_meta.get('historyDaysAvailable', 0)}",
        f"Self-learning sample count (7d): {learning_7d.get('sampleCount', 0)}",
        f"Top forecast drivers: {top_features_text}",
        "Headlines:",
        "\n".join(headlines) if headlines else "- No recent headlines available",
        "",
        "Return this exact JSON shape:",
        '{',
        '  "trend": "UP or DOWN or MIXED",',
        '  "confidence_pct": 0,',
        '  "expected_return_7d_pct": 0.0,',
        '  "expected_return_30d_pct": 0.0,',
        '  "summary": "one short sentence",',
        '  "reasons": ["short reason 1", "short reason 2", "short reason 3"]',
        '}',
        "Do not use markdown fences.",
    ]
    return "\n".join(summary_lines)


def extract_json_object_from_text(text):
    raw_text = str(text or "").strip()
    if not raw_text:
        return None

    start_index = raw_text.find("{")
    if start_index < 0:
        return None

    depth = 0
    in_string = False
    escape_next = False
    for index in range(start_index, len(raw_text)):
        ch = raw_text[index]
        if escape_next:
            escape_next = False
            continue
        if ch == "\\":
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                candidate = raw_text[start_index : index + 1]
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    return None
    return None


def clamp_confidence_pct(value, fallback):
    return int(round(clamp(safe_float(value, fallback), 0.0, 100.0)))


def normalize_provider_analysis(payload_text, fallback_prediction):
    parsed = extract_json_object_from_text(payload_text)
    if not isinstance(parsed, dict):
        return None

    trend = str(parsed.get("trend", "MIXED")).strip().upper()
    if trend not in ("UP", "DOWN", "MIXED"):
        trend = "MIXED"

    reasons = parsed.get("reasons") or []
    if not isinstance(reasons, list):
        reasons = []

    return {
        "trend": trend,
        "confidencePct": clamp_confidence_pct(parsed.get("confidence_pct"), fallback_prediction.get("confidencePct", 60)),
        "expectedReturn7dPct": round(safe_float(parsed.get("expected_return_7d_pct"), fallback_prediction.get("expectedReturn7dPct", 0.0)), 3),
        "expectedReturn30dPct": round(safe_float(parsed.get("expected_return_30d_pct"), fallback_prediction.get("expectedReturn30dPct", 0.0)), 3),
        "summary": compact_words(parsed.get("summary", ""), 22),
        "reasons": [compact_words(item, 16) for item in reasons[:3] if str(item or "").strip()],
        "rawText": compact_words(payload_text, 80),
    }


def extract_text_from_openai_responses(payload):
    if isinstance(payload.get("output_text"), str) and payload.get("output_text", "").strip():
        return payload["output_text"]

    parts = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            text_value = content.get("text")
            if isinstance(text_value, str) and text_value.strip():
                parts.append(text_value)
    return "\n".join(parts).strip()


def extract_text_from_openai_chat(payload):
    choices = payload.get("choices") or []
    if not choices:
        return ""
    message = (choices[0] or {}).get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                text_value = item.get("text") or item.get("content")
                if isinstance(text_value, str) and text_value.strip():
                    parts.append(text_value)
        return "\n".join(parts).strip()
    return ""


def extract_text_from_gemini(payload):
    candidates = payload.get("candidates") or []
    if not candidates:
        return ""
    content = (candidates[0] or {}).get("content") or {}
    parts = content.get("parts") or []
    return "\n".join(part.get("text", "") for part in parts if part.get("text")).strip()


def extract_text_from_anthropic(payload):
    content = payload.get("content") or []
    return "\n".join(item.get("text", "") for item in content if item.get("type") == "text" and item.get("text")).strip()


def call_assistant_provider_api(assistant_model, prompt_text, ticker, prediction, news_items):
    config = ASSISTANT_PROVIDER_CONFIG.get(assistant_model["id"])
    if not config:
        return {"enabled": False, "used": False, "status": "unsupported", "summary": ""}

    api_key = os.environ.get(config["apiKeyEnv"], "").strip()
    provider_model = os.environ.get(config["modelEnv"], "").strip() or config["defaultModel"]
    if not api_key:
        return {
            "enabled": False,
            "used": False,
            "status": "unconfigured",
            "summary": "",
            "providerModel": provider_model,
            "error": f"{config['apiKeyEnv']} is not set",
        }

    provider_prompt = build_provider_analysis_prompt(prompt_text, ticker, prediction, news_items)
    transport = config["transport"]
    endpoint = config["endpoint"].format(model=quote(provider_model, safe=""))

    if transport == "openai_responses":
        payload = {
            "model": provider_model,
            "instructions": "Analyze the stock using only the provided dashboard context and output strict JSON only.",
            "input": provider_prompt,
        }
        response_payload = fetch_json_post(
            endpoint,
            payload,
            timeout=45,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        raw_text = extract_text_from_openai_responses(response_payload)
    elif transport == "gemini_generate_content":
        payload = {
            "contents": [{"role": "user", "parts": [{"text": provider_prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
            },
        }
        response_payload = fetch_json_post(
            endpoint,
            payload,
            timeout=45,
            headers={"x-goog-api-key": api_key},
        )
        raw_text = extract_text_from_gemini(response_payload)
    elif transport == "anthropic_messages":
        payload = {
            "model": provider_model,
            "max_tokens": 600,
            "messages": [{"role": "user", "content": provider_prompt}],
        }
        response_payload = fetch_json_post(
            endpoint,
            payload,
            timeout=45,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
        )
        raw_text = extract_text_from_anthropic(response_payload)
    elif transport == "openai_chat_compatible":
        payload = {
            "model": provider_model,
            "messages": [
                {"role": "system", "content": "Analyze the stock using only the provided context and return JSON only."},
                {"role": "user", "content": provider_prompt},
            ],
            "temperature": 0.2,
        }
        response_payload = fetch_json_post(
            endpoint,
            payload,
            timeout=45,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        raw_text = extract_text_from_openai_chat(response_payload)
    elif transport == "perplexity_sonar":
        payload = {
            "model": provider_model,
            "messages": [
                {"role": "system", "content": "Analyze the stock using only the provided context and return JSON only."},
                {"role": "user", "content": provider_prompt},
            ],
            "temperature": 0.1,
        }
        response_payload = fetch_json_post(
            endpoint,
            payload,
            timeout=45,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        raw_text = extract_text_from_openai_chat(response_payload)
    else:
        return {"enabled": False, "used": False, "status": "unsupported", "summary": ""}

    normalized = normalize_provider_analysis(raw_text, prediction)
    if not normalized:
        return {
            "enabled": True,
            "used": False,
            "status": "parse_error",
            "summary": "",
            "providerModel": provider_model,
            "error": "Provider response was not valid JSON",
            "rawText": compact_words(raw_text, 60),
        }

    return {
        "enabled": True,
        "used": True,
        "status": "ok",
        "providerModel": provider_model,
        "summary": normalized.get("summary", ""),
        "analysis": normalized,
    }


def get_assistant_provider_analysis(assistant_model, prompt_text, ticker, prediction, news_items):
    ticker = sanitize_ticker(ticker)
    prompt_hash = hashlib.sha1(f"{assistant_model['id']}|{ticker}|{prompt_text}".encode("utf-8")).hexdigest()[:16]
    cache_key = f"assistant-provider:{assistant_model['id']}:{ticker}:{prompt_hash}"
    return cached(
        cache_key,
        10 * 60,
        lambda: call_assistant_provider_api(assistant_model, prompt_text, ticker, prediction, news_items),
    )


def infer_regions_from_text(text):
    text_lc = (text or "").lower()
    regions = []
    for region_name, keywords in REGION_KEYWORDS.items():
        if any(keyword in text_lc for keyword in keywords):
            regions.append(region_name)

    if not regions:
        regions.append("North America")
    return regions


def fetch_nominatim_geocode(query):
    url = (
        "https://nominatim.openstreetmap.org/search"
        f"?format=jsonv2&limit=1&q={quote(query)}"
    )
    raw = fetch_url(url, headers={"Accept-Language": "en-US,en;q=0.8"})
    payload = json.loads(raw.decode("utf-8", errors="ignore"))
    if not payload:
        raise ValueError("No Nominatim results")

    item = payload[0]
    return {
        "lat": float(item.get("lat")),
        "lon": float(item.get("lon")),
        "display_name": item.get("display_name", query),
    }


def get_headquarters_location(ticker):
    ticker = sanitize_ticker(ticker)
    query = TICKER_HEADQUARTERS_QUERY.get(ticker, f"{ticker} corporate headquarters")
    fallback_lat, fallback_lon = TICKER_HQ_FALLBACK.get(ticker, (37.0902, -95.7129))

    def loader():
        try:
            return fetch_nominatim_geocode(query)
        except Exception:
            return {
                "lat": fallback_lat,
                "lon": fallback_lon,
                "display_name": query,
            }

    result = cached(f"hq-geocode:{ticker}", 24 * 60 * 60, loader)
    result["query"] = query
    return result


def closest_region_name(lat, lon):
    best_region = "North America"
    best_distance = None
    for region_name, hub in REGION_HUBS.items():
        distance = ((lat - hub["lat"]) ** 2) + ((lon - hub["lon"]) ** 2)
        if best_distance is None or distance < best_distance:
            best_distance = distance
            best_region = region_name
    return best_region


def build_news_region_aggregates(items):
    aggregates = {}
    for region_name, hub in REGION_HUBS.items():
        aggregates[region_name] = {
            "region": region_name,
            "lat": hub["lat"],
            "lon": hub["lon"],
            "count": 0,
            "scoreSum": 0.0,
        }

    for item in items:
        title = item.get("title", "")
        source_name = item.get("source", "")
        description = item.get("description", "")
        regions = infer_regions_from_text(f"{title} {description} {source_name}")
        score = safe_float(item.get("sentimentScore"), 0.0)

        for region_name in regions:
            if region_name not in aggregates:
                continue
            aggregates[region_name]["count"] += 1
            aggregates[region_name]["scoreSum"] += score

    return aggregates


def default_geo_profile(home_region):
    profile = {
        "investments": {
            home_region: 0.82,
            "North America": 0.42,
            "Europe": 0.28,
            "East Asia": 0.28,
        },
        "origin": {
            home_region: 1.0,
            "North America": 0.36,
        },
        "affected": {
            home_region: 0.68,
            "North America": 0.34,
            "Europe": 0.26,
            "East Asia": 0.3,
        },
    }

    if home_region == "North America":
        profile["investments"]["North America"] = 0.82
        profile["affected"]["North America"] = 0.68

    return profile


def build_geo_profile(ticker, home_region, news_aggregates):
    ticker = sanitize_ticker(ticker)
    base_profile = default_geo_profile(home_region)
    overrides = TICKER_GEO_PROFILES.get(ticker, {})

    profile = {}
    for mode_id in GEO_MODE_METADATA.keys():
        combined = dict(base_profile.get(mode_id, {}))
        for region_name, weight in overrides.get(mode_id, {}).items():
            combined[region_name] = max(combined.get(region_name, 0.0), safe_float(weight, 0.0))
        profile[mode_id] = combined

    ranked_news_regions = sorted(
        news_aggregates.values(),
        key=lambda row: (row["count"], abs(row["scoreSum"])),
        reverse=True,
    )
    for row in ranked_news_regions[:3]:
        region_name = row["region"]
        count = row["count"]
        if count <= 0:
            continue

        invest_boost = clamp(0.26 + (count * 0.07), 0.26, 0.8)
        affected_boost = clamp(0.32 + (count * 0.08), 0.32, 0.88)
        origin_boost = clamp(0.2 + (count * 0.04), 0.2, 0.58)

        profile["investments"][region_name] = max(profile["investments"].get(region_name, 0.0), invest_boost)
        profile["affected"][region_name] = max(profile["affected"].get(region_name, 0.0), affected_boost)
        if region_name == home_region or count >= 2:
            profile["origin"][region_name] = max(profile["origin"].get(region_name, 0.0), origin_boost)

    return profile


def geo_influence_label(relevance_score):
    if relevance_score >= 0.8:
        return "Core"
    if relevance_score >= 0.58:
        return "Active"
    if relevance_score >= 0.34:
        return "Watch"
    return "Peripheral"


def build_geo_reason(ticker, mode_id, region_name, home_region):
    ticker = sanitize_ticker(ticker)
    if mode_id == "investments":
        if region_name == home_region:
            return f"{ticker} has core investment and operating capacity anchored in {region_name}."
        return f"{ticker} keeps meaningful partner, customer, or facility exposure in {region_name}."
    if mode_id == "origin":
        if region_name == home_region:
            return f"{ticker} is primarily rooted in {region_name} through its home market and company base."
        return f"{region_name} contributes to the trading narrative and operating footprint around {ticker}."
    return f"Policy, supply chain, or demand shifts in {region_name} can influence expectations for {ticker}."


def build_geo_mode_regions(ticker, mode_id, profile_weights, news_aggregates, home_region):
    mode_meta = GEO_MODE_METADATA[mode_id]
    rows = []
    weighted_signal_sum = 0.0
    weighted_total = 0.0

    for region_name, hub in REGION_HUBS.items():
        aggregate = news_aggregates.get(region_name, {})
        article_count = int(aggregate.get("count", 0))
        score_sum = safe_float(aggregate.get("scoreSum"), 0.0)
        headline_score = (score_sum / article_count) if article_count else 0.0
        exposure_weight = safe_float(profile_weights.get(region_name), 0.0)
        news_presence = clamp(article_count / 4.0, 0.0, 1.0)
        relevance_score = clamp((0.68 * exposure_weight) + (0.32 * news_presence), 0.0, 1.0)

        if relevance_score < 0.12 and article_count == 0 and region_name != home_region:
            continue

        signal_score = headline_score * (0.55 + (0.45 * max(exposure_weight, 0.2)))
        weight_for_mode = max(relevance_score, 0.18)
        weighted_signal_sum += signal_score * weight_for_mode
        weighted_total += weight_for_mode

        rows.append(
            {
                "region": region_name,
                "lat": hub["lat"],
                "lon": hub["lon"],
                "articleCount": article_count,
                "headlineScore": round(headline_score, 4),
                "sentimentScore": round(signal_score, 4),
                "sentiment": sentiment_label(signal_score),
                "headlineSentiment": sentiment_label(headline_score),
                "relevanceScore": round(relevance_score, 4),
                "relevancePct": int(round(relevance_score * 100.0)),
                "exposureWeight": round(exposure_weight, 3),
                "influenceLevel": geo_influence_label(relevance_score),
                "driver": build_geo_reason(ticker, mode_id, region_name, home_region),
            }
        )

    rows.sort(
        key=lambda item: (item["relevanceScore"], item["articleCount"], abs(item["sentimentScore"])),
        reverse=True,
    )
    top_region = rows[0]["region"] if rows else home_region
    composite_score = (weighted_signal_sum / weighted_total) if weighted_total else 0.0

    return {
        "id": mode_id,
        "label": mode_meta["label"],
        "description": mode_meta["description"],
        "topRegion": top_region,
        "compositeScore": round(composite_score, 4),
        "regions": rows,
    }


def build_map_insights(ticker, news_items=None):
    ticker = sanitize_ticker(ticker)
    items = news_items if news_items is not None else get_news(ticker, limit=20)
    hq_location = get_headquarters_location(ticker)
    home_region = closest_region_name(
        safe_float(hq_location.get("lat"), TICKER_HQ_FALLBACK.get(ticker, (37.0902, -95.7129))[0]),
        safe_float(hq_location.get("lon"), TICKER_HQ_FALLBACK.get(ticker, (37.0902, -95.7129))[1]),
    )
    news_aggregates = build_news_region_aggregates(items)
    geo_profile = build_geo_profile(ticker, home_region, news_aggregates)

    modes = {}
    for mode_id in GEO_MODE_METADATA.keys():
        modes[mode_id] = build_geo_mode_regions(
            ticker,
            mode_id,
            geo_profile.get(mode_id, {}),
            news_aggregates,
            home_region,
        )

    combined_regions = {}
    for mode_id, mode_payload in modes.items():
        blend_weight = safe_float(GEO_MODE_BLEND.get(mode_id), 0.0)
        for row in mode_payload["regions"]:
            region_name = row["region"]
            bucket = combined_regions.setdefault(
                region_name,
                {
                    "region": region_name,
                    "lat": row["lat"],
                    "lon": row["lon"],
                    "articleCount": 0,
                    "relevanceScore": 0.0,
                    "sentimentScore": 0.0,
                },
            )
            bucket["articleCount"] = max(bucket["articleCount"], row["articleCount"])
            bucket["relevanceScore"] += row["relevanceScore"] * blend_weight
            bucket["sentimentScore"] += row["sentimentScore"] * blend_weight

    markers = []
    for region_name, row in combined_regions.items():
        markers.append(
            {
                "region": region_name,
                "lat": row["lat"],
                "lon": row["lon"],
                "articleCount": row["articleCount"],
                "relevanceScore": round(row["relevanceScore"], 4),
                "relevancePct": int(round(row["relevanceScore"] * 100.0)),
                "sentimentScore": round(row["sentimentScore"], 4),
                "sentiment": sentiment_label(row["sentimentScore"]),
            }
        )

    markers.sort(
        key=lambda item: (item["relevanceScore"], item["articleCount"], abs(item["sentimentScore"])),
        reverse=True,
    )

    blend_total = sum(GEO_MODE_BLEND.values()) or 1.0
    geo_sentiment_score = sum(
        safe_float(mode_payload.get("compositeScore"), 0.0) * safe_float(GEO_MODE_BLEND.get(mode_id), 0.0)
        for mode_id, mode_payload in modes.items()
    ) / blend_total
    top_region = markers[0]["region"] if markers else home_region

    return {
        "ticker": ticker,
        "mappingProvider": "Trading Pro Geo Signals + OpenStreetMap",
        "tileLayer": {
            "url": "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "attribution": "© OpenStreetMap contributors",
        },
        "defaultMode": "investments",
        "availableModes": [
            {
                "id": mode_id,
                "label": meta["label"],
                "description": meta["description"],
            }
            for mode_id, meta in GEO_MODE_METADATA.items()
        ],
        "modes": modes,
        "headquarters": {
            "name": hq_location.get("display_name", hq_location.get("query", ticker)),
            "lat": round(float(hq_location["lat"]), 6),
            "lon": round(float(hq_location["lon"]), 6),
        },
        "companyHeadquarters": {
            "name": hq_location.get("display_name", hq_location.get("query", ticker)),
            "lat": round(float(hq_location["lat"]), 6),
            "lon": round(float(hq_location["lon"]), 6),
        },
        "homeRegion": home_region,
        "geoSentimentScore": round(geo_sentiment_score, 4),
        "predictionLiftScore": round(geo_sentiment_score, 4),
        "topRegion": top_region,
        "markers": markers,
    }


def moving_average(values, window):
    if not values:
        return 0.0
    if len(values) < window:
        return sum(values) / len(values)
    subset = values[-window:]
    return sum(subset) / len(subset)


def stddev(values):
    if len(values) < 2:
        return 0.0
    return statistics.pstdev(values)


def calc_rsi(closes, period=14):
    if len(closes) < period + 1:
        return 50.0

    gains = []
    losses = []
    for idx in range(-period, 0):
        diff = closes[idx] - closes[idx - 1]
        gains.append(max(diff, 0.0))
        losses.append(abs(min(diff, 0.0)))

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def trend_strength(closes, window=20):
    if len(closes) < window:
        return 0.0

    y = closes[-window:]
    x_mean = (window - 1) / 2.0
    y_mean = sum(y) / window

    num = 0.0
    den = 0.0
    for idx, value in enumerate(y):
        dx = idx - x_mean
        num += dx * (value - y_mean)
        den += dx * dx

    slope = (num / den) if den else 0.0
    if y_mean == 0:
        return 0.0

    return slope / y_mean


def mean_absolute_error_manual(actual, predicted):
    if not actual:
        return 0.0
    errors = [abs(float(a) - float(p)) for a, p in zip(actual, predicted)]
    return sum(errors) / len(errors)


def r2_score_manual(actual, predicted):
    if not actual:
        return 0.0
    mean_actual = sum(actual) / len(actual)
    ss_res = sum((float(a) - float(p)) ** 2 for a, p in zip(actual, predicted))
    ss_tot = sum((float(a) - mean_actual) ** 2 for a in actual)
    if ss_tot == 0:
        return 0.0
    return 1.0 - (ss_res / ss_tot)


def rolling_mean_at_index(values, end_index, window):
    start = end_index - window + 1
    if start < 0:
        return None
    subset = values[start : end_index + 1]
    if len(subset) < window:
        return None
    return sum(subset) / window


def rolling_std_at_index(values, end_index, window):
    start = end_index - window + 1
    if start < 0:
        return None
    subset = values[start : end_index + 1]
    if len(subset) < window or any(item is None for item in subset):
        return None
    return statistics.pstdev(subset)


def calc_rsi_at_index(closes, index, period=14):
    if index < period:
        return None

    gains = []
    losses = []
    for idx in range(index - period + 1, index + 1):
        diff = closes[idx] - closes[idx - 1]
        gains.append(max(diff, 0.0))
        losses.append(abs(min(diff, 0.0)))

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))


def build_lr_feature_rows(history, include_target=True, horizon=LR_FORECAST_DAYS):
    rows = []
    closes = [point["close"] for point in history]
    one_day_returns = [None]
    for idx in range(1, len(closes)):
        one_day_returns.append(pct_change(closes[idx], closes[idx - 1]))

    min_index = 200  # MA_200 is the widest rolling window.
    max_index = len(history) - 1

    for idx in range(min_index, max_index + 1):
        if include_target and (idx + horizon >= len(history)):
            continue

        close_lag1 = closes[idx - 1] if idx >= 1 else None
        close_lag5 = closes[idx - 5] if idx >= 5 else None
        close_lag10 = closes[idx - 10] if idx >= 10 else None
        return_1d = one_day_returns[idx]
        return_5d = pct_change(closes[idx], closes[idx - 5]) if idx >= 5 else None
        return_20d = pct_change(closes[idx], closes[idx - 20]) if idx >= 20 else None
        ma_10 = rolling_mean_at_index(closes, idx, 10)
        ma_50 = rolling_mean_at_index(closes, idx, 50)
        ma_200 = rolling_mean_at_index(closes, idx, 200)
        volatility_10d = rolling_std_at_index(one_day_returns, idx, 10)
        volatility_30d = rolling_std_at_index(one_day_returns, idx, 30)
        rsi = calc_rsi_at_index(closes, idx, period=14)

        date_obj = datetime.strptime(history[idx]["date"], "%Y-%m-%d")
        month = float(date_obj.month)
        quarter = float(((date_obj.month - 1) // 3) + 1)
        day_of_week = float(date_obj.weekday())

        feature_values = [
            close_lag1,
            close_lag5,
            close_lag10,
            return_1d,
            return_5d,
            return_20d,
            ma_10,
            ma_50,
            ma_200,
            volatility_10d,
            volatility_30d,
            rsi,
            month,
            quarter,
            day_of_week,
        ]
        if any(value is None for value in feature_values):
            continue

        row = {
            "feature_date": history[idx]["date"],
            "current_close": closes[idx],
            "x": [float(value) for value in feature_values],
        }
        if include_target:
            row["target"] = float(closes[idx + horizon])
            row["target_date"] = history[idx + horizon]["date"]
        rows.append(row)
    return rows


def feature_vector_stats(rows):
    if not rows:
        return [], []

    feature_count = len(rows[0]["x"])
    means = []
    stds = []
    for feature_index in range(feature_count):
        values = [safe_float(row["x"][feature_index]) for row in rows]
        mean_value = safe_mean(values, 0.0)
        std_value = statistics.pstdev(values) if len(values) > 1 else 0.0
        means.append(mean_value)
        stds.append(std_value if std_value > 1e-9 else 1.0)
    return means, stds


def normalize_feature_vector(vector, means, stds):
    normalized = []
    for value, mean_value, std_value in zip(vector, means, stds):
        normalized.append((safe_float(value) - mean_value) / std_value)
    return normalized


def vector_distance(left, right):
    if not left or not right:
        return 0.0
    squared = [(left[idx] - right[idx]) ** 2 for idx in range(min(len(left), len(right)))]
    return math.sqrt(sum(squared) / max(len(squared), 1))


def build_self_learning_signal(history, horizon_days=LR_FORECAST_DAYS):
    labeled_rows = build_lr_feature_rows(history, include_target=True, horizon=horizon_days)
    current_rows = build_lr_feature_rows(history, include_target=False, horizon=horizon_days)

    if len(labeled_rows) < SELF_LEARNING_MIN_ROWS or not current_rows:
        return None

    sample_rows = labeled_rows[-SELF_LEARNING_LOOKBACK_ROWS:]
    current_row = current_rows[-1]
    means, stds = feature_vector_stats(sample_rows)
    current_vector = normalize_feature_vector(current_row["x"], means, stds)

    scored_rows = []
    for row in sample_rows:
        row_vector = normalize_feature_vector(row["x"], means, stds)
        distance = vector_distance(current_vector, row_vector)
        realized_return = pct_change(row["target"], row["current_close"])
        scored_rows.append(
            {
                "featureDate": row["feature_date"],
                "targetDate": row["target_date"],
                "distance": distance,
                "realizedReturn": realized_return,
            }
        )

    scored_rows.sort(key=lambda item: item["distance"])
    analog_count = min(SELF_LEARNING_MAX_ANALOGS, max(6, len(scored_rows) // 8))
    neighbors = scored_rows[:analog_count]
    if not neighbors:
        return None

    total_weight = 0.0
    weighted_return_sum = 0.0
    for item in neighbors:
        weight = 1.0 / (0.22 + item["distance"])
        item["weight"] = weight
        total_weight += weight
        weighted_return_sum += weight * item["realizedReturn"]

    if total_weight <= 0.0:
        return None

    analog_return = weighted_return_sum / total_weight
    dispersion = sum(item["weight"] * abs(item["realizedReturn"] - analog_return) for item in neighbors) / total_weight
    avg_distance = safe_mean([item["distance"] for item in neighbors], 0.0)

    direction_weight = sum(
        item["weight"]
        for item in neighbors
        if (item["realizedReturn"] >= 0 and analog_return >= 0)
        or (item["realizedReturn"] < 0 and analog_return < 0)
    )
    consensus_pct = clamp((direction_weight / total_weight) * 100.0, 50.0, 100.0)
    stability_score = clamp(1.0 - min(dispersion / 0.09, 1.0), 0.0, 1.0)
    match_score = clamp(1.0 - min(avg_distance / 2.8, 1.0), 0.0, 1.0)
    blend_weight = clamp(0.24 + (0.20 * match_score) + (0.12 * stability_score), 0.18, 0.52)

    return {
        "expectedReturn": round(analog_return, 6),
        "sampleCount": len(neighbors),
        "consensusPct": int(round(consensus_pct)),
        "stabilityScore": round(stability_score, 4),
        "matchScore": round(match_score, 4),
        "dispersionPct": round(dispersion * 100.0, 3),
        "blendWeight": round(blend_weight, 4),
        "matches": [
            {
                "featureDate": item["featureDate"],
                "targetDate": item["targetDate"],
                "distance": round(item["distance"], 4),
                "realizedReturnPct": round(item["realizedReturn"] * 100.0, 3),
            }
            for item in neighbors[:3]
        ],
    }


def blend_self_learning_return(base_return, learning_signal, lower_bound, upper_bound):
    if not learning_signal:
        return clamp(base_return, lower_bound, upper_bound)

    blended = (
        ((1.0 - safe_float(learning_signal.get("blendWeight"), 0.0)) * base_return)
        + (safe_float(learning_signal.get("blendWeight"), 0.0) * safe_float(learning_signal.get("expectedReturn"), 0.0))
    )
    return clamp(blended, lower_bound, upper_bound)


def learning_confidence_adjustment(base_return, learning_signal):
    if not learning_signal:
        return 0

    adjustment = (
        (safe_float(learning_signal.get("matchScore"), 0.0) * 6.0)
        + (safe_float(learning_signal.get("stabilityScore"), 0.0) * 4.0)
        + ((safe_float(learning_signal.get("consensusPct"), 60.0) - 65.0) / 9.0)
    )

    learning_return = safe_float(learning_signal.get("expectedReturn"), 0.0)
    if base_return and learning_return and (base_return * learning_return) < 0:
        adjustment -= 6.0

    return int(round(adjustment))


def train_lr_prediction_bundle(history, horizon_days=LR_FORECAST_DAYS):
    if not SKLEARN_AVAILABLE:
        raise RuntimeError("scikit-learn is not installed")

    rows = build_lr_feature_rows(history, include_target=True, horizon=horizon_days)
    if len(rows) < 120:
        raise ValueError("Not enough rows for MA_200 + train/test split")

    split_index = int(len(rows) * 0.8)
    if split_index < 80 or (len(rows) - split_index) < 20:
        raise ValueError("Not enough train/test samples for reliable diagnostics")

    train_rows = rows[:split_index]
    test_rows = rows[split_index:]

    x_train = [row["x"] for row in train_rows]
    x_test = [row["x"] for row in test_rows]
    y_train = [row["target"] for row in train_rows]
    y_test = [row["target"] for row in test_rows]

    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    x_test_scaled = scaler.transform(x_test)

    model = LinearRegression()
    model.fit(x_train_scaled, y_train)

    y_pred_train = model.predict(x_train_scaled)
    y_pred_test = model.predict(x_test_scaled)

    train_mae = mean_absolute_error_manual(y_train, y_pred_train)
    test_mae = mean_absolute_error_manual(y_test, y_pred_test)
    train_r2 = r2_score_manual(y_train, y_pred_train)
    test_r2 = r2_score_manual(y_test, y_pred_test)

    baseline_pred = [row["current_close"] for row in test_rows]
    baseline_mae = mean_absolute_error_manual(y_test, baseline_pred)
    avg_test_price = sum(y_test) / len(y_test) if y_test else 0.0
    test_error_pct = ((test_mae / avg_test_price) * 100.0) if avg_test_price else 0.0

    latest_rows = build_lr_feature_rows(history, include_target=False, horizon=horizon_days)
    if not latest_rows:
        raise ValueError("No latest feature row available for prediction")
    latest_row = latest_rows[-1]
    latest_pred = float(model.predict(scaler.transform([latest_row["x"]]))[0])

    coefficient_pairs = list(zip(LR_FEATURES, list(model.coef_)))
    coefficient_pairs.sort(key=lambda pair: abs(pair[1]), reverse=True)
    top_features = [
        {
            "feature": feature,
            "importance": round(abs(float(coefficient)), 6),
            "coefficient": round(float(coefficient), 6),
        }
        for feature, coefficient in coefficient_pairs[:5]
    ]

    return {
        "predictedPrice7d": latest_pred,
        "featureDate": latest_row["feature_date"],
        "performance": {
            "trainMAE": round(float(train_mae), 4),
            "testMAE": round(float(test_mae), 4),
            "baselineMAE": round(float(baseline_mae), 4),
            "trainR2": round(float(train_r2), 4),
            "testR2": round(float(test_r2), 4),
            "testErrorPct": round(float(test_error_pct), 4),
            "trainSamples": len(train_rows),
            "testSamples": len(test_rows),
            "coefficients": len(LR_FEATURES),
            "horizonDays": horizon_days,
        },
        "topFeatures": top_features,
    }


def get_lr_prediction_bundle(ticker, history, horizon_days=LR_FORECAST_DAYS):
    ticker = sanitize_ticker(ticker)
    return cached(
        f"lr-model:{ticker}:h{horizon_days}",
        30 * 60,
        lambda: train_lr_prediction_bundle(history, horizon_days=horizon_days),
    )


def compute_hybrid_expected_return(closes, sentiment_avg):
    latest_price = closes[-1]
    ma5 = moving_average(closes, 5)
    ma20 = moving_average(closes, 20)
    ma_gap = pct_change(ma5, ma20) if ma20 else 0.0

    mom5 = pct_change(latest_price, closes[-6]) if len(closes) > 6 else 0.0
    mom20 = pct_change(latest_price, closes[-21]) if len(closes) > 21 else mom5
    trend = trend_strength(closes, 20) * 20.0
    returns = [pct_change(closes[idx], closes[idx - 1]) for idx in range(1, len(closes))]
    volatility = stddev(returns[-20:]) if returns else 0.0

    raw_expected = (
        0.42 * mom20
        + 0.22 * mom5
        + 0.16 * ma_gap
        + 0.14 * trend
        + 0.12 * sentiment_avg
        - 0.65 * volatility
    )
    raw_expected_30 = (
        1.65 * mom20
        + 0.38 * ma_gap
        + 0.22 * trend
        + 0.18 * sentiment_avg
        - 0.95 * volatility
    )
    return {
        "expectedReturn7d": clamp(raw_expected, -0.12, 0.12),
        "expectedReturn30d": clamp(raw_expected_30, -0.28, 0.28),
        "momentum5": mom5,
        "momentum20": mom20,
        "maGap": ma_gap,
        "volatility": volatility,
    }


def ml_confidence_from_diagnostics(diagnostics, volatility, sentiment_avg):
    test_r2 = diagnostics.get("testR2", 0.0)
    test_error_pct = diagnostics.get("testErrorPct", 10.0)
    test_mae = diagnostics.get("testMAE", 1_000_000.0)
    baseline_mae = diagnostics.get("baselineMAE", 1_000_000.0)

    r2_component = clamp((test_r2 + 1.0) / 2.0, 0.0, 1.0)
    error_component = clamp(1.0 - (test_error_pct / 12.0), 0.0, 1.0)
    baseline_component = 1.0 if test_mae <= baseline_mae else 0.4
    sentiment_component = min(abs(sentiment_avg) * 2.0, 0.1)
    vol_penalty = min(volatility * 20.0, 0.3)

    confidence = (
        0.34
        + 0.28 * r2_component
        + 0.26 * error_component
        + 0.12 * baseline_component
        + sentiment_component
        - vol_penalty
    )
    return int(round(clamp(confidence * 100.0, 35.0, 93.0)))


def summarize_insights(prediction, closes, volumes):
    expected = prediction["expectedReturn7dPct"]
    expected_30d = safe_float(prediction.get("expectedReturn30dPct"), expected)
    confidence = prediction["confidencePct"]
    rsi = prediction["indicators"]["rsi"]
    volatility = prediction["indicators"]["volatilityPct"]

    if expected >= 0:
        trend_title = "Trend"
        trend_body = f"Bias stays positive: {expected:.2f}% (7D) and {expected_30d:.2f}% (30D) with {confidence}% confidence."
        trend_kind = "positive"
    else:
        trend_title = "Trend"
        trend_body = f"Bias leans defensive: {expected:.2f}% (7D) and {expected_30d:.2f}% (30D) with {confidence}% confidence."
        trend_kind = "warning"

    if rsi > 70:
        rsi_title = "RSI"
        rsi_body = f"RSI {rsi:.1f} is stretched, so pullback risk is elevated."
    elif rsi < 30:
        rsi_title = "RSI"
        rsi_body = f"RSI {rsi:.1f} is washed out, which keeps rebound potential in play."
    else:
        rsi_title = "RSI"
        rsi_body = f"RSI {rsi:.1f} is balanced, so price can still extend either way."

    resistance = max(closes[-25:]) if len(closes) >= 25 else max(closes)
    support = min(closes[-25:]) if len(closes) >= 25 else min(closes)

    avg_volume = moving_average(volumes[-20:], min(20, len(volumes)))
    latest_volume = volumes[-1] if volumes else 0
    volume_ratio = (latest_volume / avg_volume) if avg_volume else 1.0

    if expected >= 0:
        watch_body = (
            f"Watch ${resistance:.2f} resistance. A break looks stronger if volume holds near {volume_ratio:.2f}x its 20-day pace."
        )
    else:
        watch_body = (
            f"Watch ${support:.2f} support. A break lower could accelerate downside with volatility at {volatility:.2f}%."
        )

    insights = [
        {"type": trend_kind, "title": trend_title, "body": trend_body},
        {"type": "info", "title": rsi_title, "body": rsi_body},
        {"type": "warning", "title": "Watch", "body": watch_body},
    ]

    diagnostics = prediction.get("diagnostics") or {}
    model_meta = prediction.get("model") or {}
    model_name = model_meta.get("name", "")
    if model_name == "LinearRegression" and diagnostics:
        test_mae = diagnostics.get("testMAE", 0.0)
        baseline_mae = diagnostics.get("baselineMAE", 0.0)
        test_r2 = diagnostics.get("testR2", 0.0)
        test_error_pct = diagnostics.get("testErrorPct", 0.0)
        if test_mae <= baseline_mae:
            model_title = "Model"
            model_body = f"LR beat baseline: MAE ${test_mae:.2f} vs ${baseline_mae:.2f}, R² {test_r2:.3f}, error {test_error_pct:.2f}%."
            insights.append({"type": "positive", "title": model_title, "body": model_body})
        else:
            model_title = "Model"
            model_body = f"LR trails baseline: MAE ${test_mae:.2f} vs ${baseline_mae:.2f}, so direction needs more caution."
            insights.append({"type": "warning", "title": model_title, "body": model_body})

    if model_meta.get("fallbackReason"):
        insights.append(
            {
                "type": "warning",
                "title": "Fallback",
                "body": "Notebook model was unavailable, so Trading Pro switched to heuristic forecasting.",
            }
        )

    geo = prediction.get("geoSentiment") or {}
    if geo:
        geo_score = safe_float(geo.get("score"), 0.0)
        top_region = geo.get("topRegion", "North America")
        geo_direction = "supports upside" if geo_score > 0.01 else "adds downside pressure" if geo_score < -0.01 else "is mixed"
        insights.append(
            {
                "type": "info",
                "title": "Geo",
                "body": f"{top_region} is the strongest regional input and currently {geo_direction} ({geo_score:.3f}).",
            }
        )

    learning = prediction.get("learning") or {}
    learning_7d = (learning.get("horizons") or {}).get("7d") or {}
    if learning.get("enabled") and learning_7d:
        insights.append(
            {
                "type": "positive" if safe_float(learning_7d.get("matchScore"), 0.0) >= 0.5 else "info",
                "title": "Learning",
                "body": (
                    f"{learning_7d.get('sampleCount', 0)} similar setups fed the 7-day view with "
                    f"{learning_7d.get('consensusPct', 0)}% directional agreement."
                ),
            }
        )

    return insights


def build_prediction(ticker):
    ticker = sanitize_ticker(ticker)
    prediction_updated_at = datetime.utcnow().replace(second=0, microsecond=0)
    prediction_updated_at_iso = prediction_updated_at.isoformat() + "Z"
    history = get_history(ticker, points=0)
    closes = [point["close"] for point in history]
    volumes = [point["volume"] for point in history]

    if len(closes) < 40:
        raise ValueError(f"Insufficient history to generate prediction for {ticker}")

    latest_price = closes[-1]
    prev_close = closes[-2]
    day_change = latest_price - prev_close
    day_change_pct = pct_change(latest_price, prev_close) * 100.0

    news = get_news(ticker, limit=8)
    sentiment_avg = sum(item["sentimentScore"] for item in news) / max(len(news), 1)
    map_insights = build_map_insights(ticker, news_items=news)
    geo_sentiment_score = safe_float(
        map_insights.get("predictionLiftScore"),
        safe_float(map_insights.get("geoSentimentScore"), 0.0),
    )

    combined_sentiment = sentiment_avg + (0.55 * geo_sentiment_score)
    hybrid = compute_hybrid_expected_return(closes, combined_sentiment)
    expected_return_7d = hybrid["expectedReturn7d"]
    expected_return_30d = hybrid["expectedReturn30d"]
    mom5 = hybrid["momentum5"]
    mom20 = hybrid["momentum20"]
    ma_gap = hybrid["maGap"]
    volatility = hybrid["volatility"]
    rsi = calc_rsi(closes, 14)
    predicted_price_7d = latest_price * (1.0 + expected_return_7d)
    predicted_price_30d = latest_price * (1.0 + expected_return_30d)

    diagnostics = {}
    diagnostics_30d = {}
    model_meta = {
        "name": "HybridSignalFallback",
        "type": "hybrid_signal",
        "source": "app.py",
        "featuresCount": 5,
        "forecastHorizonDays": 7,
        "forecastHorizonsDays": [LR_FORECAST_DAYS, LR_LONG_FORECAST_DAYS],
        "fallbackReason": None,
        "learningLayer": None,
    }
    top_features = []
    top_features_30d = []

    if SKLEARN_AVAILABLE:
        try:
            lr_bundle_7d = get_lr_prediction_bundle(ticker, history, horizon_days=LR_FORECAST_DAYS)
            raw_ml_prediction_7d = float(lr_bundle_7d["predictedPrice7d"])
            raw_ml_return_7d = pct_change(raw_ml_prediction_7d, latest_price)

            # Keep sentiment and geographic signal as light calibration on top of LR output.
            sentiment_adjustment_7d = clamp(combined_sentiment * 0.2, -0.025, 0.025)
            expected_return_7d = clamp(raw_ml_return_7d + sentiment_adjustment_7d, -0.18, 0.18)
            predicted_price_7d = latest_price * (1.0 + expected_return_7d)

            diagnostics = lr_bundle_7d["performance"]
            top_features = lr_bundle_7d["topFeatures"]
            model_meta = {
                "name": "LinearRegression",
                "type": "linear_regression_15_feature",
                "source": "stock-prediction-Prediction-experiments/LMT_prediction.ipynb",
                "featuresCount": len(LR_FEATURES),
                "forecastHorizonDays": 7,
                "forecastHorizonsDays": [LR_FORECAST_DAYS, LR_LONG_FORECAST_DAYS],
                "fallbackReason": None,
            }

            lr_bundle_30d = get_lr_prediction_bundle(ticker, history, horizon_days=LR_LONG_FORECAST_DAYS)
            raw_ml_prediction_30d = float(lr_bundle_30d["predictedPrice7d"])
            raw_ml_return_30d = pct_change(raw_ml_prediction_30d, latest_price)
            sentiment_adjustment_30d = clamp(combined_sentiment * 0.35, -0.05, 0.05)
            expected_return_30d = clamp(raw_ml_return_30d + sentiment_adjustment_30d, -0.35, 0.35)
            predicted_price_30d = latest_price * (1.0 + expected_return_30d)
            diagnostics_30d = lr_bundle_30d["performance"]
            top_features_30d = lr_bundle_30d["topFeatures"]
        except Exception as exc:
            model_meta["fallbackReason"] = str(exc)
    else:
        model_meta["fallbackReason"] = "scikit-learn is not installed"

    model_return_7d = expected_return_7d
    model_return_30d = expected_return_30d
    learning_signal_7d = build_self_learning_signal(history, horizon_days=LR_FORECAST_DAYS)
    learning_signal_30d = build_self_learning_signal(history, horizon_days=LR_LONG_FORECAST_DAYS)

    if learning_signal_7d:
        expected_return_7d = blend_self_learning_return(model_return_7d, learning_signal_7d, -0.18, 0.18)
        predicted_price_7d = latest_price * (1.0 + expected_return_7d)

    if learning_signal_30d:
        expected_return_30d = blend_self_learning_return(model_return_30d, learning_signal_30d, -0.35, 0.35)
        predicted_price_30d = latest_price * (1.0 + expected_return_30d)

    if learning_signal_7d or learning_signal_30d:
        model_meta["learningLayer"] = "AdaptiveAnalogMemory"

    if model_meta["name"] == "LinearRegression":
        confidence_pct = ml_confidence_from_diagnostics(diagnostics, volatility, sentiment_avg)
    else:
        directional_alignment = (
            1.0 if (mom20 >= 0 and sentiment_avg >= 0) or (mom20 < 0 and sentiment_avg < 0) else 0.0
        )
        signal_strength = clamp(abs(expected_return_7d) / 0.12, 0.0, 1.0)
        confidence = (
            0.58
            + 0.22 * signal_strength
            + 0.1 * directional_alignment
            - min(volatility * 20.0, 0.3)
        )
        confidence_pct = int(round(clamp(confidence * 100.0, 45.0, 92.0)))

    confidence_pct = int(
        round(
            clamp(
                confidence_pct + learning_confidence_adjustment(model_return_7d, learning_signal_7d),
                35.0,
                95.0,
            )
        )
    )

    if volatility < 0.012:
        risk_level = "Low"
    elif volatility < 0.022:
        risk_level = "Medium"
    else:
        risk_level = "High"

    ai_score = round(clamp((confidence_pct / 100.0) * 10.0, 1.0, 10.0), 1)

    chart_history = history[-MAX_CHART_HISTORY_DAYS:] if len(history) > MAX_CHART_HISTORY_DAYS else history
    default_chart_days = next(
        (item["days"] for item in CHART_RANGE_OPTIONS if item["id"] == DEFAULT_CHART_RANGE),
        126,
    )
    actual_history_series = [
        {"date": point["date"], "price": round(point["close"], 4)} for point in chart_history
    ]
    actual_series = [
        {"date": point["date"], "price": round(point["close"], 4)}
        for point in chart_history[-default_chart_days:]
    ]
    intraday_history = [
        point for point in get_intraday_history(ticker, points=156)
        if point.get("date", "") <= prediction_updated_at_iso
    ]
    intraday_series = [
        {
            "date": point["date"],
            "price": round(point["close"], 4),
            "open": round(point["open"], 4),
            "high": round(point["high"], 4),
            "low": round(point["low"], 4),
            "close": round(point["close"], 4),
            "volume": int(point["volume"]),
        }
        for point in intraday_history
    ]

    forecast_series_7d = []
    forecast_series_30d = []
    final_date = datetime.strptime(chart_history[-1]["date"], "%Y-%m-%d").date()
    curvature_7d = 1.08 if expected_return_7d >= 0 else 0.92
    curvature_30d = 1.04 if expected_return_30d >= 0 else 0.96
    for day_index in range(1, LR_LONG_FORECAST_DAYS + 1):
        final_date = next_business_day(final_date)
        if day_index <= LR_FORECAST_DAYS:
            progress = (day_index / float(LR_FORECAST_DAYS)) ** curvature_7d
            projected = latest_price + (predicted_price_7d - latest_price) * progress
        else:
            progress = ((day_index - LR_FORECAST_DAYS) / float(LR_LONG_FORECAST_DAYS - LR_FORECAST_DAYS)) ** curvature_30d
            projected = predicted_price_7d + (predicted_price_30d - predicted_price_7d) * progress
        point = {
            "date": final_date.isoformat(),
            "price": round(projected, 4),
        }
        forecast_series_30d.append(point)
        if day_index <= LR_FORECAST_DAYS:
            forecast_series_7d.append(point)

    prediction = {
        "ticker": ticker,
        "currentPrice": round(latest_price, 4),
        "dayChange": round(day_change, 4),
        "dayChangePct": round(day_change_pct, 3),
        "predictedPrice7d": round(predicted_price_7d, 4),
        "predictedPrice30d": round(predicted_price_30d, 4),
        "expectedReturn7dPct": round(expected_return_7d * 100.0, 3),
        "expectedReturn30dPct": round(expected_return_30d * 100.0, 3),
        "confidencePct": confidence_pct,
        "riskLevel": risk_level,
        "aiScore": ai_score,
        "predictionUpdatedAt": prediction_updated_at_iso,
        "cache": {
            "generatedAt": prediction_updated_at_iso,
        },
        "sentiment": sentiment_label(sentiment_avg),
        "sentimentScore": round(sentiment_avg, 4),
        "geoSentiment": {
            "score": round(geo_sentiment_score, 4),
            "sentiment": sentiment_label(geo_sentiment_score),
            "topRegion": map_insights.get("topRegion", "North America"),
            "provider": map_insights.get("mappingProvider", "OpenStreetMap Nominatim + Leaflet"),
        },
        "volume": int(volumes[-1]) if volumes else 0,
        "avgVolume20": int(moving_average(volumes[-20:], min(20, len(volumes)))) if volumes else 0,
        "indicators": {
            "rsi": round(rsi, 2),
            "volatilityPct": round(volatility * 100.0, 3),
            "momentum5Pct": round(mom5 * 100.0, 3),
            "momentum20Pct": round(mom20 * 100.0, 3),
            "maGapPct": round(ma_gap * 100.0, 3),
        },
        "series": {
            "actual": actual_series,
            "actualHistory": actual_history_series,
            "intraday": intraday_series,
            "forecast": forecast_series_30d,
            "forecast7": forecast_series_7d,
            "forecast30": forecast_series_30d,
        },
        "chart": {
            "defaultRange": DEFAULT_CHART_RANGE,
            "ranges": CHART_RANGE_OPTIONS,
            "historyDaysAvailable": len(actual_history_series),
            "forecastDays": LR_LONG_FORECAST_DAYS,
        },
        "model": model_meta,
        "diagnostics": diagnostics,
        "diagnostics30d": diagnostics_30d,
        "topFeatures": top_features,
        "topFeatures30d": top_features_30d,
        "learning": {
            "enabled": bool(learning_signal_7d or learning_signal_30d),
            "mode": "adaptive_memory",
            "label": "Adaptive analog memory",
            "horizons": {
                "7d": learning_signal_7d,
                "30d": learning_signal_30d,
            },
        },
        "mapInsights": map_insights,
        "modelNotes": {
            "type": model_meta["type"],
            "description": (
                "Linear Regression model from Prediction-experiments feature pipeline "
                "with 15 engineered features, adaptive analog memory, and 7/30-day horizons."
                if model_meta["name"] == "LinearRegression"
                else "Technical momentum, adaptive analog memory, and headline sentiment blended into 7-day and 30-day directional scores."
            ),
            "disclaimer": "Educational prototype only. Not financial advice.",
        },
    }
    prediction["insights"] = summarize_insights(prediction, closes, volumes)
    return prediction


def rebuild_prediction_forecast_series(prediction):
    chart_history = (prediction.get("series") or {}).get("actualHistory") or (prediction.get("series") or {}).get("actual") or []
    if not chart_history:
        return prediction

    latest_price = safe_float(prediction.get("currentPrice"), 0.0)
    predicted_price_7d = safe_float(prediction.get("predictedPrice7d"), latest_price)
    predicted_price_30d = safe_float(prediction.get("predictedPrice30d"), predicted_price_7d)
    expected_return_7d = safe_float(prediction.get("expectedReturn7dPct"), 0.0) / 100.0
    expected_return_30d = safe_float(prediction.get("expectedReturn30dPct"), 0.0) / 100.0
    final_date = datetime.strptime(chart_history[-1]["date"], "%Y-%m-%d").date()

    forecast_series_7d = []
    forecast_series_30d = []
    curvature_7d = 1.08 if expected_return_7d >= 0 else 0.92
    curvature_30d = 1.04 if expected_return_30d >= 0 else 0.96

    for day_index in range(1, LR_LONG_FORECAST_DAYS + 1):
        final_date = next_business_day(final_date)
        if day_index <= LR_FORECAST_DAYS:
            progress = (day_index / float(LR_FORECAST_DAYS)) ** curvature_7d
            projected = latest_price + (predicted_price_7d - latest_price) * progress
        else:
            progress = ((day_index - LR_FORECAST_DAYS) / float(LR_LONG_FORECAST_DAYS - LR_FORECAST_DAYS)) ** curvature_30d
            projected = predicted_price_7d + (predicted_price_30d - predicted_price_7d) * progress

        point = {"date": final_date.isoformat(), "price": round(projected, 4)}
        forecast_series_30d.append(point)
        if day_index <= LR_FORECAST_DAYS:
            forecast_series_7d.append(point)

    prediction["series"]["forecast7"] = forecast_series_7d
    prediction["series"]["forecast30"] = forecast_series_30d
    prediction["series"]["forecast"] = forecast_series_30d

    default_range_id = (prediction.get("chart") or {}).get("defaultRange", DEFAULT_CHART_RANGE)
    default_days = next((item["days"] for item in CHART_RANGE_OPTIONS if item["id"] == default_range_id), 126)
    prediction["series"]["actual"] = chart_history[-default_days:]
    return prediction


def apply_provider_analysis_to_prediction(prediction, assistant_model, provider_result):
    provider_meta = {
        "label": assistant_model["label"],
        "providerModel": assistant_model.get("providerModel", ""),
        "configured": bool(provider_result.get("enabled")),
        "used": bool(provider_result.get("used")),
        "status": provider_result.get("status", "unconfigured"),
        "summary": provider_result.get("summary", ""),
        "error": provider_result.get("error", ""),
        "reasons": [],
    }

    analysis = provider_result.get("analysis") or {}
    if not provider_result.get("used") or not analysis:
        prediction["assistantProvider"] = provider_meta
        return prediction

    base_return_7d = safe_float(prediction.get("expectedReturn7dPct"), 0.0) / 100.0
    base_return_30d = safe_float(prediction.get("expectedReturn30dPct"), 0.0) / 100.0
    llm_return_7d = safe_float(analysis.get("expectedReturn7dPct"), prediction.get("expectedReturn7dPct", 0.0)) / 100.0
    llm_return_30d = safe_float(analysis.get("expectedReturn30dPct"), prediction.get("expectedReturn30dPct", 0.0)) / 100.0
    llm_confidence = safe_float(analysis.get("confidencePct"), prediction.get("confidencePct", 60.0))

    weight_7d = clamp((llm_confidence / 100.0) * 0.24, 0.08, 0.26)
    weight_30d = clamp((llm_confidence / 100.0) * 0.28, 0.10, 0.3)

    blended_return_7d = clamp(((1.0 - weight_7d) * base_return_7d) + (weight_7d * llm_return_7d), -0.22, 0.22)
    blended_return_30d = clamp(((1.0 - weight_30d) * base_return_30d) + (weight_30d * llm_return_30d), -0.4, 0.4)
    current_price = safe_float(prediction.get("currentPrice"), 0.0)

    prediction["expectedReturn7dPct"] = round(blended_return_7d * 100.0, 3)
    prediction["expectedReturn30dPct"] = round(blended_return_30d * 100.0, 3)
    prediction["predictedPrice7d"] = round(current_price * (1.0 + blended_return_7d), 4)
    prediction["predictedPrice30d"] = round(current_price * (1.0 + blended_return_30d), 4)
    prediction["confidencePct"] = int(round(clamp((safe_float(prediction.get("confidencePct"), 60.0) * 0.7) + (llm_confidence * 0.3), 35.0, 96.0)))
    prediction["aiScore"] = round(clamp((prediction["confidencePct"] / 100.0) * 10.0, 1.0, 10.0), 1)
    prediction["assistantProvider"] = {
        **provider_meta,
        "reasons": analysis.get("reasons", []),
        "summary": analysis.get("summary", provider_meta["summary"]),
        "trend": analysis.get("trend", "MIXED"),
    }

    prediction["model"]["assistantLayer"] = assistant_model["label"]
    prediction["model"]["assistantProviderModel"] = provider_meta["providerModel"]
    prediction["modelNotes"]["assistantLayer"] = (
        f"{assistant_model['label']} API calibration via {provider_meta['providerModel']}"
    )

    return rebuild_prediction_forecast_series(prediction)


def build_stock_payload(ticker, days=120):
    ticker = sanitize_ticker(ticker)
    days = int(clamp(days, 20, MAX_CHART_HISTORY_DAYS + 16))
    history = get_history(ticker, points=days)

    closes = [point["close"] for point in history]
    latest = closes[-1]
    previous = closes[-2] if len(closes) > 1 else closes[-1]

    return {
        "ticker": ticker,
        "latest": {
            "price": round(latest, 4),
            "change": round(latest - previous, 4),
            "changePct": round(pct_change(latest, previous) * 100.0, 3),
            "volume": int(history[-1]["volume"]),
            "date": history[-1]["date"],
        },
        "history": history,
    }


def build_market_overview():
    indices = []
    latest_date = ""

    for ticker, name in MARKET_SYMBOLS:
        history = get_history(ticker, points=4)
        close = history[-1]["close"]
        prev = history[-2]["close"] if len(history) > 1 else close
        change = close - prev
        change_pct = pct_change(close, prev) * 100.0
        latest_date = history[-1]["date"]

        indices.append(
            {
                "ticker": ticker,
                "name": name,
                "price": round(close, 2),
                "change": round(change, 2),
                "changePct": round(change_pct, 2),
            }
        )

    return {"asOf": latest_date, "indices": indices}


def build_assistant_query_response(prompt_text, selected_model):
    assistant_model = normalize_assistant_model(selected_model)
    ticker = infer_ticker_from_prompt(prompt_text)
    prediction = build_prediction(ticker)
    news_items = get_news(ticker, limit=8)
    provider_result = get_assistant_provider_analysis(assistant_model, prompt_text, ticker, prediction, news_items)
    prediction = apply_provider_analysis_to_prediction(prediction, assistant_model, provider_result)

    if provider_result.get("used"):
        assistant_message = (
            f"{assistant_model['label']} API connected via {provider_result.get('providerModel', assistant_model.get('providerModel', 'default model'))}. "
            f"Trading Pro blended the provider's structured analysis with local market, news, and self-learning signals for {ticker}."
        )
    elif assistant_model.get("apiConfigured"):
        assistant_message = (
            f"{assistant_model['label']} API is configured, but this request fell back to the local Trading Pro forecast engine."
        )
    else:
        assistant_message = (
            f"{assistant_model['label']} API is not configured on this server yet. "
            f"Trading Pro used its local forecast engine for {ticker}."
        )

    return {
        "prompt": (prompt_text or "").strip(),
        "ticker": ticker,
        "assistantModel": assistant_model,
        "assistantMessage": assistant_message,
        "assistantProvider": prediction.get("assistantProvider", {}),
        "prediction": prediction,
        "news": {"ticker": ticker, "items": news_items},
    }


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self.handle_api(parsed)
            return

        if parsed.path in ("", "/"):
            self.path = "/index.html"

        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format_str, *args):
        return

    def send_json(self, payload, status=200):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def handle_api(self, parsed):
        params = parse_qs(parsed.query)

        try:
            if parsed.path == "/api/health":
                self.send_json({"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"})
                return

            if parsed.path == "/api/market/overview":
                self.send_json(build_market_overview())
                return

            if parsed.path == "/api/stock":
                ticker = sanitize_ticker((params.get("ticker") or ["TSLA"])[0])
                days = int((params.get("days") or [120])[0])
                self.send_json(build_stock_payload(ticker, days=days))
                return

            if parsed.path == "/api/news":
                ticker = sanitize_ticker((params.get("ticker") or ["TSLA"])[0])
                limit = int((params.get("limit") or [8])[0])
                self.send_json({"ticker": ticker, "items": get_news(ticker, limit=max(1, min(limit, 12)))})
                return

            if parsed.path == "/api/map/insights":
                ticker = sanitize_ticker((params.get("ticker") or ["TSLA"])[0])
                self.send_json(build_map_insights(ticker))
                return

            if parsed.path == "/api/assistant-query":
                prompt_text = (params.get("prompt") or ["Analyze TSLA"])[0]
                selected_model = (params.get("model") or ["openai"])[0]
                self.send_json(build_assistant_query_response(prompt_text, selected_model))
                return

            if parsed.path == "/api/predict":
                ticker = sanitize_ticker((params.get("ticker") or ["TSLA"])[0])
                self.send_json(build_prediction(ticker))
                return

            self.send_json({"error": "Route not found"}, status=404)
        except Exception as exc:
            self.send_json(
                {
                    "error": "Request failed",
                    "detail": str(exc),
                },
                status=500,
            )


def main():
    port = int(os.environ.get("PORT", "8000"))
    host = os.environ.get("HOST", "0.0.0.0")

    server = ThreadingHTTPServer((host, port), AppHandler)
    display_host = "127.0.0.1" if host == "0.0.0.0" else host
    print(f"TradePro AI running on http://{display_host}:{port}")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
