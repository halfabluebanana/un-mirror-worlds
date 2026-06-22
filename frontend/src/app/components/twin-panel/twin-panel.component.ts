import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TwinSummary } from '../../models/evaluation.model';

@Component({
  selector: 'app-twin-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel" [class.panel--grid]="layout === 'grid'">
      <header *ngIf="layout !== 'grid'">
        <h2>Historical twin database</h2>
        <p>Validated case studies indexed for SDG, indicator, and geography similarity.</p>
      </header>

      <div class="twin-list">
        <article class="twin" *ngFor="let twin of twins">
          <strong>{{ twin.title }}</strong>
          <p>{{ twin.country_name }}</p>
          <p class="meta">
            {{ twin.indicator_count }} indicators · SDGs
            {{ getSdgGoals(twin) }}
          </p>
          <a [href]="twin.url" target="_blank" rel="noreferrer">Source</a>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 1.25rem;
      }

      header h2 {
        margin: 0;
        font-size: 1.1rem;
      }

      header p {
        margin: 0.35rem 0 1rem;
        color: var(--muted);
        font-size: 0.92rem;
      }

      .twin-list {
        display: block;
      }

      .panel--grid .twin-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }

      .twin {
        border-top: 1px solid var(--border);
        padding: 0.85rem 0;
      }

      .panel--grid .twin {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 1rem;
        border-top: 1px solid var(--border);
      }

      .twin strong {
        display: block;
        margin-bottom: 0.2rem;
      }

      .meta {
        color: var(--muted);
        font-size: 0.88rem;
      }
    `,
  ],
})
export class TwinPanelComponent {
  @Input() twins: TwinSummary[] = [];
  @Input() layout: 'list' | 'grid' = 'list';

  getSdgGoals(twin: TwinSummary): string {
    return twin.sdgs.map((item) => item.goal).join(', ');
  }
}
