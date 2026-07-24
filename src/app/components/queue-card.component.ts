import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

/**
 * Queue card. "Publish activity" hits the dedicated repeatable
 * POST /api/activity/publish trigger (distinct from sign-up/profile-update,
 * the event's other two publishers) so the round trip can be demonstrated
 * on demand without editing the profile every time.
 */
@Component({
  selector: 'app-queue-card',
  imports: [FormsModule],
  template: `
    <div
      class="flex h-full flex-col gap-4 rounded-[var(--zerops-radius-card)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-card-bg)] p-6"
    >
      <header>
        <h2 class="font-[var(--zerops-font-head)] text-lg font-semibold text-[var(--zerops-on-surface)]">Queue</h2>
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">NATS · queue-group activity feed</p>
      </header>

      <div class="flex gap-4">
        <div class="flex items-baseline gap-2">
          <span class="font-[var(--zerops-font-head)] text-2xl font-semibold text-[var(--zerops-on-surface)]" data-test="queue-pending">{{
            state.activity()?.pending ?? 0
          }}</span>
          <span class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">pending</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span
            class="font-[var(--zerops-font-head)] text-2xl font-semibold text-[var(--zerops-on-surface)]"
            data-test="queue-processed"
            >{{ state.activity()?.processed ?? 0 }}</span
          >
          <span class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">processed</span>
        </div>
      </div>

      @if (!auth.user()) {
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Sign in to publish an activity event.</p>
      } @else {
        <form class="flex flex-col gap-2" (ngSubmit)="publish()">
          <input
            name="message"
            [(ngModel)]="message"
            placeholder="Optional message"
            maxlength="200"
            class="rounded-[var(--zerops-radius-input)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
          />
          <button
            type="submit"
            data-feature="publish"
            [disabled]="publishing()"
            class="self-start rounded-full bg-[var(--zerops-primary)] px-4 py-2 font-[var(--zerops-font-body)] text-sm font-medium text-[var(--zerops-primary-on)] disabled:opacity-60"
          >
            {{ publishing() ? 'Publishing…' : 'Publish activity' }}
          </button>
          @if (localError()) {
            <p class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-error)]">{{ localError() }}</p>
          }
        </form>
      }

      <div class="flex-1 overflow-hidden">
        <p
          class="mb-1 font-[var(--zerops-font-body)] text-xs font-medium tracking-wide text-[var(--zerops-on-surface-muted)] uppercase"
        >
          Recent events
        </p>
        <ul class="flex flex-col gap-1" aria-label="queue-recent-events">
          @for (entry of recentEvents(); track entry.timestamp + entry.userId) {
            <li
              class="rounded-[var(--zerops-radius-input)] bg-[var(--zerops-surface-high)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
            >
              <span class="font-[var(--zerops-font-mono)] text-xs text-[var(--zerops-on-surface-muted)]">{{ entry.type }}</span>
              <span class="font-medium">{{ entry.name }}</span>
              @if (entry.message) {
                <span class="text-[var(--zerops-on-surface-muted)]"> "{{ entry.message }}"</span>
              }
            </li>
          } @empty {
            <li class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">No activity yet.</li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class QueueCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected message = '';
  protected readonly publishing = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected readonly recentEvents = computed(() => this.state.activity()?.recent.slice(0, 5) ?? []);

  async publish(): Promise<void> {
    this.publishing.set(true);
    this.localError.set(null);
    try {
      await this.state.publishActivity(this.message.trim() || undefined);
      this.message = '';
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      this.publishing.set(false);
    }
  }
}
