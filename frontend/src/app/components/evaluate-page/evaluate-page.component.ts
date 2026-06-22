import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../services/api.service';
import {
  EvaluationLabel,
  ReportClaim,
  TwinSummary,
} from '../../models/evaluation.model';
import { NutritionLabelComponent } from '../nutrition-label/nutrition-label.component';
import { TwinPanelComponent } from '../twin-panel/twin-panel.component';

@Component({
  selector: 'app-evaluate-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NutritionLabelComponent, TwinPanelComponent],
  template: `
    <main class="page">
      <section class="hero">
        <div>
          <p class="eyebrow">Mirror Worlds demo</p>
          <h1>Data Suitability &amp; Confidence</h1>
          <p>
            Evaluate SDG report claims against historical twins, UN Data Commons
            observations, and custodian metadata. Output follows the nutrition-label
            pattern from the UNSD blueprint.
          </p>
        </div>
        <div class="hero-card">
          <label for="claimSelect">Demo claim</label>
          <select id="claimSelect" [(ngModel)]="selectedClaimId" (ngModelChange)="onClaimChange()">
            <option *ngFor="let claim of claims" [value]="claim.claim_id">
              {{ claim.claim_id }} · {{ claim.title }}
            </option>
          </select>
          <button type="button" (click)="runEvaluation()" [disabled]="loading || !selectedClaim">
            {{ loading ? 'Evaluating…' : 'Generate label' }}
          </button>
          <p class="error" *ngIf="error">{{ error }}</p>
        </div>
      </section>

      <section class="layout">
        <app-twin-panel [twins]="twins"></app-twin-panel>

        <div class="result-column">
          <section class="claim-card" *ngIf="selectedClaim">
            <h2>Extracted claim schema</h2>
            <dl>
              <div><dt>Claim ID</dt><dd>{{ selectedClaim.claim_id }}</dd></div>
              <div><dt>Geography</dt><dd>{{ selectedClaim.geographic_scope }}</dd></div>
              <div><dt>Target outcome</dt><dd>{{ selectedClaim.target_outcome_indicator }}</dd></div>
              <div><dt>Analysis level</dt><dd>{{ selectedClaim.analysis_level }}</dd></div>
              <div><dt>Declared sources</dt><dd>{{ selectedClaim.declared_sources.join(', ') }}</dd></div>
            </dl>
            <div class="chip-row">
              <span class="chip" *ngFor="let sdg of selectedClaim.sdgs">SDG {{ sdg.goal }}</span>
            </div>
          </section>

          <app-nutrition-label [label]="label"></app-nutrition-label>
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

      label {
        display: block;
        margin-bottom: 0.45rem;
        font-weight: 600;
      }

      select,
      button {
        width: 100%;
        border-radius: 10px;
        border: 1px solid var(--border);
        padding: 0.75rem 0.85rem;
      }

      button {
        margin-top: 0.85rem;
        background: var(--accent);
        color: white;
        border: none;
        font-weight: 600;
      }

      button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
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
  selectedClaimId = '';
  selectedClaim: ReportClaim | null = null;
  label: EvaluationLabel | null = null;
  loading = false;
  error = '';

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
      error: () => (this.error = 'Could not load demo claims. Is the API running on :8000?'),
    });
  }

  onClaimChange(): void {
    this.selectedClaim =
      this.claims.find((claim) => claim.claim_id === this.selectedClaimId) ?? null;
    this.label = null;
    this.error = '';
  }

  runEvaluation(): void {
    if (!this.selectedClaim) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.api.evaluate(this.selectedClaim).subscribe({
      next: (response) => {
        this.label = response.label;
        this.loading = false;
      },
      error: () => {
        this.error = 'Evaluation failed. Confirm the Python API is running on port 8000.';
        this.loading = false;
      },
    });
  }
}
