import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

/**
 * Cache card. `GET /api/profile` is simultaneously the crud "show" route
 * and the cache-demo trigger (Valkey read-through keyed on the session
 * cookie), so this card is also where profile view/edit and the avatar
 * preview live -- clicking "View profile" is the same action that proves
 * the cache. The avatar upload widget itself lives on the Storage card
 * (whose selectors/blob-fallback shape are mandated there); this card only
 * previews the current avatar, sourced from the profile fetch or updated
 * directly from an upload response (see DashboardStateService.
 * applyUploadedAvatar) without an extra round trip.
 *
 * The upload endpoint accepts any file (the Storage card's blob fallback
 * uploads a tiny text payload, and a real porter can pick any file type in
 * the file selector) and unconditionally sets it as the avatar -- there is
 * no image-mimetype check server-side. An `<img>` pointed at a non-image
 * object renders the browser's broken-image box; the `(error)` handler
 * below falls back to the initials circle instead of leaving a broken
 * image visible, which would read as a rendering bug rather than "this
 * upload wasn't a picture."
 */
@Component({
  selector: 'app-cache-card',
  imports: [FormsModule],
  template: `
    <div
      class="flex h-full flex-col gap-4 rounded-[var(--zerops-radius-card)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-card-bg)] p-6"
    >
      <header>
        <h2 class="font-[var(--zerops-font-head)] text-lg font-semibold text-[var(--zerops-on-surface)]">Cache</h2>
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Valkey · read-through session cache</p>
      </header>

      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-baseline gap-2">
          <span class="font-[var(--zerops-font-head)] text-2xl font-semibold text-[var(--zerops-on-surface)]" data-test="cache-hits">{{
            state.cacheCounters()?.hits ?? 0
          }}</span>
          <span class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">hits</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="font-[var(--zerops-font-head)] text-2xl font-semibold text-[var(--zerops-on-surface)]" data-test="cache-misses">{{
            state.cacheCounters()?.misses ?? 0
          }}</span>
          <span class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">misses</span>
        </div>
        @if (state.cacheBadge(); as badge) {
          <span
            data-test="cache-state-badge"
            class="ml-auto rounded-full px-3 py-1 font-[var(--zerops-font-mono)] text-xs font-medium"
            [class]="badge === 'HIT' ? 'bg-[var(--zerops-success)] text-[var(--zerops-primary-on)]' : 'bg-[var(--zerops-warning)] text-[var(--zerops-primary-on)]'"
          >
            {{ badge }}
          </span>
        } @else {
          <span
            data-test="cache-state-badge"
            class="ml-auto rounded-full bg-[var(--zerops-surface-high)] px-3 py-1 font-[var(--zerops-font-mono)] text-xs text-[var(--zerops-on-surface-muted)]"
          >
            —
          </span>
        }
      </div>

      @if (!auth.user()) {
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">
          Sign in from the Directory card to view and edit your profile.
        </p>
      } @else {
        <div class="flex items-center gap-3">
          @if (!avatarBroken() && state.profile()?.avatarUrl; as avatarUrl) {
            <img
              [src]="avatarUrl"
              alt="Avatar"
              (error)="onAvatarError()"
              class="h-12 w-12 rounded-full border border-[var(--zerops-outline-variant)] object-cover"
            />
          } @else {
            <div
              class="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--zerops-surface-high)] font-[var(--zerops-font-head)] text-sm text-[var(--zerops-on-surface-muted)]"
            >
              {{ initial() }}
            </div>
          }
          <button
            type="button"
            data-feature="cache-fetch"
            (click)="viewProfile()"
            [disabled]="fetching()"
            class="rounded-full bg-[var(--zerops-primary)] px-4 py-2 font-[var(--zerops-font-body)] text-sm font-medium text-[var(--zerops-primary-on)] disabled:opacity-60"
          >
            {{ fetching() ? 'Loading…' : 'View profile' }}
          </button>
        </div>

        @if (state.profile(); as profile) {
          <form class="flex flex-col gap-2" (ngSubmit)="save()">
            <label class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">
              Name
              <input
                name="editName"
                [(ngModel)]="editName"
                class="mt-1 w-full rounded-[var(--zerops-radius-input)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
              />
            </label>
            <label class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">
              Bio
              <textarea
                name="editBio"
                [(ngModel)]="editBio"
                rows="2"
                class="mt-1 w-full rounded-[var(--zerops-radius-input)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
              ></textarea>
            </label>
            <p class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">{{ profile.email }}</p>
            @if (localError()) {
              <p class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-error)]">{{ localError() }}</p>
            }
            <div class="flex items-center justify-between">
              <button
                type="submit"
                [disabled]="saving()"
                class="rounded-full bg-[var(--zerops-primary)] px-4 py-2 font-[var(--zerops-font-body)] text-sm font-medium text-[var(--zerops-primary-on)] disabled:opacity-60"
              >
                {{ saving() ? 'Saving…' : 'Save changes' }}
              </button>
              <button
                type="button"
                data-feature="delete-account"
                (click)="deleteAccount()"
                class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-error)] hover:underline"
              >
                Delete account
              </button>
            </div>
          </form>
        }
      }
    </div>
  `,
})
export class CacheCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected editName = '';
  protected editBio = '';
  protected readonly saving = signal(false);
  protected readonly fetching = signal(false);
  protected readonly localError = signal<string | null>(null);

  protected readonly initial = computed(() => {
    const source = this.state.profile()?.name ?? this.auth.user()?.name ?? '?';
    return source.charAt(0).toUpperCase();
  });

  protected readonly avatarBroken = signal(false);

  constructor() {
    // Keeps the edit form pre-filled with whatever was last fetched --
    // runs on the client only in practice, since `profile` never leaves
    // null during SSR (no eager fetch happens there).
    effect(() => {
      const profile = this.state.profile();
      if (profile) {
        this.editName = profile.name;
        this.editBio = profile.bio ?? '';
      }
      // A new avatarUrl deserves a fresh attempt at loading as an image,
      // even if a previous one failed.
      this.avatarBroken.set(false);
    });
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }

  async viewProfile(): Promise<void> {
    this.fetching.set(true);
    this.localError.set(null);
    try {
      await this.state.fetchProfile();
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not load profile');
    } finally {
      this.fetching.set(false);
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.localError.set(null);
    try {
      await this.state.saveProfile({ name: this.editName.trim(), bio: this.editBio.trim() });
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not save profile');
    } finally {
      this.saving.set(false);
    }
  }

  async deleteAccount(): Promise<void> {
    if (!confirm('Delete your account? This cannot be undone.')) return;
    try {
      await this.state.removeAccount();
      this.auth.clearLocalSession();
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Could not delete account');
    }
  }
}
