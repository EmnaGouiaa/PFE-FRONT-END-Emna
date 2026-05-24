import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Modale de capture de signature.
 *
 * Permet à l'utilisateur de fournir une image de signature en uploadant un fichier (PNG/JPG).
 * Affiche un aperçu, valide le type et la taille, puis émet l'image au format data URL base64
 * via la sortie {@code (confirmed)} quand l'utilisateur clique sur "Confirmer la signature".
 *
 * Usage :
 *   <app-signature-capture-modal
 *     *ngIf="showSignModal"
 *     [title]="'Signer le cahier de stage'"
 *     [subtitle]="'Téléchargez une photo claire de votre signature'"
 *     (confirmed)="onSignatureConfirmed($event)"
 *     (cancelled)="onSignatureCancelled()"
 *   ></app-signature-capture-modal>
 */
@Component({
  selector: 'app-signature-capture-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sig-modal-overlay" (click)="onCancel()">
      <div class="sig-modal" (click)="$event.stopPropagation()">
        <div class="sig-modal-header">
          <div>
            <h2>{{ title }}</h2>
            <p *ngIf="subtitle" class="sig-subtitle">{{ subtitle }}</p>
          </div>
          <button type="button" class="btn-close" (click)="onCancel()" [disabled]="submitting">×</button>
        </div>

        <div class="sig-modal-body">
          <div class="sig-instructions">
            <strong>📷 Image obligatoire</strong> — Téléchargez une photo de votre signature
            (PNG / JPG, ≤ 2 Mo). Cette preuve visuelle est exigée pour valider la signature.
          </div>

          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            (change)="onFileSelected($event)"
            [disabled]="submitting"
            class="sig-file-input"
          />

          <div *ngIf="errorMessage" class="sig-error">{{ errorMessage }}</div>

          <div *ngIf="previewDataUrl" class="sig-preview">
            <div class="sig-preview-label">Aperçu :</div>
            <img [src]="previewDataUrl" alt="Aperçu signature" />
          </div>
        </div>

        <div class="sig-modal-actions">
          <button type="button" class="btn btn-secondary" (click)="onCancel()" [disabled]="submitting">
            Annuler
          </button>
          <button
            type="button"
            class="btn btn-primary"
            (click)="onConfirm()"
            [disabled]="!previewDataUrl || submitting"
            [title]="!previewDataUrl ? 'Veuillez d\\'abord uploader une image' : 'Confirmer la signature'"
          >
            {{ submitting ? 'Signature en cours...' : 'Confirmer la signature' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sig-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    .sig-modal {
      background: #fff;
      border-radius: 18px;
      max-width: 500px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
    }
    .sig-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
    }
    .sig-modal-header h2 {
      margin: 0;
      font-size: 1.15rem;
      color: #1a3a6e;
    }
    .sig-subtitle {
      margin: 4px 0 0;
      font-size: 0.88rem;
      color: #64748b;
    }
    .btn-close {
      background: none;
      border: 0;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      color: #64748b;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .btn-close:hover:not([disabled]) { background: rgba(15, 23, 42, 0.06); color: #0f172a; }
    .sig-modal-body { padding: 20px 24px; }
    .sig-instructions {
      background: rgba(37, 150, 190, 0.08);
      border: 1px solid rgba(37, 150, 190, 0.20);
      border-radius: 12px;
      padding: 12px 14px;
      font-size: 0.88rem;
      line-height: 1.5;
      color: #1e40af;
      margin-bottom: 16px;
    }
    .sig-file-input { width: 100%; padding: 6px 0; font-size: 0.9rem; }
    .sig-error {
      color: #b91c1c;
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.20);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 0.88rem;
      margin-top: 12px;
    }
    .sig-preview {
      margin-top: 16px;
      padding: 14px;
      border: 1px dashed rgba(15, 23, 42, 0.18);
      border-radius: 12px;
      background: #f8fafc;
    }
    .sig-preview-label { font-size: 0.82rem; color: #64748b; margin-bottom: 8px; font-weight: 600; }
    .sig-preview img { max-width: 100%; max-height: 200px; border-radius: 8px; background: #fff; padding: 6px; border: 1px solid rgba(15, 23, 42, 0.08); }
    .sig-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px 20px;
      border-top: 1px solid rgba(15, 23, 42, 0.06);
    }
    .btn { padding: 8px 16px; border-radius: 10px; border: 0; font-weight: 700; cursor: pointer; font-size: 0.9rem; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, #1a3a6e, #2596be); color: #fff; }
    .btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
    .btn-secondary { background: rgba(15, 23, 42, 0.06); color: #1e293b; }
    .btn-secondary:hover:not(:disabled) { background: rgba(15, 23, 42, 0.10); }
  `]
})
export class SignatureCaptureModalComponent {
  @Input() title = 'Apposer une signature';
  @Input() subtitle = '';
  /** Marquer "true" pendant l'envoi pour griser les actions. */
  @Input() submitting = false;

  /** Emis quand l'utilisateur confirme : valeur = data URL base64 de l'image. */
  @Output() confirmed = new EventEmitter<string>();
  /** Emis quand l'utilisateur annule ou ferme la modale. */
  @Output() cancelled = new EventEmitter<void>();

  previewDataUrl: string | null = null;
  errorMessage = '';

  private static readonly MAX_BYTES = 2 * 1024 * 1024; // 2 Mo
  private static readonly ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  onFileSelected(event: Event): void {
    this.errorMessage = '';
    this.previewDataUrl = null;
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    if (!SignatureCaptureModalComponent.ALLOWED_TYPES.includes(file.type)) {
      this.errorMessage = 'Format non supporté. Utilisez PNG ou JPG.';
      input.value = '';
      return;
    }
    if (file.size > SignatureCaptureModalComponent.MAX_BYTES) {
      this.errorMessage = 'Fichier trop volumineux (maximum 2 Mo).';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
      this.errorMessage = 'Impossible de lire le fichier sélectionné.';
    };
    reader.onload = () => {
      const result = String(reader.result ?? '');
      if (!result.startsWith('data:image/')) {
        this.errorMessage = 'Image invalide.';
        return;
      }
      this.previewDataUrl = result;
    };
    reader.readAsDataURL(file);
  }

  onConfirm(): void {
    if (!this.previewDataUrl) {
      this.errorMessage = 'Veuillez uploader une image avant de confirmer.';
      return;
    }
    this.confirmed.emit(this.previewDataUrl);
  }

  onCancel(): void {
    if (this.submitting) return;
    this.cancelled.emit();
  }
}
