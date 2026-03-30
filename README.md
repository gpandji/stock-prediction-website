# TradePro AI Dashboard (CP3405 Prototype)

A web app prototype inspired by your UX pilot slides for tracking stocks and projecting near-term trajectory using:
- Linear Regression AI model from your `stock-prediction-Prediction-experiments` pipeline
- technical price signals (momentum, moving averages, RSI, volatility)
- headline sentiment from News APIs
- geographic market sentiment from mapping APIs

## What it includes
- Dark dashboard UI aligned with your presentation visuals
- Market overview cards (S&P 500 proxy, NASDAQ proxy, DOW 30 proxy, Russell 2000 proxy)
- Watchlist with quick ticker switching
- AI prediction chart: historical trajectory + 30-day forecast (with 7-day and 30-day targets)
- AI insight panels (confidence, risk, sentiment, RSI, volatility, momentum)
- Model diagnostics (test MAE, baseline MAE, R2, top feature importances)
- News sentiment feed for the selected stock
- Geo sentiment map with regional markers and company HQ marker

## Data and model approach
- Price data source: Stooq daily market feed
- News source:
  - NewsAPI (`/v2/everything`) when `NEWSAPI_KEY` is configured
  - Google News RSS fallback when key is not configured
- Mapping source:
  - OpenStreetMap Nominatim geocoding API for company HQ coordinates
  - OpenStreetMap tile API rendered via Leaflet
- Primary prediction engine: `LinearRegression` using 15 engineered technical/calendar features and dual 7/30-trading-day horizons.
- Linear Regression diagnostics exposed in API/UI: train/test MAE, test R2, baseline MAE, and error percentage.
- Fallback prediction engine: hybrid heuristic if model training prerequisites are not met.
- Sentiment enhancement: regional geo-sentiment is blended into model adjustment for the 7-day prediction.

This is an educational prototype and not financial advice.

## Run locally
From `/Users/kierananthiniabraham/Desktop/3405 Design Thinking`:

```bash
python3 -m pip install -r requirements.txt
# optional: export NEWSAPI_KEY='your_key_here'
# optional: export NEWS_API_PROVIDER='auto'   # auto | newsapi | rss
# optional: export OPENAI_API_KEY='your_key_here'
# optional: export GEMINI_API_KEY='your_key_here'
# optional: export ANTHROPIC_API_KEY='your_key_here'
# optional: export XAI_API_KEY='your_key_here'
# optional: export PERPLEXITY_API_KEY='your_key_here'
# optional model overrides:
# export OPENAI_MODEL='gpt-5.4'
# export GEMINI_MODEL='gemini-2.5-flash'
# export ANTHROPIC_MODEL='claude-sonnet-4-20250514'
# export XAI_MODEL='grok-4'
# export PERPLEXITY_MODEL='sonar-pro'
python3 app.py
```

Open:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

## API endpoints
- `GET /api/health`
- `GET /api/market/overview`
- `GET /api/stock?ticker=TSLA&days=120`
- `GET /api/news?ticker=TSLA&limit=8`
- `GET /api/map/insights?ticker=TSLA`
- `GET /api/predict?ticker=TSLA`

## Notes
- If external data feeds fail temporarily, the backend falls back to generated sample data so the UI remains usable for demos.
- If `scikit-learn` is unavailable or insufficient history exists, the app automatically falls back to heuristic prediction mode.
- If `NEWSAPI_KEY` is unavailable, the app automatically falls back to RSS-based headline retrieval.
- If an assistant provider API key is unavailable, the selected model still works in UI but Trading Pro falls back to the local forecast engine.
- When assistant provider keys are configured, Trading Pro sends the current stock context to the selected provider and lightly blends the provider response into the 7-day and 30-day outlook.
- Cached responses reduce repeated external calls during a session.
