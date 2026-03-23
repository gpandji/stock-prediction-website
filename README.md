# Trading Pro

Trading Pro is a single-process Python web app that serves a stock-analysis frontend and its API routes from the same server.

## Local run

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Start the app:

```bash
python app.py
```

3. Open `http://127.0.0.1:8000` in your browser.

Optional environment variables:

- `HOST` defaults to `0.0.0.0`
- `PORT` defaults to `8000`
- `NEWS_API_PROVIDER` defaults to `auto`
- `NEWSAPI_KEY` enables NewsAPI when you want it instead of built-in fallback behavior

## Deploy on Render

This app is ready to deploy as a single Render Web Service with no Postgres in v1.

Render settings:

- Service type: `Web Service`
- Runtime: `Python`
- Build command: `pip install -r requirements.txt`
- Start command: `python app.py`
- Instance type: `Free`

Recommended environment variables:

- `HOST=0.0.0.0`
- `NEWS_API_PROVIDER=auto`
- `NEWSAPI_KEY` only if you want NewsAPI-backed headlines

Render also supports the included `render.yaml` Blueprint for one-click setup.

## Free-tier notes

- Render free web services sleep after periods of inactivity, so the first request after idle can take longer.
- This project intentionally does not add Postgres yet. If you later need accounts, watchlists, or saved prompts, add a database in a second pass.
