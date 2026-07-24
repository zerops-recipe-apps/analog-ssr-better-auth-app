import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

/**
 * Items/DB card. This recipe's central resource is the Better Auth `user`
 * row, and the resource's "create" action IS the sign-up flow -- there is
 * no separate generic items-creation form, so sign-up doubles as the
 * crud-create trigger: a successful sign-up commits a new row, and the
 * Directory refresh that follows shows `items-count` incrementing by one
 * with the new member at the top of the list, satisfying the same
 * create-then-recount contract a plainer CRUD resource would. Sign-in and
 * sign-out live in the same card (a mode toggle next to sign-up) since
 * auth as a whole needs one home and this is the card that already owns
 * the "who's in the directory" story.
 */
@Component({
  selector: 'app-directory-card',
  imports: [FormsModule],
  template: `
    <div
      class="flex h-full flex-col gap-4 rounded-[var(--zerops-radius-card)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-card-bg)] p-6"
    >
      <header>
        <h2 class="font-[var(--zerops-font-head)] text-lg font-semibold text-[var(--zerops-on-surface)]">Directory</h2>
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Postgres · public user list</p>
      </header>

      <div class="flex items-baseline gap-2">
        @if (state.directoryLoad() === 'loading') {
          <span class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Loading…</span>
        } @else if (state.directoryLoad() === 'error') {
          <span class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-error)]">Couldn't load the directory.</span>
        } @else {
          <span class="font-[var(--zerops-font-head)] text-3xl font-semibold text-[var(--zerops-on-surface)]" data-test="items-count">{{
            state.directory()?.total ?? 0
          }}</span>
          <span class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">registered users</span>
        }
      </div>

      @if (auth.user(); as user) {
        <div class="flex items-center justify-between gap-2 rounded-[var(--zerops-radius-input)] bg-[var(--zerops-surface-high)] px-3 py-2">
          <span class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]">
            Signed in as <strong>{{ user.name }}</strong>
          </span>
          <button
            type="button"
            data-feature="sign-out"
            (click)="signOut()"
            class="rounded-full border border-[var(--zerops-outline-variant)] px-3 py-1 font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface)] hover:bg-[var(--zerops-surface-high)]"
          >
            Sign out
          </button>
        </div>
      } @else {
        <div class="flex flex-col gap-3">
          <div class="flex gap-1 rounded-full bg-[var(--zerops-surface-high)] p-1 text-sm">
            <button
              type="button"
              (click)="toggleMode('sign-up')"
              class="flex-1 rounded-full px-3 py-1 font-[var(--zerops-font-body)]"
              [class]="mode() === 'sign-up' ? 'bg-[var(--zerops-primary)] text-[var(--zerops-primary-on)]' : 'text-[var(--zerops-on-surface-muted)]'"
            >
              Create account
            </button>
            <button
              type="button"
              (click)="toggleMode('sign-in')"
              class="flex-1 rounded-full px-3 py-1 font-[var(--zerops-font-body)]"
              [class]="mode() === 'sign-in' ? 'bg-[var(--zerops-primary)] text-[var(--zerops-primary-on)]' : 'text-[var(--zerops-on-surface-muted)]'"
            >
              Sign in
            </button>
          </div>

          <form class="flex flex-col gap-2" (ngSubmit)="submit()">
            @if (mode() === 'sign-up') {
              <input
                name="name"
                [(ngModel)]="name"
                required
                placeholder="Name"
                class="rounded-[var(--zerops-radius-input)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
              />
            }
            <input
              name="email"
              type="email"
              [(ngModel)]="email"
              required
              placeholder="Email"
              class="rounded-[var(--zerops-radius-input)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
            />
            <input
              name="password"
              type="password"
              [(ngModel)]="password"
              required
              placeholder="Password"
              class="rounded-[var(--zerops-radius-input)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
            />
            @if (localError()) {
              <p class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-error)]">{{ localError() }}</p>
            }
            <button
              type="submit"
              [attr.data-feature]="mode() === 'sign-up' ? 'create-item' : 'sign-in'"
              [disabled]="submitting()"
              class="rounded-full bg-[var(--zerops-primary)] px-4 py-2 font-[var(--zerops-font-body)] text-sm font-medium text-[var(--zerops-primary-on)] disabled:opacity-60"
            >
              {{ submitting() ? 'Working…' : mode() === 'sign-up' ? 'Create account' : 'Sign in' }}
            </button>
          </form>
        </div>
      }

      <div class="flex-1 overflow-hidden">
        <p
          class="mb-1 font-[var(--zerops-font-body)] text-xs font-medium tracking-wide text-[var(--zerops-on-surface-muted)] uppercase"
        >
          Newest members
        </p>
        <ul class="flex flex-col gap-1" aria-label="directory-users">
          @for (u of recentUsers(); track u.id) {
            <li
              class="rounded-[var(--zerops-radius-input)] bg-[var(--zerops-surface-high)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
            >
              <span class="font-medium">{{ u.name }}</span>
              @if (u.bio) {
                <span class="text-[var(--zerops-on-surface-muted)]"> — {{ u.bio }}</span>
              }
            </li>
          } @empty {
            <li class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">No users yet.</li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class DirectoryCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected readonly mode = signal<'sign-up' | 'sign-in'>('sign-up');
  protected readonly submitting = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected name = '';
  protected email = '';
  protected password = '';

  protected readonly recentUsers = computed(() => this.state.directory()?.users.slice(0, 5) ?? []);

  toggleMode(next: 'sign-up' | 'sign-in'): void {
    this.mode.set(next);
    this.localError.set(null);
  }

  async submit(): Promise<void> {
    this.localError.set(null);
    this.submitting.set(true);
    try {
      if (this.mode() === 'sign-up') {
        await this.auth.signUp(this.name.trim(), this.email.trim(), this.password);
      } else {
        await this.auth.signIn(this.email.trim(), this.password);
      }
      this.password = '';
      // Only the directory list changes here (sign-up commits a new row);
      // the Cache card's own "View profile" click is deliberately the
      // first authoritative fetch so the MISS -> HIT transition is still
      // observable after this call, not silently consumed by it.
      await this.state.refreshDirectory();
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      this.submitting.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
  }
}
