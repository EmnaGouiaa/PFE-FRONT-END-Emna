import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  STAGE_DOCUMENT_SIGNED_STATUS_LABEL,
  StageDocumentSignButtonContext,
  getStageDocumentSignButtonLabel,
  getStageDocumentSignButtonTooltip,
  getStageDocumentSignedStatusTooltip,
  isStageDocumentSignButtonDisabled,
  shouldShowConventionInitializeButton,
  shouldShowStageDocumentSignButton,
  shouldShowStageDocumentSignedStatus,
} from './stage-document-sign-button.util';

/**
 * Affiche soit le bouton « Signer » (signataire attendu, pas encore signé),
 * soit le statut « Signé », soit rien (profil non signataire).
 */
@Component({
  selector: 'app-stage-document-sign-action',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      *ngIf="showSignedStatus"
      class="stage-doc-sign-status"
      [title]="signedTooltip"
    >{{ signedLabel }}</span>
    <button
      *ngIf="showInitializeButton"
      type="button"
      [ngClass]="buttonClass"
      (click)="initialize.emit()"
      [disabled]="!!context.isActing"
      title="Créer la convention de stage pour ce stage"
    >Initialiser la convention</button>
    <button
      *ngIf="showSignButton"
      type="button"
      [ngClass]="buttonClass"
      (click)="sign.emit()"
      [disabled]="disabled"
      [title]="tooltip"
    >{{ label }}</button>
  `,
  styles: [`
    .stage-doc-sign-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 31px;
      padding: 0 12px;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #16a34a;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      white-space: nowrap;
    }
  `],
})
export class StageDocumentSignActionComponent {
  @Input({ required: true }) context!: StageDocumentSignButtonContext;
  @Input() buttonClass = 'btn btn-primary btn-sm';
  @Input() signedLabel = STAGE_DOCUMENT_SIGNED_STATUS_LABEL;
  @Output() sign = new EventEmitter<void>();
  @Output() initialize = new EventEmitter<void>();

  get showInitializeButton(): boolean {
    return shouldShowConventionInitializeButton(this.context);
  }

  get showSignedStatus(): boolean {
    return shouldShowStageDocumentSignedStatus(this.context);
  }

  get showSignButton(): boolean {
    return !this.showInitializeButton && shouldShowStageDocumentSignButton(this.context);
  }

  get disabled(): boolean {
    return isStageDocumentSignButtonDisabled(this.context);
  }

  get label(): string {
    return getStageDocumentSignButtonLabel(this.context);
  }

  get tooltip(): string {
    return getStageDocumentSignButtonTooltip(this.context);
  }

  get signedTooltip(): string {
    return getStageDocumentSignedStatusTooltip(this.context);
  }
}
