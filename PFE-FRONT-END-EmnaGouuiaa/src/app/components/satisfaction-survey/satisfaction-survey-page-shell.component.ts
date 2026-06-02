import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

/** En-tête commun à toutes les pages « Enquête de satisfaction ». */
@Component({
  selector: 'app-satisfaction-survey-page-shell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './satisfaction-survey-page-shell.component.html',
  styleUrls: ['./satisfaction-survey.shared.css']
})
export class SatisfactionSurveyPageShellComponent {
  @Input() isLoading = false;
  @Input() errorMessage = '';
  @Input() subtitle =
    "Consultez le statut de l'enquête et répondez au formulaire lorsque la période de participation est ouverte.";
  /** Layout élargi (ex. page entreprise avec réunions finales). */
  @Input() wide = false;

  @Output() refresh = new EventEmitter<void>();

  onRefresh(): void {
    this.refresh.emit();
  }
}
