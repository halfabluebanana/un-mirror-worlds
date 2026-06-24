# Mirror Worlds

Policy decisions get made on data that decision makers can't fully evaluate. Sources like the UN Data Commons allow us to use verified, traceable data for our reports, but it's still difficult to assess the quality of a report and whether the data sources used are appropriate, comprehensive, and relevant to the problem at hand. We have a rich source of good practices and methodology in case studies published by organizations like the UN, which would be valuable for policymakers when trying to make decisions based on data.

Mirror Worlds tries to help in the monitoring & evaluation phase for reports by trying by indexing these case studies, and presenting ones similar to the problem the user is trying to solve (by SDGs addressed, administrative region, indicators targeted for improvement, and sources used).

We do this by creating standardized schema for storing a case study itself, allowing us to scrape them from the internet and create a database. 

Mirror Worlds then is able to evaluate reports given to the app by grading the data hygiene using the linked studies as reference, and bringing up *historican twins* to present similar scenarios to the user for consideration. 

Project pitch presentation: https://docs.google.com/presentation/d/1sappht5ImfCf8PXNAu3fBjJhBkRHM30i/edit?usp=sharing&ouid=115590818787153355766&rtpof=true&sd=true

---

## The problem

When a policy report says *"child poverty in Somalia is X%"*, five things are usually unknown to the decision maker:

1. **Source provenance**: which agency produced this, using what method?
2. **Methodology fitness**: is a national-level modelled estimate appropriate for a municipal intervention decision?
3. **Missing indicators**: what data *should* have been included but wasn't?
4. **Data currency**: how old is the underlying data relative to the claim?
5. **Claim type mismatch**: is the report making a causal claim ("this policy reduced poverty") with only observational data?

---

## What Mirror Worlds does

**Input:** A report URL, pasted text, or a structured claim (geography, indicators, sources, SDGs).

**Output:** A Data Suitability & Confidence label with:

| Score | What it measures |
|---|---|
| Indicator correlation | Do the declared indicators actually measure the target outcome? |
| Indicator comprehensiveness | What standard indicators are missing vs. comparable analyses? |
| Indicator source variance | Do different sources agree on the same indicator? |
| Geographic resolution fit | Does the data granularity support the stated analysis level? |
| Reference period fit | Is the data current enough for the claim's target year? |

Plus **suitability badges** — alerts for critical issues:
- No UN Data Commons data available for the declared geography
- Shared source assumption (multiple indicators from the same modelling framework — not independent evidence)
- Causal claim with observational data only
- Geographic boundary mismatch risk
- Insufficient observation density for trend claims

And a **per-indicator methodology card** — click any indicator to see: agency, measurement method, time coverage, observation count, unit, and independence flags.

---

## Architecture

```
frontend (Angular, port 4200)
    ↕  /api proxy
backend (Flask, port 8000)
    ↕
UN Data Commons REST API   ← live indicator observations + facet metadata
Historical twin database   ← validated SDG case studies for comparison
LLM claim extractor        ← structured extraction from report URLs/text (OpenRouter)
SDG custodian metadata     ← indicator-level limitations and coverage notes
```

---

## Running locally

### 1. Backend (port 8000)

Requires [uv](https://github.com/astral-sh/uv) to manage requirements and run the application.

```bash
cd backend
cp .env.example .env          # edit OPENROUTER_API_KEY if you want LLM extraction
./run.sh
```

Works without an API key — falls back to heuristic extraction. Deep LLM extraction requires `OPENROUTER_API_KEY` in `backend/.env`.

### 2. Frontend (port 4200)

```bash
cd frontend
./run.sh
```

Open **http://localhost:4200**

### 3. Share with teammates via ngrok

```bash
ngrok http 4200
```

Share the `https://xxxx.ngrok-free.app` URL. The Angular dev server proxies `/api` to the backend, so teammates get the full app through one URL.

---

## Demo claims

Three pre-built claims are available from the **Demo** tab:

| ID | Claim | Geography |
|---|---|---|
| CLM-001 | Child poverty targeting using geospatial proxies | Somalia |
| CLM-002 | Early childhood service expansion site selection | Zambia |
| CLM-003 | Food security operations planning | Afghanistan |

These are modelled on real UN case studies in the historical twin database.

---

## Branch guide

| Branch | What's on it |
|---|---|
| `main` | Stable base |
| `feedback-1` | Geographic resolution fit + reference period fit scoring |
| `feature/methodology-card` | **Current working branch** — all of the above + per-indicator methodology cards, claim type extraction, indicator independence flags, observation density checks, causal claim detection |

---

## Implementation status

### Done (`feature/methodology-card`)

**Backend**
- [x] Methodology card data per indicator — agency, measurement method, time coverage, obs count, unit from UN Data Commons facet API
- [x] `importName` → human-readable agency/method lookup table
- [x] Data gap detection — indicators with no DC observations flagged as `data_available: false`
- [x] Claim type extraction — LLM classifies `descriptive` / `predictive` / `causal`
- [x] Indicator independence badge — flags when 2+ indicators share the same modelling source
- [x] Observation density badge — flags sparse data on trend/causal claims
- [x] Causal claim / observational data badge — critical alert when causal language meets observational sources
- [x] Geographic resolution fit scoring (from `feedback-1`)
- [x] Reference period fit scoring (from `feedback-1`)

**Frontend**
- [x] Nutrition label with 5 confidence scores
- [x] Confidence score rows clickable — scroll to indicator methodology panel
- [x] Per-indicator methodology card panel with tab strip
- [x] Clicking indicator name in claim card jumps to its methodology tab
- [x] Shared source / no data / sparse data flags shown inline on each methodology card
- [x] ngrok hosting configured

### Outstanding

- [ ] **Indicator Scout** — for a given policy topic, surface indicators that *should* be in scope vs. what's declared; the `missing_source_recommendations` field exists in the backend but the scout logic is not yet connected to UN Data Commons search
- [ ] **Decision log** — record why indicators were excluded or warnings acknowledged so the appendix is an audit trail, not just metadata
- [ ] **Export** — generate a PDF/JSON methodology appendix that travels with the report
- [ ] **Power/adequacy check** — flag when observation count and data type cannot support the claim type (trend vs. point estimate vs. causal)
- [ ] **Somalia demo data** — CLM-001 correctly flags "No DC data" for all 3 declared indicators; Somalia is genuinely absent from UN Data Commons for those SDGs

---

## Team

Mirror Worlds · UN Tech Over 2026 · Challenge 2
