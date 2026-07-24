import { Component, inject } from '@angular/core';
import { DashboardStateService } from '../services/dashboard-state.service';
import { StatusStripComponent } from '../components/status-strip.component';
import { DirectoryCardComponent } from '../components/directory-card.component';
import { CacheCardComponent } from '../components/cache-card.component';
import { QueueCardComponent } from '../components/queue-card.component';
import { StorageCardComponent } from '../components/storage-card.component';
import { SearchCardComponent } from '../components/search-card.component';

/**
 * The whole showcase dashboard lives on this one route: a full-width
 * Status strip over a responsive card grid (3-col -> 2-col -> 1-col),
 * cards in the canonical Items/Cache/Queue/Storage/Search order. Every
 * card's initial data comes from `DashboardStateService`, which fetches
 * once client-side after hydration (see the service doc) -- the loading
 * text each card shows on first paint is the intended "reasonable loading
 * state", not a placeholder for something un-implemented.
 */
@Component({
  selector: 'app-home',
  imports: [
    StatusStripComponent,
    DirectoryCardComponent,
    CacheCardComponent,
    QueueCardComponent,
    StorageCardComponent,
    SearchCardComponent,
  ],
  template: `
    <main class="flex flex-col gap-4 py-6">
      <header class="flex flex-col gap-1">
        <h1 class="font-[var(--zerops-font-head)] text-2xl font-semibold text-[var(--zerops-on-surface)]">Analog + Better Auth</h1>
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">
          SSR showcase — Postgres, Valkey, NATS, object storage, and Meilisearch wired end to end.
        </p>
      </header>

      <app-status-strip [status]="state.status()" />

      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <app-directory-card />
        <app-cache-card />
        <app-queue-card />
        <app-storage-card />
        <app-search-card />
      </div>
    </main>
  `,
})
export default class Home {
  protected readonly state = inject(DashboardStateService);
}
