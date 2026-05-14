# FinTrack

A personal finance tracking app that ingests transaction data, categorizes spending using a local LLM, tracks savings, and gives actionable advice on future purchases and spending habits. Built for personal use — no cloud, no subscriptions, just your data and your machine.

## Features

- Import bank transactions via CSV export
- Automatic transaction categorization using a local LLM (Ollama + llama3.1:8b)
- Spending breakdown by category
- Savings tracking over time
- Goal tracking — add items you want to buy with a target price and date
- LLM-powered advice on spending habits and when you can afford your goals

## Tech Stack

Backend — FastAPI
Database — SQLite
LLM — Ollama (llama3.1:8b, runs fully locally)
Frontend — Vanilla JS + HTML + CSS

## Project Structure

```sh
fintrack/
├── ingestion/       # CSV reading and transaction normalization
├── db/              # SQLite schema, read, and write operations
├── llm/             # Ollama interface, categorization, and advice
├── api/             # FastAPI app, routes, and dependencies
├── frontend/        # HTML, CSS, JS
├── data/            # CSV exports (gitignored)
└── main.py          # Entrypoint
```

## Setup

Install dependencies with `uv`
Pull the model: `ollama pull llama3.1:8b`
Export your bank transactions as a CSV and drop it in `data/`
Run the app: `uvicorn api.app:app --reload`
Open `frontend/index.html` in your browser

- Roadmap

- [ ] CSV ingestion + transaction storage
- [ ] LLM categorization pipeline
- [ ] Spending breakdown by category
- [ ] Savings tracker
- [ ] Goals system
- [ ] LLM advice layer
- [ ] Frontend UI
- [ ] Plaid API integration (replace CSV)
