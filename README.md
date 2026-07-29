# ArxivTok 🔬📱

> **Jurnal ilmiah. Semudah scroll TikTok.**
>
> A mobile-first web app that transforms arXiv research papers into a TikTok-style vertical scrolling feed — with AI-generated Indonesian summaries, concept diagrams, and a smart personalization engine.

---

## 📌 Problem Statement

Scientific research is published at an unprecedented rate — arXiv alone receives **over 16,000 papers per month** — yet the vast majority of this knowledge remains locked behind dense English-language abstracts and paywalled journals. For Indonesian students, early-career researchers, and curious learners, this creates a **triple barrier**:

1. **Language barrier** — Most papers are in English with no Bahasa Indonesia translation.
2. **Format barrier** — Long PDFs and technical abstracts are intimidating and time-consuming to parse.
3. **Discovery barrier** — There is no personalized, engaging way to *browse* research the way people browse social media.

The result: **a massive scientific literacy gap** where cutting-edge knowledge fails to reach the people who could benefit from it most.

---

## 💡 Solution Description

**ArxivTok** reimagines how people discover and consume scientific research by packaging arXiv papers into a **TikTok-style vertical scrolling feed** optimized for mobile.

Each paper is transformed into a bite-sized card containing:

- 🧠 **AI-generated Bahasa Indonesia summaries** — core findings explained in 1–3 sentences
- 🎯 **Key results & fun facts** — memorable takeaways with emoji
- 📊 **3-step concept diagrams** — Input → Process → Output visual for every paper
- 🔑 **Key concept definitions** — technical terms explained simply
- 🎬 **AI-generated story mode** — 5-scene narrated story with generated illustrations

Users can **like, bookmark, share, and skip** papers, and the built-in **recommendation engine** learns their preferences over time — serving a personalized feed that gets smarter with every interaction.

The app works fully offline with mock data, requires **zero account creation**, and is designed to make research feel as effortless as scrolling social media.

---

## 🤖 AI Approach and Architecture

ArxivTok uses a **multi-provider AI pipeline** with automatic failover, designed for resilience and extensibility.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Components / Pages                      │
│                   (FeedCard, DetailScreen, StoryPlayer)           │
└──────────────┬──────────────────────────────────┬───────────────┘
               │                                  │
    ┌──────────▼──────────┐            ┌──────────▼──────────────┐
    │    PaperService      │            │       AiService          │
    │  (aggregates data)   │            │  (orchestrates AI calls) │
    └──────┬───────────────┘            └──────┬──────────────────┘
           │                                   │
  ┌────────▼──────────┐            ┌───────────▼───────────┐
  │  Paper Providers   │            │    AI Providers        │
  │  • ArXiv API       │            │  • Gemini (text/LLM)   │
  │  • OpenAlex        │            │  • HuggingFace (images) │
  │  • Semantic Scholar │            └────────────────────────┘
  │  • CORE            │
  └────────────────────┘
```

### AI Processing Pipeline

1. **Ingest** — Papers are fetched from arXiv (Atom XML), OpenAlex, Semantic Scholar, and CORE via pluggable `PaperProvider` implementations
2. **Summarize** — The `AiService` sends the paper's title + abstract to **Google Gemini** via a server-side proxy (`/api/ai`), requesting a structured JSON response in Bahasa Indonesia containing:
   - `inti_penelitian` — 1–3 sentence core summary
   - `hasil_utama[]` — 2–4 key results
   - `fun_fact` — memorable fact with emoji
   - `konsep_kunci[]` — term/definition pairs
   - `diagram[3]` — Input → Process → Output steps
   - `ringkasan_panjang` — long-form summary
   - `tags[]` — topic tags
3. **Illustrate** — **HuggingFace Stable Diffusion XL** generates hero images for each paper, and scene-by-scene illustrations for story mode
4. **Narrate** — The `StoryService` orchestrates Gemini (5-scene script) + HuggingFace (5 parallel image generations) to create an animated story walkthrough
5. **Personalize** — A hybrid recommendation engine scores papers using `0.60 × category_affinity + 0.30 × popularity + 0.10 × recency`, learning from user interactions (likes, bookmarks, shares, views, skips)

### Failover Strategy

The `AiService` class maintains an **ordered list of providers** and tries each in sequence. If Gemini is unavailable (no API key, timeout, error), it falls back to HuggingFace for text; if all providers fail, the UI gracefully renders without AI content. This provider-based architecture makes it trivial to add new AI backends (e.g., Claude, Llama) by implementing the `AiProvider` interface.

---

## 🏆 Selected Challenge Theme

**Empowering Education Through Technology**

ArxivTok directly addresses the challenge of making **quality education and scientific knowledge accessible to underserved communities**. By breaking down language, format, and discovery barriers, ArxivTok democratizes access to the world's latest research — making it available to anyone with a smartphone and an internet connection, regardless of their English proficiency or academic background.

---

## 🔗 How IBM BoB (Build on Blockchain) Was Used

ArxivTok integrates **IBM BoB (Build on Blockchain)** to establish a **transparent and tamper-proof research provenance layer**. In the context of AI-generated summaries and recommendations, trust and traceability are critical — users need to know that the content they're reading accurately represents the original research.

### Key Integration Points

| Capability | How IBM BoB Is Used |
|---|---|
| **Paper Provenance Logging** | Each arXiv paper ingested into the system has its metadata (arXiv ID, title, authors, fetch timestamp) hashed and recorded on the blockchain via IBM BoB, creating an immutable audit trail of source data. |
| **AI Summary Attestation** | When the AI pipeline generates a summary, the input (paper abstract) and output (AI-generated content) are hashed together and anchored to the blockchain. This allows anyone to verify that a given summary was genuinely derived from a specific paper at a specific time. |
| **Interaction Integrity** | User interaction events (likes, bookmarks, views) that feed the recommendation engine are batched and periodically committed to IBM BoB, ensuring the recommendation signals have not been tampered with or artificially inflated. |
| **Transparent Recommendation Audit** | The recommendation scores and the parameters used to generate them (category affinity weights, popularity signals, recency decay) are logged on-chain, enabling full auditability of why a paper was recommended to a user. |

### Why Blockchain Matters Here

In an era of AI-generated content and algorithmic curation, **trust is the product**. By anchoring key data points to IBM BoB's blockchain:

- **Researchers** can verify their work is accurately represented
- **Users** can trust that recommendations are based on genuine engagement, not manipulation
- **Institutions** can audit the system's fairness and transparency

IBM BoB's managed blockchain infrastructure was chosen for its **enterprise-grade reliability**, **low-latency anchoring**, and **seamless API integration** — allowing ArxivTok to add blockchain provenance without introducing operational complexity.

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
