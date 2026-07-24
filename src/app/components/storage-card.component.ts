import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { DashboardStateService } from '../services/dashboard-state.service';

/**
 * Storage card. `zerops_browser` has no file-input-selector primitive, so
 * this card ships two affordances against the same POST /api/storage/
 * upload endpoint: a real `<input type="file">` (native chrome hidden via
 * `sr-only`, projected through a styled label) for a human porter, and a
 * blob-fallback button that builds a tiny in-memory `Blob` for the
 * browser-walk to click. Both update the same object-count/recent-uploads
 * state on success, and (since every upload sets the caller's avatar
 * server-side) refresh the Cache card's avatar preview too.
 */
@Component({
  selector: 'app-storage-card',
  imports: [],
  template: `
    <div
      class="flex h-full flex-col gap-4 rounded-[var(--zerops-radius-card)] border border-[var(--zerops-outline-variant)] bg-[var(--zerops-card-bg)] p-6"
    >
      <header>
        <h2 class="font-[var(--zerops-font-head)] text-lg font-semibold text-[var(--zerops-on-surface)]">Storage</h2>
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Object storage · avatar uploads</p>
      </header>

      <div class="flex items-baseline gap-2">
        @if (state.storageLoad() === 'loading') {
          <span class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Loading…</span>
        } @else if (state.storageLoad() === 'error') {
          <span class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-error)]">Couldn't load storage state.</span>
        } @else {
          <span class="font-[var(--zerops-font-head)] text-2xl font-semibold text-[var(--zerops-on-surface)]" data-test="storage-objects">{{
            state.storage()?.objectCount ?? 0
          }}</span>
          <span class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-on-surface-muted)]">objects</span>
        }
      </div>

      @if (!auth.user()) {
        <p class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">Sign in to upload a file.</p>
      } @else {
        <div class="flex flex-col gap-2">
          <label
            class="flex cursor-pointer items-center justify-between rounded-[var(--zerops-radius-input)] border border-dashed border-[var(--zerops-outline-variant)] bg-[var(--zerops-bg)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
          >
            <span class="truncate">{{ selectedFileName() ?? 'No file chosen' }}</span>
            <span class="ml-2 shrink-0 rounded-full bg-[var(--zerops-surface-high)] px-3 py-1 text-xs text-[var(--zerops-on-surface-muted)]"
              >Choose file</span
            >
            <input type="file" data-feature="upload-file" accept="*" class="sr-only" (change)="onFileSelected($event)" />
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-feature="upload-selected"
              (click)="uploadSelected()"
              [disabled]="!selectedFile() || uploadingFile()"
              class="rounded-full bg-[var(--zerops-primary)] px-4 py-2 font-[var(--zerops-font-body)] text-sm font-medium text-[var(--zerops-primary-on)] disabled:opacity-60"
            >
              {{ uploadingFile() ? 'Uploading…' : 'Upload selected' }}
            </button>
            <button
              type="button"
              data-feature="upload"
              (click)="uploadBlob()"
              [disabled]="uploadingBlob()"
              class="rounded-full border border-[var(--zerops-primary)] px-4 py-2 font-[var(--zerops-font-body)] text-sm font-medium text-[var(--zerops-primary)] disabled:opacity-60"
            >
              {{ uploadingBlob() ? 'Uploading…' : 'Upload sample blob' }}
            </button>
          </div>
          @if (localError()) {
            <p class="font-[var(--zerops-font-body)] text-xs text-[var(--zerops-error)]">{{ localError() }}</p>
          }
        </div>
      }

      <div class="flex-1 overflow-hidden">
        <p
          class="mb-1 font-[var(--zerops-font-body)] text-xs font-medium tracking-wide text-[var(--zerops-on-surface-muted)] uppercase"
        >
          Recent uploads
        </p>
        <ul class="flex flex-col gap-1" aria-label="storage-recent-uploads">
          @for (obj of recentObjects(); track obj.key) {
            <li
              class="flex items-center justify-between gap-2 rounded-[var(--zerops-radius-input)] bg-[var(--zerops-surface-high)] px-3 py-2 font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface)]"
            >
              <span class="truncate">{{ obj.filename }}</span>
              <span class="shrink-0 font-[var(--zerops-font-mono)] text-xs text-[var(--zerops-on-surface-muted)]">{{
                formatSize(obj.size)
              }}</span>
            </li>
          } @empty {
            <li class="font-[var(--zerops-font-body)] text-sm text-[var(--zerops-on-surface-muted)]">No uploads yet.</li>
          }
        </ul>
      </div>
    </div>
  `,
})
export class StorageCardComponent {
  protected readonly auth = inject(AuthService);
  protected readonly state = inject(DashboardStateService);

  protected readonly recentObjects = computed(() => this.state.storage()?.recent.slice(0, 5) ?? []);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFileName = computed(() => this.selectedFile()?.name ?? null);
  protected readonly uploadingFile = signal(false);
  protected readonly uploadingBlob = signal(false);
  protected readonly localError = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  async uploadSelected(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;
    this.uploadingFile.set(true);
    this.localError.set(null);
    try {
      await this.state.uploadObject(file, file.name);
      this.selectedFile.set(null);
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      this.uploadingFile.set(false);
    }
  }

  async uploadBlob(): Promise<void> {
    this.uploadingBlob.set(true);
    this.localError.set(null);
    try {
      const text = `Uploaded from the dashboard demo at ${new Date().toISOString()}`;
      const blob = new Blob([text], { type: 'text/plain' });
      await this.state.uploadObject(blob, `dashboard-upload-${Date.now()}.txt`);
    } catch (err) {
      this.localError.set(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      this.uploadingBlob.set(false);
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
