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

- **CSV Import** — Drop your bank's CSV export and transactions are parsed automatically (Simplii + Tangerine formats)
- **AI Categorization** — Every transaction is classified into categories (Food, Transport, Shopping, etc.) via Ollama running `llama3.1:8b` locally; a deterministic rules engine pre-filters transfers/salary/investments before the LLM
- **Spending Breakdown** — See where your money goes by category, with income/expense and date-range filters
- **Goal Tracking** — Set a target item with a price and date; track progress, get AI advice on whether it's attainable
- **Financial Advice** — Ask the LLM for personalized advice on spending habits or whether you can afford a goal
- **Transactions** — Browse, filter, expand details, recategorize, and edit imported transactions
- **100% Local** — Your financial data never leaves your machine

## Tech Stack

| Layer | Technology |
| ------- | ----------- |
| Backend | [FastAPI](https://fastapi.tiangolo.com/) |
| Database | [SQLite](https://sqlite.org/) |
| LLM | [Ollama](https://ollama.com/) + `llama3.1:8b` |
| Frontend | [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/), [react-router-dom](https://reactrouter.com/), Chart.js |
| Backend package manager | [uv](https://docs.astral.sh/uv/) |
| Frontend package manager | [bun](https://bun.sh/) |

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

# Install backend + frontend dependencies
uv sync
cd frontend && bun install && cd ..

# Pull the LLM model
ollama pull llama3.1:8b

# Initialize the database
uvs init-db

# Start the backend (http://localhost:8000) and frontend dev servers
uvs dev              # backend on :8000
# in separate terminal:
cd frontend && bun run dev   # frontend on :5173 (proxied to the API)
```

The API will be running at `http://localhost:8000` — open `http://localhost:8000/docs` for the interactive Swagger UI. The frontend runs at `http://localhost:5173`.

### Available Commands

| Command | Description |
| --------- | ------------- |
| `uvs dev` | Start backend dev server with hot reload |
| `uvs dev-host` | Start backend accessible on your network |
| `uvs init-db` | Create/initialize the SQLite database (`db/data.db`) |
| `uvs lint` | Run Ruff linter |
| `uvs format` | Auto-format all Python files |
| `uvs typecheck` | Run mypy static type checker |
| `uvs test` | Run the pytest suite (`tests/`) |
| `bun run dev` | (in `frontend/`) Start the Vite dev server |
| `bun run build` | (in `frontend/`) Type-check + build the frontend |

## Project Structure

```txt
fintrack/
├── api/              # FastAPI application
│   ├── app.py           # App factory + route registration
│   ├── dependencies.py  # DB connection dependency
│   └── routes/          # Endpoint handlers
│       ├── transactions.py
│       ├── goals.py
│       ├── categories.py
│       └── advice.py
├── core/             # Shared utilities
│   └── log.py           # Rich logging configuration
├── db/               # Database layer
│   ├── schema.py        # Table definitions + migrations
│   ├── read.py          # Query functions
│   └── write.py         # Insert/update/delete functions
├── ingestion/        # CSV data pipeline
│   ├── input.py         # CSV file reader
│   ├── parser.py        # Row → Transaction model (bank dispatch)
│   ├── rules.py         # Deterministic pre-categorization rules
│   └── parsers/         # Per-bank CSV parsers (simplii, tangerine)
├── llm/              # AI integration
│   ├── interface.py     # Ollama chat wrapper
│   ├── categorize.py    # Transaction categorization
│   └── advise.py        # Spending advice prompts
├── data/             # Per-user config + logs (gitignored)
│   └── rules_config.json  # User-specific category rules (gitignored)
├── frontend/         # Browser UI (React 19 + TypeScript)
│   └── src/
│       ├── App.tsx        # Router
│       ├── api.ts         # Typed API client
│       └── pages/         # Dashboard, Transactions, Breakdown, Goals, Import, Categories
├── tests/            # pytest suite (parsers, rules, db layer)
├── models.py         # Shared Pydantic domain models
└── pyproject.toml    # Backend deps + command scripts
```

## Usage

### Import Transactions

```sh
curl -X POST http://localhost:8000/transactions/import \
  -F "file=@data/your-bank-export.csv" \
  -F "bank=tangerine"     # or: simplii
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
| -------- | ------ | ------------- |
| `GET` | `/` | Health check |
| `GET` | `/transactions` | List all transactions |
| `POST` | `/transactions/import` | Upload CSV of transactions (form: `file`, `bank`) |
| `GET` | `/transactions/summary` | Spending/income totals by category, with direction + date-range filters |
| `GET` | `/transactions/by-category` | List transactions for a category |
| `PUT` | `/transactions/{id}` | Update a transaction (edit fields / recategorize / uncategorize) |
| `GET` | `/categories` | List all categories |
| `POST` | `/categories` | Create a new category |
| `GET` | `/categories/{id}` | Get a specific category |
| `PUT` | `/categories/{id}` | Update a category |
| `DELETE` | `/categories/{id}` | Delete a category (blocked if it has transactions) |
| `GET` | `/goals` | List all goals |
| `GET` | `/goals/{id}` | Get a specific goal |
| `POST` | `/goals` | Create a new goal |
| `GET` | `/advice/general` | LLM spending analysis |
| `GET` | `/advice/goal/{id}` | LLM advice toward a goal |

## Roadmap

View the full [**FinTrack Roadmap**](https://github.com/users/Akkuya/projects/4) on GitHub Projects.

**Phases:** MVP &rarr; V2 &rarr; V3 &rarr; V4 &rarr; V5 &rarr; V6 &rarr; Crazy

| Phase | Focus |
| ------- | ------- |
| **MVP** | Frontend UI, wire up LLM categorization, category CRUD |
| **V2** | Edit/delete transactions, budgets, accounts, savings, CSV export |
| **V3** | Goal progress, recurring transactions, search/filter, error handling |
| **V4** | Plaid integration, tags, dark mode, pagination |
| **V5** | AI anomaly detection, monthly reports, chat interface |
| **V6** | Multi-currency, split transactions, forecasts, test suite |
| **Crazy** | Investments, retirement, OCR, PWA, AI coach, gamification, and more |

### Completed

- [x] CSV ingestion + transaction storage (Simplii + Tangerine)
- [x] FastAPI backend with all route handlers
- [x] SQLite schema + read/write layer
- [x] LLM categorization pipeline + deterministic rules pre-filter
- [x] Goals system
- [x] LLM advice layer
- [x] Frontend UI (React 19 + TypeScript)
- [x] Spending breakdown by category
- [x] Transaction editing / recategorization
- [x] Category CRUD with budget limits + `counts_as_cashflow`
- [x] Backend test suite (parsers, rules, db layer)

### Coming Up (V2)

- [ ] Edit/delete transactions (delete not yet exposed)
- [ ] Budget enforcement + savings/accounts tracking
- [ ] CSV export
- [ ] Plaid API integration (replace CSV)

## License

MIT &mdash; see [LICENSE](LICENSE).
