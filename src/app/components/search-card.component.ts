import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardStateService } from '../services/dashboard-state.service';

/**
 * Search card. Renders exactly the returned `hits` array with no extra
 * client-side slicing, so the displayed match count and the rendered list
 * length are always the same number by construction (the showcase spec's
 * "result count matches rendered list length" rule) -- unlike the other
 * cards' newest-first chip lists, which cap at 5 for display density, the
 * search result list is the whole answer to the query.
 */
@Component({
  selector: 'app-search-card',
  imports: [FormsModule],
  template: `
    <div
      class="flex h-full flex-col gap-4 rounded-[var(--zerops-radius-card)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-card-bg)] p-6"
    >
      <header>
        <h2 class="font-[var(--zerops-font-head)] text-lg font-semibold text-[var(--zerops-on-surface)]">Search</h2>
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Meilisearch · full-text user search</p>
      </header>

      <div class="flex items-baseline gap-2">
        <span class="font-[var(--zerops-font-head)] text-2xl font-semibold text-[var(--zerops-on-surface)]" data-test="search-indexed">{{
          state.searchState()?.indexedCount ?? 0
        }}</span>
        <span class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">indexed documents</span>
      </div>

      <form class="flex gap-2" (ngSubmit)="search()">
        <input
          name="query"
          [(ngModel)]="query"
          placeholder="Search by name or bio…"
          class="flex-1 rounded-[var(--zerops-radius-input)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
        />
        <button
          type="submit"
          data-feature="search"
          [disabled]="searching()"
          class="rounded-full bg-[var(--zerops-primary)] px-4 py-2 font-[var(--zerops-font-body)] text-sm font-medium text-[var(--zerops-primary-on)] disabled:opacity-60"
        >
          {{ searching() ? '…' : 'Search' }}
        </button>
      </form>

      <div class="flex-1 overflow-hidden">
        @if (state.searchLoad() === 'error') {
          <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-error)]">Search failed. Try again.</p>
        } @else {
          @if (state.searchResults()) {
            <p class="mb-1 font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">
              {{ hits().length }} match{{ hits().length === 1 ? '' : 'es' }}
            </p>
          }
          <ul class="flex flex-col gap-1" aria-label="search-results">
            @for (hit of hits(); track hit.id) {
              <li
                class="rounded-[var(--zerops-radius-input)] bg-[var(--zerops-surface-high)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
              >
                <span class="font-medium">{{ hit.name }}</span>
                @if (hit.bio) {
                  <span class="text-[var(--zerops-on-surface-muted)]"> — {{ hit.bio }}</span>
                }
              </li>
            } @empty {
              <li class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">No matches yet — try a search above.</li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class SearchCardComponent {
  protected readonly state = inject(DashboardStateService);

  protected query = '';
  protected readonly searching = signal(false);
  protected readonly hits = computed(() => this.state.searchResults()?.hits ?? []);

  async search(): Promise<void> {
    this.searching.set(true);
    try {
      await this.state.runSearch(this.query.trim());
    } finally {
      this.searching.set(false);
    }
  }
}
