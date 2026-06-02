import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SatisfactionSurveyViewModel } from './satisfaction-survey-state.model';

/**
 * Présentation unifiée de l'enquête de satisfaction (tous rôles, tous états).
 * Structure de carte unique : badge, titre d'état, description, détails optionnels, CTA.
 */
@Component({
  selector: 'app-satisfaction-survey-state-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './satisfaction-survey-state-view.component.html',
  styleUrls: ['./satisfaction-survey.shared.css']
})
export class SatisfactionSurveyStateViewComponent {
  @Input({ required: true }) viewModel!: SatisfactionSurveyViewModel;
  @Input() formOpened = false;
  @Input() showInfoBlock = false;

  @Output() respond = new EventEmitter<void>();

  get cardModifier(): string {
    return `enq-state-card--${this.viewModel.visualState}`;
  }

  get badgeModifier(): string {
    switch (this.viewModel.visualState) {
      case 'active':
        return 'enq-state-badge--active';
      case 'closed':
        return 'enq-state-badge--closed';
      case 'not_open_yet':
        return 'enq-state-badge--pending';
      default:
        return 'enq-state-badge--unavailable';
    }
  }

  get iconName(): 'clipboard' | 'clock' | 'lock' | 'pause' | 'alert' {
    switch (this.viewModel.visualState) {
      case 'active':
        return 'clipboard';
      case 'not_open_yet':
        return 'clock';
      case 'closed':
        return 'lock';
      case 'unavailable':
        return this.viewModel.badgeLabel === 'Non configurée' ? 'alert' : 'pause';
      default:
        return 'pause';
    }
  }

  onRespond(): void {
    if (this.viewModel.canRespond) {
      this.respond.emit();
    }
  }
}
