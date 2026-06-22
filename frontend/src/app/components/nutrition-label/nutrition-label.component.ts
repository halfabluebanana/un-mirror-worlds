import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { EvaluationLabel } from '../../models/evaluation.model';

@Component({
  selector: 'app-nutrition-label',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="nf-panel" *ngIf="label">
      <h2 class="nf-title">Data Suitability Facts</h2>

      <div class="nf-serving">
        <p class="nf-report">{{ label.report_title }}</p>
        <p class="nf-meta">
          <span>{{ label.claim.geographic_scope }}</span>
          <span>{{ label.claim.target_outcome_indicator }}</span>
        </p>
        <p class="nf-headline">{{ label.headline }}</p>
      </div>

      <div class="nf-rule nf-rule--thick"></div>

      <div class="nf-calories">
        <span class="nf-calories-label">Overall confidence</span>
        <span class="nf-calories-value">{{ label.overall_score | number: '1.0-0' }}%</span>
      </div>

      <div class="nf-rule nf-rule--thick"></div>

      <p class="nf-dv-header">Confidence scores</p>
      <div class="nf-rule nf-rule--medium"></div>

      <div class="nf-row nf-row--main nf-row--clickable" (click)="scoreClicked.emit()">
        <span class="nf-nutrient">Indicator correlation</span>
        <span class="nf-amount">{{ label.indicator_correlation.score | number: '1.0-0' }}% <span class="nf-arrow">↓</span></span>
      </div>
      <p class="nf-note">{{ label.indicator_correlation.explanation }}</p>
      <div class="nf-rule"></div>

      <div class="nf-row nf-row--main nf-row--clickable" (click)="scoreClicked.emit()">
        <span class="nf-nutrient">Indicator comprehensiveness</span>
        <span class="nf-amount">{{ label.indicator_comprehensiveness.score | number: '1.0-0' }}% <span class="nf-arrow">↓</span></span>
      </div>
      <p class="nf-note">{{ label.indicator_comprehensiveness.explanation }}</p>

      <div class="nf-rule"></div>
      <div class="nf-row nf-row--main nf-row--clickable" (click)="scoreClicked.emit()">
        <span class="nf-nutrient">Indicator source variance</span>
        <span class="nf-amount">{{ label.indicator_source_variance.score | number: '1.0-0' }}% <span class="nf-arrow">↓</span></span>
      </div>
      <p class="nf-note">{{ label.indicator_source_variance.explanation }}</p>

      <div class="nf-rule"></div>
      <div class="nf-row nf-row--main nf-row--clickable" (click)="scoreClicked.emit()">
        <span class="nf-nutrient">Geographic resolution fit</span>
        <span class="nf-amount">{{ label.geographic_resolution_fit.score | number: '1.0-0' }}% <span class="nf-arrow">↓</span></span>
      </div>
      <p class="nf-note">{{ label.geographic_resolution_fit.explanation }}</p>

      <div class="nf-rule"></div>
      <div class="nf-row nf-row--main nf-row--clickable" (click)="scoreClicked.emit()">
        <span class="nf-nutrient">Reference period fit</span>
        <span class="nf-amount">{{ label.reference_period_fit.score | number: '1.0-0' }}% <span class="nf-arrow">↓</span></span>
      </div>
      <p class="nf-note">{{ label.reference_period_fit.explanation }}</p>
      

      <div class="nf-rule nf-rule--thick"></div>

      <section *ngIf="label.badges.length" class="nf-section">
        <p class="nf-section-title">Alerts</p>
        <div class="nf-rule nf-rule--medium"></div>
        <div *ngFor="let badge of label.badges; let last = last" class="nf-alert-block">
          <div class="nf-row">
            <span class="nf-nutrient nf-nutrient--bold">{{ badge.label }}</span>
            <span class="nf-tag">{{ badge.severity }}</span>
          </div>
          <p class="nf-note nf-note--indent">{{ badge.detail }}</p>
          <div class="nf-rule" *ngIf="!last"></div>
        </div>
      </section>

      <!--- section *ngIf="label.missing_source_recommendations.length" class="nf-section">
        <p class="nf-section-title">Missing sources</p>
        <div class="nf-rule nf-rule--medium"></div>
        <ul class="nf-list">
          <li *ngFor="let item of label.missing_source_recommendations">{{ item }}</li>
        </ul>
      </section --->

      <!--- section *ngIf="label.related_initiatives.length" class="nf-section">
        <p class="nf-section-title">Related initiatives</p>
        <div class="nf-rule nf-rule--medium"></div>
        <div *ngFor="let twin of label.related_initiatives; let last = last" class="nf-twin">
          <div class="nf-row nf-row--main">
            <span class="nf-nutrient nf-nutrient--bold">{{ twin.title }}</span>
            <span class="nf-amount">{{ twin.similarity_score * 100 | number: '1.0-0' }}%</span>
          </div>
          <p class="nf-note nf-note--indent">
            {{ twin.country_name }} · SDGs {{ twin.matched_sdgs.join(', ') || 'n/a' }} ·
            {{ twin.matched_indicators.length }} shared indicators
          </p>
          <a class="nf-link" [href]="twin.url" target="_blank" rel="noreferrer">View case study</a>
          <div class="nf-rule" *ngIf="!last"></div>
        </div>
      </section>

      <section *ngIf="label.observations.length" class="nf-section">
        <p class="nf-section-title">UN Data Commons observations</p>
        <div class="nf-rule nf-rule--medium"></div>
        <div *ngFor="let point of label.observations; let last = last" class="nf-obs-row">
          <div class="nf-row">
            <span class="nf-nutrient">{{ point.name }}</span>
            <span class="nf-amount">{{ point.value ?? 'n/a' }}</span>
          </div>
          <p class="nf-note nf-note--indent">{{ point.date ?? 'date n/a' }}</p>
          <div class="nf-rule" *ngIf="!last"></div>
        </div>
      </section --->

      <div class="nf-rule nf-rule--thick"></div>
      <p class="nf-footnote">
        * Percent confidence scores are weighted from source variance, indicator correlation,
        comprehensiveness, geographic resolution fit, and reference period fit against
        historical methodology twins. Not a substitute for custodian agency review.
      </p>
    </section>
  `,
  styles: [
    `
      .nf-panel {
        width: 100%;
        max-width: 380px;
        margin: 0 auto;
        background: #fff;
        color: #000;
        border: 2px solid #000;
        padding: 0.35rem 0.5rem 0.6rem;
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.25;
      }

      .nf-title {
        margin: 0;
        font-size: 2rem;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.02em;
      }

      .nf-serving {
        margin-top: 0.35rem;
      }

      .nf-report {
        margin: 0;
        font-size: 0.82rem;
        font-weight: 700;
        line-height: 1.3;
      }

      .nf-meta {
        margin: 0.2rem 0 0;
        font-size: 0.78rem;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }

      .nf-headline {
        margin: 0.35rem 0 0;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .nf-rule {
        border: none;
        border-top: 1px solid #000;
        margin: 0.2rem 0;
      }

      .nf-rule--medium {
        border-top-width: 4px;
      }

      .nf-rule--thick {
        border-top-width: 8px;
        margin: 0.25rem 0;
      }

      .nf-calories {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        padding: 0.15rem 0;
      }

      .nf-calories-label {
        font-size: 0.95rem;
        font-weight: 700;
        padding-bottom: 0.15rem;
      }

      .nf-calories-value {
        font-size: 2.2rem;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.03em;
      }

      .nf-dv-header {
        margin: 0.15rem 0;
        font-size: 0.72rem;
        font-weight: 700;
        text-align: right;
      }

      .nf-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
        padding: 0.12rem 0;
      }

      .nf-row--main .nf-nutrient {
        font-weight: 700;
      }

      .nf-nutrient {
        font-size: 0.82rem;
        flex: 1;
      }

      .nf-nutrient--bold {
        font-weight: 700;
      }

      .nf-amount {
        font-size: 0.82rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .nf-note {
        margin: 0 0 0.15rem;
        font-size: 0.72rem;
        line-height: 1.35;
        color: #000;
      }

      .nf-note--indent {
        padding-left: 1rem;
      }

      .nf-tag {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        border: 1px solid #000;
        padding: 0.05rem 0.3rem;
      }

      .nf-section {
        margin-top: 0.15rem;
      }

      .nf-section-title {
        margin: 0.2rem 0;
        font-size: 0.82rem;
        font-weight: 700;
      }

      .nf-list {
        margin: 0.2rem 0 0.35rem;
        padding-left: 1.1rem;
        font-size: 0.72rem;
      }

      .nf-list li {
        margin-bottom: 0.2rem;
      }

      .nf-twin {
        margin-bottom: 0.15rem;
      }

      .nf-link {
        display: inline-block;
        margin: 0.1rem 0 0.2rem 1rem;
        font-size: 0.68rem;
        font-weight: 700;
        color: #000;
        text-decoration: underline;
      }

      .nf-footnote {
        margin: 0.35rem 0 0;
        font-size: 0.65rem;
        line-height: 1.35;
      }

      .nf-row--clickable {
        cursor: pointer;
        border-radius: 3px;
        margin: 0 -0.25rem;
        padding-left: 0.25rem;
        padding-right: 0.25rem;
        transition: background 0.1s;
      }

      .nf-row--clickable:hover {
        background: #f0f0f0;
      }

      .nf-arrow {
        font-size: 0.7rem;
        opacity: 0.45;
        margin-left: 0.2rem;
      }

      .nf-row--clickable:hover .nf-arrow {
        opacity: 1;
      }
    `,
  ],
})
export class NutritionLabelComponent {
  @Input() label: EvaluationLabel | null = null;
  @Output() scoreClicked = new EventEmitter<void>();
}
