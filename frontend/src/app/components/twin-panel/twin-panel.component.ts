import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TwinSummary } from '../../models/evaluation.model';

@Component({
  selector: 'app-twin-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="panel">
      <header>
        <h2>Historical twin database</h2>
        <p>Validated case studies indexed for SDG, indicator, and geography similarity.</p>
      </header>

      <article class="twin" *ngFor="let twin of twins">
        <strong>{{ twin.title }}</strong>
        <p>{{ twin.country_name }}</p>
        <p class="meta">{{ twin.indicator_count }} indicators</p>
        <div class="chip-row">
          <span
            *ngFor="let sdg of twin.sdgs"
            class="chip"
            [style.background]="sdgColor(sdg.goal)"
            [style.color]="sdg.goal === 7 ? '#2C1A0E' : '#fff'"
          >SDG {{ sdg.goal }} · {{ sdg.name }}</span>
        </div>
        <a [href]="twin.url" target="_blank" rel="noreferrer">Source →</a>
      </article>
    </section>
  `,
  styles: [
    `
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 0;
        padding: 1.25rem;
      }

      header h2 {
        margin: 0;
        font-size: 1.1rem;
      }

      header p {
        margin: 0.35rem 0 1rem;
        color: var(--muted);
        font-size: 0.88rem;
        line-height: 1.45;
      }

      .twin {
        border-top: 1px solid var(--border);
        padding: 0.85rem 0;
      }

      .twin strong {
        display: block;
        margin-bottom: 0.2rem;
      }

      .meta {
        color: var(--muted);
        font-size: 0.85rem;
        margin: 0.15rem 0 0.5rem;
      }

      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-bottom: 0.55rem;
      }

      .chip {
        border-radius: 4px;
        padding: 0.22rem 0.6rem;
        font-size: 0.72rem;
        font-weight: 700;
        font-family: Arial, Helvetica, sans-serif;
        max-width: 100%;
        word-break: break-word;
      }

      a {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--accent);
        text-decoration: none;
      }

      a:hover {
        color: var(--accent-2);
      }
    `,
  ],
})
export class TwinPanelComponent {
  @Input() twins: TwinSummary[] = [];

  private readonly SDG_COLORS: Record<number, string> = {
    1:  '#B07080', 2:  '#B09A55', 3:  '#5A9060', 4:  '#9A5060', 5:  '#BF7868',
    6:  '#5898B0', 7:  '#C0A840', 8:  '#7A4458', 9:  '#B87045', 10: '#A85075',
    11: '#BE8840', 12: '#9A8448', 13: '#4A7850', 14: '#3A88AA', 15: '#5A9050',
    16: '#3A7088', 17: '#3A5870',
  };

  sdgColor(goal: number): string {
    return this.SDG_COLORS[goal] ?? '#888';
  }
}
