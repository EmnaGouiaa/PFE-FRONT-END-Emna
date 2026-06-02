import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  StageSignatureActorView,
  stageSignatureStatusLabel,
  stageSignatureSummary,
} from './stage-document-signatures.util';

@Component({
  selector: 'app-stage-document-signatures-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stage-sig-block">
      <div class="stage-sig-block__title">{{ title }}</div>
      <div class="stage-sig-block__summary" *ngIf="showSummary">{{ summary }}</div>
      <p class="stage-sig-block__empty" *ngIf="!actors.length">État des signatures en cours de chargement…</p>
      <div class="stage-sig-block__grid" *ngIf="actors.length" [class.stage-sig-block__grid--compact]="compact">
        <div
          class="stage-sig-block__row"
          *ngFor="let actor of actors"
          [class.stage-sig-block__row--signed]="actor.signed"
          [class.stage-sig-block__row--pending]="!actor.signed"
        >
          <span class="stage-sig-block__label">{{ actor.label }}</span>
          <span class="stage-sig-block__status">{{ statusLabel(actor.signed) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stage-sig-block {
      margin: 10px 0 8px;
    }
    .stage-sig-block__title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 6px;
    }
    .stage-sig-block__summary {
      font-size: 0.78rem;
      color: #64748b;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .stage-sig-block__empty {
      font-size: 0.78rem;
      color: #64748b;
      margin: 0;
    }
    .stage-sig-block__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 8px;
    }
    .stage-sig-block__grid--compact {
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 6px;
    }
    .stage-sig-block__row {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 8px 10px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }
    .stage-sig-block__row--signed .stage-sig-block__status {
      color: #16a34a;
    }
    .stage-sig-block__row--pending .stage-sig-block__status {
      color: #dc2626;
    }
    .stage-sig-block__label {
      font-size: 0.73rem;
      color: #64748b;
    }
    .stage-sig-block__status {
      font-weight: 700;
      font-size: 0.8rem;
    }
  `],
})
export class StageDocumentSignaturesBlockComponent {
  @Input() title = 'État des signatures';
  @Input() actors: StageSignatureActorView[] = [];
  @Input() showSummary = true;
  @Input() compact = false;

  readonly statusLabel = stageSignatureStatusLabel;

  get summary(): string {
    return stageSignatureSummary(this.actors);
  }
}
