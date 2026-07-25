# Papertok 🔬📱

> **Jurnal ilmiah. Semudah scroll TikTok.**
>
> A mobile-first web app that transforms arXiv research papers into a TikTok-style vertical scrolling feed — with AI-generated Indonesian summaries, concept diagrams, and a smart personalization engine.

---

## ✨ Features

- **Vertical Snap Feed** — CSS `scroll-snap` + IntersectionObserver for buttery smooth slides
- **AI Processing Pipeline** — GPT-4o-mini parses abstracts into structured Bahasa Indonesia insights
- **3-Step Concept Diagram** — Input → Process → Output visual for every paper
- **Smart Recommendation** — Hybrid content-based + engagement scoring, personalized per user
- **Interaction Logging** — Every like/bookmark/view/share feeds the recommendation engine
- **Tabbed Detail Screen** — Ringkasan · Konsep · Diagram · Detail Paper
- **Dark Neon Design** — Premium #0a0a0f dark theme with pink/purple neon accents

---

## 🏗️ Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript |
| Styling | Tailwind CSS · custom neon tokens |
| Animation | Framer Motion |
| State | Zustand |
| Backend | Python 3.11 · FastAPI · SQLAlchemy 2 async |
| Database | SQLite (dev) → PostgreSQL (prod) via aiosqlite |
| AI | OpenAI GPT-4o-mini (JSON mode) |
| Data | arXiv public Atom API |

---

## 📁 Project Structure

```
arxivtok/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx            # / Discovery home
│   │   ├── feed/page.tsx       # /feed vertical snap feed
│   │   ├── bookmarks/page.tsx  # /bookmarks saved papers
│   │   └── profile/page.tsx    # /profile user stats
│   ├── components/
│   │   ├── feed/
│   │   │   ├── FeedCard.tsx       ⭐ main snap card
│   │   │   ├── VerticalFeed.tsx   snap container
│   │   │   ├── ActionSidebar.tsx  like/bookmark/share
│   │   │   ├── ConceptDiagram.tsx 3-step diagram
│   │   │   └── FunFactCard.tsx    fun fact card
│   │   ├── detail/
│   │   │   └── DetailScreen.tsx   tabbed detail view
│   │   ├── home/
│   │   │   └── DiscoveryScreen.tsx home screen
│   │   ├── layout/
│   │   │   └── BottomNav.tsx       5-tab nav
│   │   └── ui/
│   │       ├── CategoryChips.tsx
│   │       ├── GlassPanel.tsx
│   │       └── NeonBadge.tsx
│   ├── lib/
│   │   ├── api.ts              axios client
│   │   ├── utils.ts            helpers + CATEGORIES
│   │   └── mockData.ts         3 rich mock papers
│   ├── store/
│   │   └── feedStore.ts        Zustand global state
│   └── types/
│       └── index.ts            TypeScript interfaces
├── backend/
│   ├── main.py                 FastAPI app + all routes
│   ├── models.py               SQLAlchemy ORM
│   ├── schemas.py              Pydantic schemas
│   ├── ai_pipeline.py          ⭐ LLM abstract parser
│   ├── recommender.py          ⭐ personalization engine
│   ├── arxiv_fetcher.py        arXiv Atom ingestion
│   ├── config.py               pydantic-settings
│   └── requirements.txt
└── README.md
```

---

## 🚀 Getting Started

### Frontend

```bash
# Install dependencies
npm install

# Configure environment
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local

# Start dev server
npm run dev
# → http://localhost:3000
```

> **Offline/mock mode**: The app works fully with mock data when the backend is unavailable. Mock data is in [`src/lib/mockData.ts`](src/lib/mockData.ts).

### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Optional: add OpenAI key to enable AI summaries (app works without it)
echo 'OPENAI_API_KEY=sk-your-key-here' > .env

# Start API server — SQLite file is created automatically, papers seeded on first boot
uvicorn main:app --reload
# → http://localhost:8000
# → Swagger UI: http://localhost:8000/docs
```

> **No database setup needed.** SQLite is a plain file (`arxivtok.db`) that is created automatically on first start. No install, no server, no configuration required.
>
> **First boot auto-seeds papers.** On startup, if the DB is empty, the backend fetches 8 real papers from arXiv and stores them — no manual curl needed.
>
> **No OpenAI key?** The AI pipeline falls back to a stub response. Papers are still ingested and served; AI summaries are just placeholder text until a key is added.

---

## 🗄️ Database Schema

### `papers` table
Stores cached arXiv papers with all AI-processed fields as JSON columns.

### `user_interactions` table
```
id              INTEGER PK
user_id         VARCHAR(64)  ← from localStorage UUID
paper_id        VARCHAR(32)  → papers.id
interaction_type ENUM(like, bookmark, view, skip, share)
dwell_time_ms   INTEGER (optional)
created_at      DATETIME
```

---

## 🤖 AI Pipeline

1. **Fetch** → arXiv Atom XML → parse title, abstract, authors, categories
2. **Parse** → `ai_pipeline.py` calls GPT-4o-mini with a structured JSON-mode prompt
3. **Extract** → 7 structured fields in Bahasa Indonesia:
   - `inti_penelitian` — 1–3 sentence core summary
   - `hasil_utama[]` — 2–4 key results
   - `fun_fact` — memorable fact with emoji
   - `konsep_kunci[]` — 3–5 term/definition pairs
   - `diagram[3]` — Input → Process → Output
   - `ringkasan_panjang` — long-form summary
   - `tags[]` — topic tags
4. **Validate** → ensure correct types, list lengths, required keys
5. **Persist** → JSON columns in SQLite

---

## 🎯 Recommendation Engine

**Scoring formula:**
```
score = 0.60 × category_affinity
      + 0.30 × popularity_signal
      + 0.10 × recency_boost
```

**Interaction weights used to build user preference vector:**
```
like      × 3.0
bookmark  × 2.5
share     × 2.0
view      × 0.5
skip      × −1.0
```

Recency uses exponential decay with 30-day half-life. A light shuffle of the top-20 candidates adds serendipity.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/feed` | Personalized feed (`category`, `page`, `limit`) |
| `GET` | `/papers/{id}` | Single paper detail |
| `GET` | `/search?q=` | Full-text search |
| `GET` | `/bookmarks` | User's saved papers |
| `POST` | `/interactions` | Log interaction event |
| `POST` | `/ingest` | Fetch papers from arXiv |
| `GET` | `/healthz` | Health check |

Pass user ID via `X-User-Id` header or `?user_id=` query param.

---

## 🎨 Design Tokens

```css
--bg:           #0a0a0f  /* app background */
--surface:      #111118  /* elevated surface */
--card:         #16161f  /* card background */
--border:       #2a2a3a  /* border color */
--neon-pink:    #ff2d78  /* primary accent */
--neon-purple:  #a855f7  /* secondary accent */
--neon-blue:    #3b82f6  /* tertiary accent */
```
