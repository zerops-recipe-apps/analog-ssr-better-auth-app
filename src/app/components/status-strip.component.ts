import { Component, computed, input } from '@angular/core';
import type { StatusState } from '../services/api-client';

type ServiceKey = keyof StatusState;

const SERVICE_LABELS: Record<ServiceKey, string> = {
  api: 'App',
  db: 'Postgres',
  cache: 'Valkey',
  broker: 'NATS',
  search: 'Meilisearch',
  storage: 'Object storage',
};

const SERVICE_ORDER: ServiceKey[] = ['api', 'db', 'cache', 'broker', 'search', 'storage'];

/**
 * Leading full-width element of the dashboard -- one liveness dot per
 * managed-service category, sourced from a single GET /api/status. This
 * strip is itself the demonstration (no click affordance): it answers
 * "is anything wired?" before the porter touches a form.
 */
@Component({
  selector: 'app-status-strip',
  imports: [],
  template: `
    <div
      class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[var(--zerops-radius-card)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-card-bg)] px-6 py-4"
    >
      <span class="font-[var(--zerops-font-head)] text-sm font-medium tracking-wide text-[var(--zerops-on-surface-muted)] uppercase">
        Status
      </span>
      @for (row of rows(); track row.key) {
        <span class="flex items-center gap-2 font-[var(--zerops-font-body)] text-sm" [attr.data-test]="'status-' + row.key">
          <span class="inline-block h-2 w-2 rounded-full" [class]="row.ok ? 'bg-[var(--zerops-success)]' : 'bg-[var(--zerops-error)]'"></span>
          <span class="text-[var(--zerops-on-surface)]">{{ row.label }}</span>
          <span class="text-[var(--zerops-on-surface-muted)]">{{ row.ok ? 'ok' : 'down' }}</span>
        </span>
      }
      @if (!status()) {
        <span class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Checking services…</span>
      }
    </div>
  `,
})
export class StatusStripComponent {
  readonly status = input<StatusState | null>(null);

  readonly rows = computed(() => {
    const current = this.status();
    if (!current) return [];
    return SERVICE_ORDER.map((key) => ({
      key,
      label: SERVICE_LABELS[key],
      ok: current[key] === 'ok',
    }));
  });
}
