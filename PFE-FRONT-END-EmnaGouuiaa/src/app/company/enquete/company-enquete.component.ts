import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import { EnqueteSatisfaction, EnqueteService } from '../../services/enquete.service';
import { CompanyMeetingsService } from '../../services/company/company-meetings.service';
import { CompanyMeeting } from '../../services/company/company.models';

/** Réunion finale liée à un stage, avec lien vers le formulaire de satisfaction. */
interface FinaleMeetingRow {
  id: number;
  numReunion: string;
  date: string;
  stageTitre: string;
  stagiaireNom: string;
  stageId: number;
  note: number | null;
  urlFormSatisfaction: string;
  opened: boolean;
}

/** Groupe de réunions finales par stage. */
interface StageGroup {
  stageId: number;
  stageTitre: string;
  stagiaireNom: string;
  meetings: FinaleMeetingRow[];
}

/**
 * Section Enquête de satisfaction — Espace Responsable Entreprise.
 *
 * Affiche :
 *  1. L'enquête globale configurée par le responsable des stages (si active).
 *  2. Les formulaires de satisfaction attachés aux réunions finales des stages
 *     suivis par l'entreprise, groupés par stage.
 *
 * Sources de données :
 *  - GET /api/enquete/acteur       → enquête globale (accessible à tous les rôles)
 *  - CompanyContextService         → contexte entreprise
 *  - CompanyMeetingsService        → toutes les réunions → filtre FINALE + urlFormSatisfaction
 */
@Component({
  selector: 'app-company-enquete',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="company-page">

  <!-- ── En-tête ──────────────────────────────────────────────────────────── -->
  <header class="page-hero">
    <div>
      <h1>Enquête de satisfaction</h1>
      <p>Consultez l'enquête générale et les formulaires de satisfaction liés aux réunions finales de vos stages.</p>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn btn-secondary" (click)="loadAll()" [disabled]="isLoading">
        Actualiser
      </button>
    </div>
  </header>

  <!-- ── Alertes ───────────────────────────────────────────────────────────── -->
  <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
  <div *ngIf="isLoading" class="loading">Chargement des enquêtes...</div>

  <ng-container *ngIf="!isLoading">

    <!-- ── 1. Enquête globale ─────────────────────────────────────────────── -->
    <section class="recent-users-section" *ngIf="enquete">
      <div class="section-header">
        <h2>Enquête générale</h2>
        <span class="pill" [class.pill-active]="enquete.active && urlValide"
                            [class.pill-inactive]="!enquete.active">
          {{ enquete.active && urlValide ? 'Ouverte' : (enquete.active ? 'Active (lien absent)' : 'Inactive') }}
        </span>
      </div>

      <!-- Carte d'enquête globale -->
      <div class="enq-global-card" [class.enq-card-open]="enquete.active && urlValide"
                                    [class.enq-card-closed]="!enquete.active || !urlValide">
        <div class="enq-global-card__header">
          <div class="enq-global-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" width="24" height="24">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <path d="M9 5a3 3 0 0 1 6 0"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div class="enq-global-title">{{ enquete.titre }}</div>
            <div class="enq-global-desc">{{ enquete.description }}</div>
          </div>
        </div>

        <!-- CTA si enquête active et URL valide -->
        <div class="enq-global-card__footer" *ngIf="enquete.active && urlValide">
          <button type="button" class="btn btn-primary" (click)="ouvrirEnqueteGlobale()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="16" height="16" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Répondre à l'enquête
          </button>
          <span class="enq-hint">S'ouvre dans un nouvel onglet — votre session reste active.</span>
          <div *ngIf="globalFormOpened" class="enq-opened-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="15" height="15" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Formulaire ouvert
          </div>
        </div>

        <!-- Notice enquête inactive -->
        <div class="enq-notice enq-notice--neutral" *ngIf="!enquete.active">
          L'enquête de satisfaction est temporairement désactivée. Elle sera disponible prochainement.
        </div>

        <!-- Notice URL absente (E1) -->
        <div class="enq-notice enq-notice--warn" *ngIf="enquete.active && !urlValide">
          E1 — Le formulaire externe n'est pas encore configuré. Contactez le responsable des stages.
        </div>
      </div>
    </section>

    <!-- ── 2. Enquêtes par réunion finale ────────────────────────────────── -->
    <section class="recent-users-section" style="margin-top: 24px;">
      <div class="section-header">
        <h2>Enquêtes par réunion finale</h2>
        <span class="pill">{{ totalFinaleMeetings }} réunion(s)</span>
      </div>

      <!-- Aucune réunion finale -->
      <div class="empty-card" *ngIf="stageGroups.length === 0">
        Aucune réunion finale avec formulaire de satisfaction disponible pour le moment.
      </div>

      <!-- Groupes par stage -->
      <div class="doc-internship-group" *ngFor="let group of stageGroups">
        <div class="doc-internship-header">
          <div class="doc-student-avatar">
            {{ (group.stagiaireNom || 'ST').slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <div class="doc-internship-name">{{ group.stagiaireNom || 'Stagiaire' }}</div>
            <div class="doc-internship-sub">{{ group.stageTitre || 'Stage sans titre' }}</div>
          </div>
        </div>

        <!-- Mini-cards réunions finales -->
        <div class="doc-cards-row">
          <div class="doc-mini-card" *ngFor="let meeting of group.meetings">

            <div class="doc-card-eyebrow">Réunion finale</div>

            <div class="doc-card-top">
              <div class="doc-card-title">Réunion {{ meeting.numReunion || '#' + meeting.id }}</div>
              <span class="status-pill" [class.active]="meeting.urlFormSatisfaction">
                {{ meeting.urlFormSatisfaction ? 'Disponible' : 'Sans lien' }}
              </span>
            </div>

            <div class="doc-card-short-status">
              {{ meeting.urlFormSatisfaction
                  ? 'Formulaire de satisfaction disponible'
                  : 'Aucun formulaire lié à cette réunion' }}
            </div>

            <div class="doc-card-meta">
              <div class="doc-card-meta-item">
                <span class="label">Date</span>
                <strong>{{ formatDate(meeting.date) }}</strong>
              </div>
              <div class="doc-card-meta-item">
                <span class="label">Note</span>
                <strong>{{ meeting.note !== null ? meeting.note + '/20' : '—' }}</strong>
              </div>
            </div>

            <div class="doc-card-actions">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="!meeting.urlFormSatisfaction"
                (click)="ouvrirFormulaireMeeting(meeting)"
                [title]="meeting.urlFormSatisfaction ? 'Ouvrir le formulaire de satisfaction' : 'Aucun formulaire disponible'"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="13" height="13" aria-hidden="true" style="flex-shrink:0">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                {{ meeting.opened ? 'Remplir à nouveau' : 'Répondre' }}
              </button>
              <span *ngIf="meeting.opened" class="status-pill active" style="font-size:0.75rem">
                ✓ Ouvert
              </span>
            </div>

          </div>
        </div>
      </div>
    </section>

    <!-- ── 3. Informations ───────────────────────────────────────────────── -->
    <section class="recent-users-section" style="margin-top: 24px;">
      <div class="section-header">
        <h2>À propos de cette section</h2>
      </div>
      <div class="enq-info-panel">
        <ul class="enq-info-list">
          <li>L'enquête générale est configurée par le responsable des stages et commune à tous les acteurs.</li>
          <li>Les formulaires de satisfaction par réunion finale sont générés automatiquement à la création de chaque réunion finale.</li>
          <li>L'ouverture d'un formulaire externe ne vous déconnecte pas de l'application.</li>
          <li>Vos réponses sont enregistrées dans le formulaire externe lié à l'enquête.</li>
        </ul>
      </div>
    </section>

  </ng-container>
</div>
  `,
  styleUrls: ['../company-shared.css'],
  styles: [`
    /* ── Carte enquête globale ───────────────────────────────────────── */
    .enq-global-card {
      border-radius: 18px;
      border: 1px solid rgba(29, 78, 216, 0.12);
      background: linear-gradient(135deg, rgba(239, 246, 255, 0.95) 0%, rgba(255, 255, 255, 1) 100%);
      box-shadow: 0 4px 16px rgba(29, 78, 216, 0.07);
      padding: 22px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 680px;
    }

    .enq-card-open {
      border-color: rgba(14, 116, 144, 0.28);
      background: linear-gradient(135deg, #f0f9ff 0%, #f8fcff 100%);
    }

    .enq-card-closed {
      border-color: rgba(148, 163, 184, 0.22);
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .enq-global-card__header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .enq-global-icon {
      flex-shrink: 0;
      width: 46px;
      height: 46px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(29, 78, 216, 0.12), rgba(37, 150, 190, 0.18));
      color: #1d4ed8;
    }

    .enq-global-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .enq-global-desc {
      font-size: 0.88rem;
      color: #475569;
      line-height: 1.55;
    }

    .enq-global-card__footer {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 14px;
      border-top: 1px solid rgba(29, 78, 216, 0.08);
    }

    .enq-hint {
      font-size: 0.81rem;
      color: #64748b;
    }

    .enq-opened-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(22, 163, 74, 0.1);
      border: 1px solid rgba(22, 163, 74, 0.22);
      color: #15803d;
      font-size: 0.78rem;
      font-weight: 700;
    }

    /* ── Notice ──────────────────────────────────────────────────────── */
    .enq-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 0.87rem;
      font-weight: 600;
      line-height: 1.5;
    }

    .enq-notice--neutral {
      background: rgba(148, 163, 184, 0.1);
      border: 1px solid rgba(148, 163, 184, 0.2);
      color: #475569;
    }

    .enq-notice--warn {
      background: rgba(234, 179, 8, 0.08);
      border: 1px solid rgba(234, 179, 8, 0.22);
      color: #854d0e;
    }

    /* ── Panneau info ────────────────────────────────────────────────── */
    .enq-info-panel {
      padding: 18px 22px;
      border-radius: 16px;
      background: rgba(241, 245, 249, 0.85);
      border: 1px solid rgba(15, 23, 42, 0.07);
    }

    .enq-info-list {
      margin: 0;
      padding-left: 1.25rem;
      display: grid;
      gap: 6px;
    }

    .enq-info-list li {
      color: #64748b;
      font-size: 0.87rem;
      line-height: 1.5;
    }

    /* ── Pill couleur ────────────────────────────────────────────────── */
    .pill-active  { background: rgba(14, 116, 144, 0.12); color: #0e7490; }
    .pill-inactive { background: rgba(220, 38, 38, 0.1);  color: #dc2626; }
  `]
})
export class CompanyEnquetePageComponent implements OnInit {

  enquete: EnqueteSatisfaction | null = null;
  stageGroups: StageGroup[] = [];

  isLoading = false;
  errorMessage = '';
  globalFormOpened = false;

  constructor(
    private enqueteService: EnqueteService,
    private companyMeetingsService: CompanyMeetingsService
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  // ── Computed ─────────────────────────────────────────────────────────────

  get urlValide(): boolean {
    if (!this.enquete?.active) return false;
    const url = (this.enquete.urlFormulaire ?? '').trim();
    if (!url) return false;
    try {
      const p = new URL(url);
      return p.protocol === 'http:' || p.protocol === 'https:';
    } catch {
      return false;
    }
  }

  get totalFinaleMeetings(): number {
    return this.stageGroups.reduce((acc, g) => acc + g.meetings.length, 0);
  }

  // ── Chargement ───────────────────────────────────────────────────────────

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.globalFormOpened = false;

    forkJoin({
      enquete: this.enqueteService.getEnqueteActeur().pipe(catchError(() => of(null))),
      allMeetings: this.companyMeetingsService.listForCurrentCompany().pipe(
        timeout(15000),
        catchError(() => of([] as CompanyMeeting[]))
      )
    }).subscribe({
      next: ({ enquete, allMeetings }) => {
        this.enquete = enquete;
        this.buildStageGroups(allMeetings);
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = this.describeError(err, 'Impossible de charger les enquêtes.');
        this.isLoading = false;
      }
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  ouvrirEnqueteGlobale(): void {
    if (!this.urlValide) return;
    window.open(this.enquete!.urlFormulaire!, '_blank', 'noopener,noreferrer');
    this.globalFormOpened = true;
  }

  ouvrirFormulaireMeeting(meeting: FinaleMeetingRow): void {
    if (!meeting.urlFormSatisfaction) return;
    window.open(meeting.urlFormSatisfaction, '_blank', 'noopener,noreferrer');
    meeting.opened = true;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  formatDate(value: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private buildStageGroups(allMeetings: CompanyMeeting[]): void {
    // Filtre : réunions finales uniquement, avec un lien de satisfaction
    const finaleMeetings = allMeetings.filter(
      (m) => m.source === 'FINALE' && m.urlFormSatisfaction?.trim()
    );

    // Groupe par stageId
    const map = new Map<number, StageGroup>();
    for (const m of finaleMeetings) {
      if (!map.has(m.stageId)) {
        map.set(m.stageId, {
          stageId: m.stageId,
          stageTitre: m.stageTitre || 'Stage sans titre',
          stagiaireNom: m.stagiaireNom || 'Stagiaire',
          meetings: []
        });
      }
      map.get(m.stageId)!.meetings.push({
        id: m.id,
        numReunion: m.numReunion,
        date: m.date,
        stageTitre: m.stageTitre,
        stagiaireNom: m.stagiaireNom,
        stageId: m.stageId,
        note: m.note,
        urlFormSatisfaction: m.urlFormSatisfaction,
        opened: false
      });
    }

    // Tri des groupes par nom de stagiaire, réunions par date
    this.stageGroups = Array.from(map.values()).sort((a, b) =>
      a.stagiaireNom.localeCompare(b.stagiaireNom, 'fr')
    );

    for (const group of this.stageGroups) {
      group.meetings.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
  }

  private describeError(err: any, fallback: string): string {
    if (err?.status === 401 || err?.status === 403)
      return 'Session expirée ou accès non autorisé. Veuillez vous reconnecter.';
    if (typeof err?.error?.message === 'string' && err.error.message.trim())
      return err.error.message;
    return fallback;
  }
}
