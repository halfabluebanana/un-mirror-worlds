import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EvaluationLabel } from '../../models/evaluation.model';

@Component({
  selector: 'app-nutrition-label',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="label-card" *ngIf="label">
      <header class="label-header">
        <div>
          <p class="eyebrow">Report Evaluation</p>
          <h2>{{ label.report_title }}</h2>
          <p class="headline">{{ label.headline }}</p>
        </div>
        <div class="overall-score">
          <span>Overall Score</span>
          <strong>{{ label.overall_score | number: '1.0-0' }}%</strong>
        </div>
      </header>

      <div class="metrics">
        <article class="metric">
          <div class="metric-top">
            <h3>Indicator source variance</h3>
            <span>{{ label.indicator_source_variance.score | number: '1.0-0' }}%</span>
          </div>
          <p>{{ label.indicator_source_variance.explanation }}</p>
        </article>

        <article class="metric">
          <div class="metric-top">
            <h3>Indicator correlation</h3>
            <span>{{ label.indicator_correlation.score | number: '1.0-0' }}%</span>
          </div>
          <p>{{ label.indicator_correlation.explanation }}</p>
        </article>

        <article class="metric">
          <div class="metric-top">
            <h3>Indicator comprehensiveness</h3>
            <span>{{ label.indicator_comprehensiveness.score | number: '1.0-0' }}%</span>
          </div>
          <p>{{ label.indicator_comprehensiveness.explanation }}</p>
        </article>
      </div>

      <section class="badges" *ngIf="label.badges.length">
        <h3>Suitability badges</h3>
        <div class="badge-list">
          <article
            *ngFor="let badge of label.badges"
            class="badge"
            [class.warning]="badge.severity === 'warning'"
            [class.critical]="badge.severity === 'critical'"
          >
            <strong>{{ badge.label }}</strong>
            <p>{{ badge.detail }}</p>
          </article>
        </div>
      </section>

      <section class="recommendations" *ngIf="label.missing_source_recommendations.length">
        <h3>Missing source recommendations</h3>
        <ul>
          <li *ngFor="let item of label.missing_source_recommendations">{{ item }}</li>
        </ul>
      </section>

      <section class="twins" *ngIf="label.related_initiatives.length">
        <h3>Related initiatives</h3>
        <article *ngFor="let twin of label.related_initiatives" class="twin">
          <div>
            <strong>{{ twin.title }}</strong>
            <p>
              {{ twin.country_name }} · match {{ twin.similarity_score * 100 | number: '1.0-0' }}%
            </p>
            <p class="muted">
              SDGs {{ twin.matched_sdgs.join(', ') || 'n/a' }} ·
              {{ twin.matched_indicators.length }} shared indicators
            </p>
          </div>
          <a [href]="twin.url" target="_blank" rel="noreferrer">Open case study</a>
        </article>
      </section>

      <section class="observations" *ngIf="label.observations.length">
        <h3>UN Data Commons observations</h3>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Value</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let point of label.observations">
              <td>{{ point.name }}</td>
              <td>{{ point.value ?? 'n/a' }}</td>
              <td>{{ point.date ?? 'n/a' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </section>
  `,
  styles: [
    `
      .label-card {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.5rem;
        box-shadow: 0 18px 40px rgba(15, 35, 63, 0.08);
      }

      .label-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 1px solid var(--border);
        padding-bottom: 1rem;
        margin-bottom: 1rem;
      }

      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.75rem;
        color: var(--muted);
        margin: 0 0 0.35rem;
      }

      h2 {
        margin: 0;
        font-size: 1.35rem;
      }

      .headline {
        margin: 0.35rem 0 0;
        color: var(--muted);
      }

      .overall-score {
        min-width: 140px;
        background: var(--label-bg);
        color: var(--label-ink);
        border-radius: 14px;
        padding: 1rem;
        text-align: center;
      }

      .overall-score span {
        display: block;
        font-size: 0.8rem;
        opacity: 0.8;
      }

      .overall-score strong {
        font-size: 2rem;
      }

      .metrics {
        display: grid;
        gap: 0.85rem;
      }

      .metric {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 0.9rem 1rem;
        background: #fbfdff;
      }

      .metric-top {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.35rem;
      }

      .metric h3 {
        margin: 0;
        font-size: 0.98rem;
      }

      .metric span {
        font-weight: 700;
        color: var(--accent);
      }

      .metric p,
      .twin p,
      .badge p {
        margin: 0;
        color: var(--muted);
        line-height: 1.45;
      }

      .badges,
      .recommendations,
      .twins,
      .observations {
        margin-top: 1.25rem;
      }

      h3 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
      }

      .badge-list,
      .twins {
        display: grid;
        gap: 0.75rem;
      }

      .badge,
      .twin {
        border-radius: 12px;
        padding: 0.85rem 1rem;
        border: 1px solid var(--border);
      }

      .badge.warning {
        border-color: #f59e0b;
        background: #fff7ed;
      }

      .badge.critical {
        border-color: #ef4444;
        background: #fef2f2;
      }

      .twin {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
      }

      .muted {
        font-size: 0.88rem;
      }

      ul {
        margin: 0;
        padding-left: 1.1rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.92rem;
      }

      th,
      td {
        border-bottom: 1px solid var(--border);
        padding: 0.55rem 0.35rem;
        text-align: left;
      }
    `,
  ],
})
export class NutritionLabelComponent {
  @Input() label: EvaluationLabel | null = null;
  @Output() closed = new EventEmitter<void>();
}
