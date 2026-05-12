import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SatisfactionSurveySectionComponent } from './satisfaction-survey-section.component';

@Component({
  selector: 'app-satisfaction-survey-page',
  standalone: true,
  imports: [CommonModule, SatisfactionSurveySectionComponent],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Enquêtes de satisfaction</h1>
          <p>Retrouvez ici les enquêtes liées à vos stages, remplissez celles en attente et consultez l’état des enquêtes déjà soumises.</p>
        </div>
      </header>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Mes enquêtes</h2>
            <div class="panel-subtitle">Le formulaire est géré directement dans l’application pour chaque rôle concerné.</div>
          </div>
        </div>

        <app-satisfaction-survey-section></app-satisfaction-survey-section>
      </section>
    </div>
  `,
  styleUrls: ['../company/company-shared.css']
})
export class SatisfactionSurveyPageComponent {}
