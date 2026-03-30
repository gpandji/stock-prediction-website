# TradePro AI Dashboard

TradePro is a Python web app that serves the dashboard UI and API from one process. It predicts 7-day and 30-day stock moves using technical signals, news sentiment, and the Linear Regression experiments in `stock-prediction-Prediction-experiments`.

## What changed for hosting

- Render deployment config is included in `render.yaml`
- Postgres-backed prediction cache is supported through `DATABASE_URL`
- The backend refreshes warm-ticker predictions every 5 minutes and stores them in Postgres
- `/api/predict` and the assistant flow reuse cached predictions when they are fresh, which makes repeat loads faster for users

## Local run

```bash
python -m pip install -r requirements.txt
python app.py
```

Optional environment variables:

- `HOST=0.0.0.0`
- `PORT=8000`
- `NEWS_API_PROVIDER=auto`
- `NEWSAPI_KEY=...`
- `DATABASE_URL=postgresql://...`
- `PREDICTION_CACHE_TTL_SECONDS=300`
- `PREDICTION_REFRESH_INTERVAL_SECONDS=300`
- `PREDICTION_WARM_TICKERS=TSLA,NVDA,AMZN,AAPL,MSFT,GOOGL`

## Render deploy

This repo includes a Render Blueprint in `render.yaml` that creates:

- a free Python web service named `trading-pro`
- a free Postgres database named `trading-pro-db`

Deploy steps:

1. Push this repo to GitHub.
2. In Render, choose `New` -> `Blueprint`.
3. Select the GitHub repo.
4. Render will create both the web service and the Postgres database.
5. After deploy, open `/api/health` to confirm `postgresCache.ready` is `true`.

## API endpoints

- `GET /api/health`
- `GET /api/market/overview`
- `GET /api/stock?ticker=TSLA&days=120`
- `GET /api/news?ticker=TSLA&limit=8`
- `GET /api/map/insights?ticker=TSLA`
- `GET /api/predict?ticker=TSLA`
- `GET /api/assistant-query?prompt=Analyze+TSLA&model=openai`

## Notes

- If Postgres is unavailable, the app still works and falls back to live prediction generation.
- If external feeds fail temporarily, the backend may fall back to generated sample data so the UI stays usable.
- This is an educational prototype and not financial advice.
