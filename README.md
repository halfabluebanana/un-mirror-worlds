# Mirror Worlds — Data Suitability & Confidence

> **UN Tech Over Hackathon 2026 · Challenge 2: Trust, QA & Fitness for Purpose**

Policy decisions get made on data that decision makers can't fully evaluate. Analysts pick indicators, blend sources, and write reports — but the methodology trail goes cold. The data's origins, limitations, and fitness for the specific claim being made are buried in footnotes or lost entirely.

Mirror Worlds makes that trail visible. It evaluates SDG report claims against UN Data Commons observations, historical methodology twins, and custodian metadata, then outputs a standardised **Data Suitability & Confidence** label — modelled on the nutrition facts paradigm — that travels with the analysis.

---

## The problem

When a policy report says *"child poverty in Somalia is X%"*, five things are usually unknown to the decision maker:

1. **Source provenance** — which agency produced this, using what method?
2. **Methodology fitness** — is a national-level modelled estimate appropriate for a municipal intervention decision?
3. **Missing indicators** — what data *should* have been included but wasn't?
4. **Data currency** — how old is the underlying data relative to the claim?
5. **Claim type mismatch** — is the report making a causal claim ("this policy reduced poverty") with only observational data?

These aren't edge cases. They're the norm in SDG reporting, and they compound: a report with slightly wrong indicators, slightly stale data, and a slightly overstated causal claim can produce significantly wrong policy.

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
LLM claim extractor        ← structured extraction from report URLs/text (Claude)
SDG custodian metadata     ← indicator-level limitations and coverage notes
```

---

## Running locally

### 1. Backend (port 8000)

```bash
cd backend
cp .env.example .env          # edit ANTHROPIC_API_KEY if you want LLM extraction
./run.sh
```

Works without an API key — falls back to heuristic extraction. Deep LLM extraction requires `ANTHROPIC_API_KEY` in `backend/.env`.

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

## What's next

- [ ] Indicator Scout: for a given policy topic, surface indicators that *should* be in scope vs. what's declared
- [ ] Decision log: record analyst choices (why an indicator was excluded, why a warning was acknowledged) so the appendix is an audit trail, not just metadata
- [ ] Export: generate a structured methodology appendix (PDF / structured JSON) that travels with the report
- [ ] Power/adequacy check: flag when observation count and data type cannot support the claim type (trend vs. point estimate vs. causal)

---

## Team

Mirror Worlds · UN Tech Over 2026 · Challenge 2
