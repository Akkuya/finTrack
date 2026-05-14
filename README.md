<div align="center">
  <h1>FinTrack</h1>
  <p>
    <strong>Personal finance tracking — fully local, AI-powered, no subscriptions.</strong>
  </p>
  <p>
    <img src="https://img.shields.io/badge/python-3.13-blue?logo=python" alt="Python 3.13">
    <img src="https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi" alt="FastAPI">
    <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite" alt="SQLite">
    <img src="https://img.shields.io/badge/Ollama-llama3.1:8b-000?logo=ollama" alt="Ollama">
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT">
  </p>
  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#project-structure">Structure</a> •
    <a href="#usage">Usage</a> •
    <a href="#roadmap">Roadmap</a>
  </p>
</div>

---

Import bank transactions, have them automatically categorized by a local LLM, track spending and savings goals, and get actionable financial advice — all running on your own machine. No cloud, no data leaving your computer, no subscription.

## Features

- **CSV Import** — Drop your bank's CSV export and transactions are parsed automatically
- **AI Categorization** — Every transaction is classified into categories (Food, Transport, Shopping, etc.) via Ollama running `llama3.1:8b` locally
- **Spending Breakdown** — See where your money goes by category
- **Goal Tracking** — Set a target item with a price and date; track progress
- **Financial Advice** — Ask the LLM for personalized advice on spending habits or whether you can afford a goal
- **100% Local** — Your financial data never leaves your machine

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | [FastAPI](https://fastapi.tiangolo.com/) |
| Database | [SQLite](https://sqlite.org/) |
| LLM | [Ollama](https://ollama.com/) + `llama3.1:8b` |
| Frontend | Vanilla JS, HTML, CSS |
| Package Manager | [uv](https://docs.astral.sh/uv/) |

## Quick Start

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/getting-started/installation/)
- [Ollama](https://ollama.com/download) with `llama3.1:8b` pulled

### Setup

```sh
# Clone and enter the project
git clone https://github.com/Akkuya/fintrack.git
cd fintrack

# Install dependencies
uv sync

# Pull the LLM model
ollama pull llama3.1:8b

# Initialize the database
uvs init-db

# Start the dev server
uvs dev
```

The API will be running at `http://localhost:8000`. Open `http://localhost:8000/docs` for the interactive Swagger UI.

### Available Commands

| Command | Description |
|---------|-------------|
| `uvs dev` | Start dev server with hot reload |
| `uvs dev-host` | Start server accessible on your network |
| `uvs init-db` | Create/initialize the SQLite database |
| `uvs lint` | Run Ruff linter |
| `uvs format` | Auto-format all Python files |
| `uvs typecheck` | Run mypy static type checker |

## Project Structure

```
fintrack/
├── api/              # FastAPI application
│   ├── app.py           # App factory, middleware, routes
│   ├── dependencies.py  # DB connection dependency
│   └── routes/          # Endpoint handlers
│       ├── transactions.py
│       ├── goals.py
│       └── advice.py
├── core/             # Shared utilities
│   └── log.py           # Rich logging configuration
├── db/               # Database layer
│   ├── schema.py        # Table definitions + init
│   ├── read.py          # Query functions
│   └── write.py         # Insert functions
├── ingestion/        # CSV data pipeline
│   ├── input.py         # CSV file reader
│   └── parser.py        # Row → Transaction model
├── llm/              # AI integration
│   ├── interface.py     # Ollama chat wrapper
│   ├── categorize.py    # Transaction categorization
│   └── advise.py        # Spending advice prompts
├── frontend/         # Browser UI (in progress)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/             # CSV exports (gitignored)
├── models.py         # Shared Pydantic domain models
├── pyproject.toml    # Dependencies + tool config
└── uv.lock           # Lockfile
```

## Usage

### Import Transactions

```sh
curl -X POST http://localhost:8000/transactions/import \
  -F "file=@data/your-bank-export.csv"
```

### View Transactions

```sh
curl http://localhost:8000/transactions
```

### Create a Goal

```sh
curl -X POST http://localhost:8000/goals \
  -H "Content-Type: application/json" \
  -d '{
    "item_name": "New Laptop",
    "target_price": 2000,
    "description": "MacBook Pro",
    "necessity": 7,
    "necessity_source": 3,
    "status": 1,
    "target_date": "2026-12-01"
  }'
```

### Get Financial Advice

```sh
# General spending advice
curl http://localhost:8000/advice/general

# Advice toward a specific goal
curl http://localhost:8000/advice/goal/1
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/transactions` | List all transactions |
| `POST` | `/transactions/import` | Upload CSV of transactions |
| `GET` | `/goals` | List all goals |
| `GET` | `/goals/{id}` | Get a specific goal |
| `POST` | `/goals` | Create a new goal |
| `GET` | `/advice/general` | LLM spending analysis |
| `GET` | `/advice/goal/{id}` | LLM advice toward a goal |

## Roadmap

- [x] CSV ingestion + transaction storage
- [x] FastAPI backend with all route handlers
- [x] SQLite schema + read/write layer
- [x] LLM categorization pipeline
- [x] Goals system
- [x] LLM advice layer
- [ ] Spending breakdown by category
- [ ] Savings tracker
- [ ] Frontend UI (HTML/CSS/JS)
- [ ] Plaid API integration (replace CSV)

## License

MIT &mdash; see [LICENSE](LICENSE).
