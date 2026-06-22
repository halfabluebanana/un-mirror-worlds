import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../services/api.service';
import {
  EvaluationLabel,
  ExtractionConfig,
  ReportClaim,
  TwinSummary,
} from '../../models/evaluation.model';
import { NutritionLabelComponent } from '../nutrition-label/nutrition-label.component';
import { TwinPanelComponent } from '../twin-panel/twin-panel.component';
import { IndicatorPanelComponent } from '../indicator-panel/indicator-panel.component';

type InputMode = 'demo' | 'url' | 'text';

@Component({
  selector: 'app-evaluate-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NutritionLabelComponent, TwinPanelComponent, IndicatorPanelComponent],
  template: `
    <main class="page">
      <section class="hero">
        <div>
          <p class="eyebrow">Mirror Worlds demo</p>
          <h1>Data Suitability &amp; Confidence</h1>
          <p>
            Paste a case study URL, free text, or use a demo claim. The backend
            extracts SDGs, geography, indicators, and sources, then scores the
            claim against historical twins and UN Data Commons.
          </p>
        </div>

        <div class="hero-card">
          <div class="mode-tabs">
            <button
              type="button"
              class="tab"
              [class.active]="inputMode === 'demo'"
              (click)="setMode('demo')"
            >
              Demo
            </button>
            <button
              type="button"
              class="tab"
              [class.active]="inputMode === 'url'"
              (click)="setMode('url')"
            >
              URL
            </button>
            <button
              type="button"
              class="tab"
              [class.active]="inputMode === 'text'"
              (click)="setMode('text')"
            >
              Text
            </button>
          </div>

          <ng-container *ngIf="inputMode === 'demo'">
            <label for="claimSelect">Demo claim</label>
            <select id="claimSelect" [(ngModel)]="selectedClaimId" (ngModelChange)="onDemoChange()">
              <option *ngFor="let claim of claims" [value]="claim.claim_id">
                {{ claim.claim_id }} · {{ claim.title }}
              </option>
            </select>
            <button type="button" (click)="runDemoEvaluation()" [disabled]="loading || !selectedClaim">
              {{ loading ? 'Evaluating…' : 'Generate label' }}
            </button>
          </ng-container>

          <ng-container *ngIf="inputMode === 'url'">
            <label for="claimUrl">Case study or report URL</label>
            <input
              id="claimUrl"
              type="url"
              [(ngModel)]="claimUrl"
              placeholder="https://data.unicef.org/data-for-action/..."
            />
            <label for="claimTitle">Title override (optional)</label>
            <input id="claimTitle" type="text" [(ngModel)]="claimTitle" placeholder="Custom title" />
            <label class="llm-toggle" *ngIf="extractionConfig">
              <input type="checkbox" [(ngModel)]="useLlm" [disabled]="!extractionConfig.enabled" />
              <span>
                Deep extraction via LLM
                <small *ngIf="extractionConfig.enabled">
                  ({{ extractionConfig.provider }} · {{ extractionConfig.model }})
                </small>
                <small *ngIf="!extractionConfig.enabled" class="muted">
                  — set ANTHROPIC_API_KEY in backend/.env
                </small>
              </span>
            </label>
            <button type="button" (click)="runCustomAnalysis()" [disabled]="loading || !claimUrl.trim()">
              {{ loading ? 'Analyzing…' : 'Extract &amp; analyze' }}
            </button>
          </ng-container>

          <ng-container *ngIf="inputMode === 'text'">
            <label for="claimText">Report text</label>
            <textarea
              id="claimText"
              rows="8"
              [(ngModel)]="claimText"
              placeholder="Paste policy text, an executive summary, or methodology excerpt…"
            ></textarea>
            <label for="textTitle">Title (optional)</label>
            <input id="textTitle" type="text" [(ngModel)]="claimTitle" placeholder="Report title" />
            <label class="llm-toggle" *ngIf="extractionConfig">
              <input type="checkbox" [(ngModel)]="useLlm" [disabled]="!extractionConfig.enabled" />
              <span>
                Deep extraction via LLM
                <small *ngIf="extractionConfig.enabled">
                  ({{ extractionConfig.provider }} · {{ extractionConfig.model }})
                </small>
                <small *ngIf="!extractionConfig.enabled" class="muted">
                  — set ANTHROPIC_API_KEY in backend/.env
                </small>
              </span>
            </label>
            <button type="button" (click)="runCustomAnalysis()" [disabled]="loading || !claimText.trim()">
              {{ loading ? 'Analyzing…' : 'Extract &amp; analyze' }}
            </button>
          </ng-container>

          <p class="hint" *ngIf="extractionMethod">
            Extraction: <strong>{{ extractionMethod }}</strong>
          </p>
          <p class="error" *ngIf="error">{{ error }}</p>
        </div>
      </section>

      <section class="layout">
        <app-twin-panel [twins]="twins"></app-twin-panel>

        <div class="result-column">
          <section class="claim-card" *ngIf="activeClaim">
            <h2>Extracted claim schema</h2>
            <dl>
              <div><dt>Claim ID</dt><dd>{{ activeClaim.claim_id }}</dd></div>
              <div><dt>Geography</dt><dd>{{ activeClaim.geographic_scope }}</dd></div>
              <div><dt>Target outcome</dt><dd>{{ activeClaim.target_outcome_indicator }}</dd></div>
              <div><dt>Analysis level</dt><dd>{{ activeClaim.analysis_level }}</dd></div>
              <div><dt>Declared sources</dt><dd>{{ activeClaim.declared_sources.join(', ') }}</dd></div>
              <div><dt>Indicators</dt><dd>{{ activeClaim.declared_indicators.length }} detected</dd></div>
            </dl>
            <div class="chip-row">
              <span class="chip" *ngFor="let sdg of activeClaim.sdgs">SDG {{ sdg.goal }}</span>
            </div>
            <ul class="indicator-list" *ngIf="activeClaim.declared_indicators.length">
              <li
                *ngFor="let indicator of activeClaim.declared_indicators"
                class="indicator-link"
                (click)="openIndicator(indicator.dcid)"
              >
                {{ indicator.name }}
              </li>
            </ul>
            <p class="preview" *ngIf="textPreview">{{ textPreview }}</p>
          </section>

          <div class="label-wrap">
            <app-nutrition-label [label]="label" (scoreClicked)="scrollToPanel()"></app-nutrition-label>
          </div>

          <app-indicator-panel
            *ngIf="label"
            [observations]="label.observations"
            [activeIndicatorDcid]="activeIndicatorDcid"
          ></app-indicator-panel>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1.25rem 3rem;
      }

      .hero {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 1.25rem;
        margin-bottom: 1.5rem;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.75rem;
        color: var(--muted);
        margin: 0 0 0.35rem;
      }

      h1 {
        margin: 0;
        font-size: clamp(1.8rem, 4vw, 2.6rem);
      }

      .hero p {
        color: var(--muted);
        line-height: 1.55;
      }

      .hero-card,
      .claim-card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.25rem;
      }

      .mode-tabs {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.35rem;
        margin-bottom: 1rem;
      }

      .tab {
        border: 1px solid var(--border);
        background: #fff;
        color: var(--ink);
        border-radius: 8px;
        padding: 0.5rem 0.65rem;
        font-weight: 600;
        margin-top: 0;
      }

      .tab.active {
        background: var(--ink);
        color: #fff;
        border-color: var(--ink);
      }

      label {
        display: block;
        margin-bottom: 0.45rem;
        font-weight: 600;
      }

      select,
      input,
      textarea,
      button.primary-action {
        width: 100%;
        border-radius: 10px;
        border: 1px solid var(--border);
        padding: 0.75rem 0.85rem;
        font: inherit;
      }

      textarea {
        resize: vertical;
        min-height: 140px;
      }

      button.primary-action,
      .hero-card > ng-container button,
      .hero-card button:not(.tab) {
        margin-top: 0.85rem;
        background: var(--accent);
        color: white;
        border: none;
        font-weight: 600;
        width: 100%;
        border-radius: 10px;
        padding: 0.75rem 0.85rem;
      }

      button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      .hint {
        margin: 0.75rem 0 0;
        font-size: 0.85rem;
        color: var(--muted);
      }

      .llm-toggle {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin: 0.85rem 0 0;
        font-weight: 500;
        cursor: pointer;
      }

      .llm-toggle input {
        width: auto;
        margin-top: 0.2rem;
      }

      .llm-toggle small {
        display: block;
        font-weight: 400;
        color: var(--muted);
        margin-top: 0.15rem;
      }

      .llm-toggle small.muted {
        font-style: italic;
      }

      .error {
        color: var(--critical);
        margin: 0.75rem 0 0;
      }

      .layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 1.25rem;
        align-items: start;
      }

      .result-column {
        display: grid;
        gap: 1rem;
      }

      .label-wrap {
        display: flex;
        justify-content: center;
        padding: 0.5rem 0 1rem;
      }

      dl {
        display: grid;
        gap: 0.65rem;
        margin: 0;
      }

      dl div {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 0.75rem;
      }

      dt {
        color: var(--muted);
        font-size: 0.9rem;
      }

      dd {
        margin: 0;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 1rem;
      }

      .chip {
        background: var(--accent-soft);
        color: var(--accent);
        border-radius: 999px;
        padding: 0.25rem 0.7rem;
        font-size: 0.82rem;
        font-weight: 600;
      }

      .indicator-list {
        margin: 0.85rem 0 0;
        padding-left: 1.1rem;
        font-size: 0.88rem;
        color: var(--muted);
      }

      .indicator-link {
        cursor: pointer;
        color: var(--accent);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .indicator-link:hover {
        color: var(--ink);
      }

      .preview {
        margin: 0.85rem 0 0;
        font-size: 0.82rem;
        color: var(--muted);
        line-height: 1.45;
        border-top: 1px solid var(--border);
        padding-top: 0.75rem;
      }

      @media (max-width: 900px) {
        .hero,
        .layout,
        dl div {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class EvaluatePageComponent implements OnInit {
  twins: TwinSummary[] = [];
  claims: ReportClaim[] = [];
  inputMode: InputMode = 'url';

  selectedClaimId = '';
  selectedClaim: ReportClaim | null = null;
  activeClaim: ReportClaim | null = null;

  claimUrl = '';
  claimText = '';
  claimTitle = '';
  useLlm = true;
  extractionConfig: ExtractionConfig | null = null;

  label: EvaluationLabel | null = null;
  extractionMethod = '';
  textPreview = '';
  loading = false;
  error = '';
  activeIndicatorDcid: string | null = null;

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getTwins().subscribe({
      next: (twins) => (this.twins = twins),
      error: () => (this.error = 'Could not load historical twins. Is the API running?'),
    });

    this.api.getDemoClaims().subscribe({
      next: (claims) => {
        this.claims = claims;
        if (claims.length) {
          this.selectedClaimId = claims[0].claim_id;
          this.selectedClaim = claims[0];
        }
      },
    });

    this.api.getExtractionConfig().subscribe({
      next: (config) => {
        this.extractionConfig = config;
        this.useLlm = config.enabled;
      },
    });
  }

  setMode(mode: InputMode): void {
    this.inputMode = mode;
    this.error = '';
    this.label = null;
    this.extractionMethod = '';
    this.textPreview = '';

    if (mode === 'demo') {
      this.activeClaim = this.selectedClaim;
    } else {
      this.activeClaim = null;
    }
  }

  onDemoChange(): void {
    this.selectedClaim =
      this.claims.find((claim) => claim.claim_id === this.selectedClaimId) ?? null;
    this.activeClaim = this.selectedClaim;
    this.label = null;
    this.error = '';
    this.extractionMethod = '';
    this.textPreview = '';
  }

  runDemoEvaluation(): void {
    if (!this.selectedClaim) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.extractionMethod = 'demo_claim';
    this.textPreview = this.selectedClaim.summary;
    this.api.evaluate(this.selectedClaim).subscribe({
      next: (response) => {
        this.activeClaim = this.selectedClaim;
        this.label = response.label;
        this.loading = false;
      },
      error: (err) => {
        this.error = this.formatError(err, 'Evaluation failed.');
        this.loading = false;
      },
    });
  }

  runCustomAnalysis(): void {
    const payload =
      this.inputMode === 'url'
        ? {
            url: this.claimUrl.trim(),
            title: this.claimTitle.trim() || undefined,
            use_llm: this.useLlm,
          }
        : {
            text: this.claimText.trim(),
            title: this.claimTitle.trim() || undefined,
            use_llm: this.useLlm,
          };

    this.loading = true;
    this.error = '';
    this.label = null;

    this.api.analyze(payload).subscribe({
      next: (response) => {
        this.activeClaim = response.claim;
        this.label = response.label;
        this.extractionMethod = response.extraction_method;
        this.textPreview = response.text_preview;
        this.loading = false;
      },
      error: (err) => {
        this.error = this.formatError(err, 'Analysis failed.');
        this.loading = false;
      },
    });
  }

  openIndicator(dcid: string): void {
    this.activeIndicatorDcid = dcid;
    setTimeout(() => {
      document.querySelector('app-indicator-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  scrollToPanel(): void {
    document.querySelector('app-indicator-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private formatError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const body = (err as { error?: unknown }).error;
      if (typeof body === 'string') {
        return body;
      }
      if (body && typeof body === 'object' && 'description' in body) {
        return String((body as { description: unknown }).description);
      }
    }
    return fallback;
  }
}
