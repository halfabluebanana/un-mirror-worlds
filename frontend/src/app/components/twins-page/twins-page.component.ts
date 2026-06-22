import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService } from '../../services/api.service';
import { TwinSummary } from '../../models/evaluation.model';
import { TwinPanelComponent } from '../twin-panel/twin-panel.component';

@Component({
  selector: 'app-twins-page',
  standalone: true,
  imports: [CommonModule, TwinPanelComponent],
  template: `
    <main class="page">
      <header class="page-header">
        <p class="eyebrow">Mirror Worlds demo</p>
        <h1>Historical twin database</h1>
        <p>
          Validated UN case studies indexed for SDG, indicator, and geography similarity.
          These twins power correlation and comprehensiveness scoring on the analyze tab.
        </p>
      </header>

      <p class="error" *ngIf="error">{{ error }}</p>
      <app-twin-panel [twins]="twins" layout="grid"></app-twin-panel>
    </main>
  `,
  styles: [
    `
      .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1.25rem 3rem;
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

      .page-header p:last-child {
        color: var(--muted);
        line-height: 1.55;
        max-width: 52rem;
      }

      .error {
        color: var(--critical);
        margin: 0 0 1rem;
      }
    `,
  ],
})
export class TwinsPageComponent implements OnInit {
  twins: TwinSummary[] = [];
  error = '';

  constructor(private readonly api: ApiService) {}

  ngOnInit(): void {
    this.api.getTwins().subscribe({
      next: (twins) => (this.twins = twins),
      error: () =>
        (this.error = 'Could not load historical twins. Is the API running on port 8000?'),
    });
  }
}
