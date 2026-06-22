import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <div class="app-header-inner">
        <span class="app-brand">Mirror Worlds</span>
        <nav class="app-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            Analyze
          </a>
          <a routerLink="/twins" routerLinkActive="active">Historical twins</a>
        </nav>
      </div>
    </header>
    <router-outlet />
  `,
  styles: [
    `
      .app-header {
        border-bottom: 1px solid var(--border);
        background: var(--panel);
      }

      .app-header-inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0.85rem 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .app-brand {
        font-weight: 700;
        font-size: 0.95rem;
        color: var(--ink);
      }

      .app-nav {
        display: flex;
        gap: 0.35rem;
      }

      .app-nav a {
        text-decoration: none;
        color: var(--ink);
        font-weight: 600;
        font-size: 0.9rem;
        padding: 0.45rem 0.85rem;
        border-radius: 8px;
        border: 1px solid transparent;
      }

      .app-nav a:hover {
        background: var(--accent-soft);
        color: var(--accent);
      }

      .app-nav a.active {
        background: var(--ink);
        color: #fff;
        border-color: var(--ink);
      }

      @media (max-width: 600px) {
        .app-header-inner {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class AppComponent {}
