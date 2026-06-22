import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObservationPoint } from '../../models/evaluation.model';

@Component({
  selector: 'app-indicator-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="panel" *ngIf="observations.length">
      <h3 class="panel-title">Indicator methodology cards</h3>

      <div class="tab-strip">
        <button
          *ngFor="let obs of observations"
          type="button"
          class="tab-btn"
          [class.active]="activeTab === obs.dcid"
          [class.no-data]="!obs.data_available"
          (click)="selectTab(obs.dcid)"
        >
          {{ shortName(obs) }}
          <span class="tab-badge" *ngIf="!obs.data_available">no data</span>
          <span class="tab-badge shared" *ngIf="isShared(obs)">shared source</span>
        </button>
      </div>

      <div class="card" *ngIf="active">
        <div class="card-header">
          <div>
            <p class="card-label">Indicator</p>
            <p class="card-name">{{ active.name || active.dcid }}</p>
            <p class="card-dcid">{{ active.dcid }}</p>
          </div>
          <div class="availability" [class.unavailable]="!active.data_available">
            {{ active.data_available ? 'Data available' : 'No DC data' }}
          </div>
        </div>

        <div class="card-grid">
          <div class="field">
            <span class="field-label">Agency</span>
            <span class="field-value">{{ active.agency || active.source || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Measurement method</span>
            <span class="field-value">{{ active.measurement_method || '—' }}</span>
          </div>
          <div class="field">
            <span class="field-label">Time coverage</span>
            <span class="field-value">
              <ng-container *ngIf="active.earliest_date && active.latest_date">
                {{ active.earliest_date }} – {{ active.latest_date }}
                <span class="obs-count" *ngIf="active.obs_count != null">
                  ({{ active.obs_count }} observation{{ active.obs_count === 1 ? '' : 's' }})
                </span>
              </ng-container>
              <ng-container *ngIf="!active.earliest_date">—</ng-container>
            </span>
          </div>
          <div class="field">
            <span class="field-label">Latest value</span>
            <span class="field-value">
              <ng-container *ngIf="active.value != null">
                {{ active.value }}
                <span *ngIf="active.unit" class="unit">{{ active.unit }}</span>
                <span *ngIf="active.date" class="muted">({{ active.date }})</span>
              </ng-container>
              <ng-container *ngIf="active.value == null">—</ng-container>
            </span>
          </div>
          <div class="field">
            <span class="field-label">Observation period</span>
            <span class="field-value">{{ formatPeriod(active.observation_period) }}</span>
          </div>
        </div>

        <div class="flag shared-flag" *ngIf="isShared(active)">
          <strong>Shared source assumption:</strong> {{ sharedFlagText(active) }}
        </div>

        <div class="flag no-data-flag" *ngIf="!active.data_available">
          <strong>No UN Data Commons data</strong> for this indicator in the declared geography.
          The report cites this indicator but no observations were returned by the DC API.
        </div>

        <div class="flag density-flag" *ngIf="active.data_available && active.obs_count != null && active.obs_count < 5">
          <strong>Sparse data:</strong> only {{ active.obs_count }} observation{{ active.obs_count === 1 ? '' : 's' }} available.
          Trend or causal conclusions may not be reliable.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 1.25rem;
    }

    .panel-title {
      margin: 0 0 1rem;
      font-size: 1rem;
      font-weight: 700;
    }

    .tab-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin-bottom: 1rem;
    }

    .tab-btn {
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 8px;
      padding: 0.4rem 0.75rem;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.12s, border-color 0.12s;
    }

    .tab-btn.active {
      background: var(--ink);
      color: #fff;
      border-color: var(--ink);
    }

    .tab-btn.no-data {
      opacity: 0.6;
    }

    .tab-badge {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(0,0,0,0.12);
      border-radius: 4px;
      padding: 0.1rem 0.35rem;
    }

    .tab-badge.shared {
      background: #fff3cd;
      color: #856404;
    }

    .tab-btn.active .tab-badge {
      background: rgba(255,255,255,0.25);
      color: #fff;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
    }

    .card-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin: 0 0 0.2rem;
    }

    .card-name {
      font-weight: 700;
      font-size: 0.95rem;
      margin: 0 0 0.15rem;
    }

    .card-dcid {
      font-size: 0.72rem;
      color: var(--muted);
      font-family: monospace;
      margin: 0;
    }

    .availability {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      background: #d1fae5;
      color: #065f46;
      white-space: nowrap;
    }

    .availability.unavailable {
      background: #fee2e2;
      color: #991b1b;
    }

    .card-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      padding: 0;
    }

    .field {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      border-right: 1px solid var(--border);
    }

    .field:nth-child(even) {
      border-right: none;
    }

    .field-label {
      display: block;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      margin-bottom: 0.25rem;
    }

    .field-value {
      font-size: 0.88rem;
      font-weight: 600;
    }

    .obs-count {
      font-weight: 400;
      color: var(--muted);
      font-size: 0.82rem;
    }

    .unit {
      color: var(--muted);
      font-weight: 400;
      margin-left: 0.25rem;
    }

    .muted {
      color: var(--muted);
      font-weight: 400;
    }

    .flag {
      padding: 0.75rem 1rem;
      font-size: 0.82rem;
      line-height: 1.45;
    }

    .shared-flag {
      background: #fffbeb;
      border-top: 1px solid #fde68a;
      color: #78350f;
    }

    .no-data-flag {
      background: #fef2f2;
      border-top: 1px solid #fecaca;
      color: #7f1d1d;
    }

    .density-flag {
      background: #fff7ed;
      border-top: 1px solid #fed7aa;
      color: #7c2d12;
    }
  `],
})
export class IndicatorPanelComponent implements OnChanges {
  @Input() observations: ObservationPoint[] = [];
  @Input() activeIndicatorDcid: string | null = null;

  activeTab: string | null = null;
  active: ObservationPoint | null = null;
  sharedAgencies: Set<string> = new Set();

  ngOnChanges(): void {
    this.computeSharedAgencies();
    if (this.activeIndicatorDcid && this.observations.some(o => o.dcid === this.activeIndicatorDcid)) {
      this.activeTab = this.activeIndicatorDcid;
    } else if (this.observations.length && !this.activeTab) {
      this.activeTab = this.observations[0].dcid;
    }
    this.active = this.observations.find(o => o.dcid === this.activeTab) ?? null;
  }

  selectTab(dcid: string): void {
    this.activeTab = dcid;
    this.active = this.observations.find(o => o.dcid === dcid) ?? null;
  }

  shortName(obs: ObservationPoint): string {
    if (obs.name && obs.name !== obs.dcid) return obs.name;
    const parts = obs.dcid.split('/');
    return parts[parts.length - 1].split('.')[0];
  }

  isShared(obs: ObservationPoint): boolean {
    return !!obs.agency && this.sharedAgencies.has(obs.agency);
  }

  sharedFlagText(obs: ObservationPoint): string {
    const peers = this.observations
      .filter(o => o.agency === obs.agency && o.dcid !== obs.dcid)
      .map(o => this.shortName(o));
    return `This indicator shares the ${obs.agency} modelling framework with ${peers.join(', ')} — they are not independent evidence.`;
  }

  formatPeriod(period: string | null | undefined): string {
    if (!period) return '—';
    if (period === 'P1Y') return 'Annual';
    if (period === 'P1M') return 'Monthly';
    if (period === 'P1Q') return 'Quarterly';
    return period;
  }

  private computeSharedAgencies(): void {
    const counts: Record<string, number> = {};
    for (const obs of this.observations) {
      if (obs.agency) counts[obs.agency] = (counts[obs.agency] ?? 0) + 1;
    }
    this.sharedAgencies = new Set(Object.entries(counts).filter(([, n]) => n >= 2).map(([a]) => a));
  }
}
