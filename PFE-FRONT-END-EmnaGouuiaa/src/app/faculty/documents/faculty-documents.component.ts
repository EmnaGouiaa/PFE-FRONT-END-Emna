import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { FacultyPortalService } from '../../services/faculty/faculty-portal.service';
import {
  FacultyEvaluation,
  FacultyInternship,
  FacultyMeeting,
  FacultyReport,
  FacultyStageDocumentStatus,
  FacultyStageDocumentsOverview
} from '../../services/faculty/faculty.models';
import { PdfWindowService } from '../../services/pdf-window.service';

type DocumentType = 'convention' | 'fiche-evaluation' | 'cahier-stage';

interface DocModalEntry {
  stageId: number;
  type: DocumentType;
  status: FacultyStageDocumentStatus;
}

@Component({
  selector: 'app-faculty-documents-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="company-page">
      <header class="page-hero">
        <div>
          <h1>Documents de stage</h1>
          <p>Supervisez la convention, la fiche d'evaluation et le cahier de stage depuis une vue unifiee par stage.</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn btn-secondary" (click)="loadDocuments()" [disabled]="isLoading">Actualiser</button>
        </div>
      </header>

      <div *ngIf="errorMessage" class="alert alert-error">{{ errorMessage }}</div>
      <div *ngIf="successMessage" class="alert alert-success">{{ successMessage }}</div>

      <section class="stats-grid">
        <article class="stat-card">
          <div class="stat-label">Stages suivis</div>
          <span class="stat-value">{{ stageDocuments.length }}</span>
          <div class="stat-subtitle">Tous les stages visibles par le responsable universitaire</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Documents disponibles</div>
          <span class="stat-value">{{ availableDocumentsCount }}</span>
          <div class="stat-subtitle">Documents autorises deja disponibles</div>
        </article>
        <article class="stat-card">
          <div class="stat-label">Documents manquants</div>
          <span class="stat-value">{{ missingDocumentsCount }}</span>
          <div class="stat-subtitle">Elements encore a generer ou non encore crees</div>
        </article>
      </section>

      <div *ngIf="isLoading" class="loading">Chargement des documents de stage...</div>

      <section *ngIf="!isLoading && stageDocuments.length === 0" class="panel">
        <div class="empty-card">Aucun stage n est actuellement disponible pour afficher ses documents.</div>
      </section>

      <section class="documents-grid" *ngIf="!isLoading && stageDocuments.length > 0">
        <article class="stage-card" *ngFor="let item of stageDocuments">

          <div class="stage-card__header">
            <div style="min-width:0">
              <h2>{{ item.stageTitre || ('Stage #' + item.stageId) }}</h2>
              <div class="stage-card__meta">{{ item.stagiaireNom || 'Stagiaire non renseigne' }} · {{ item.entrepriseNom || 'Entreprise non renseignee' }}</div>
            </div>
            <span class="status-pill" [ngClass]="item.stageStatut ? 'status-positive' : 'status-neutral'">
              {{ item.stageStatut || 'Statut inconnu' }}
            </span>
          </div>

          <div class="stage-summary">
            <div class="detail-item">
              <span class="label">Encadrant academique</span>
              <span class="value">{{ item.encadrantAcademiqueNom || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Encadrant professionnel</span>
              <span class="value">{{ item.encadrantProfessionnelNom || '-' }}</span>
            </div>
          </div>

          <div class="doc-cards-row">
            <article class="doc-mini-card" *ngFor="let doc of getDocumentEntries(item)">

              <div class="doc-card-eyebrow">{{ getDocumentTypeLabel(doc.type) }}</div>

              <div class="doc-card-top">
                <div class="doc-card-title">{{ doc.status.libelle }}</div>
                <span class="status-pill" [ngClass]="getStatusBadgeClass(doc.status)">
                  {{ getStatusLabel(doc.status) }}
                </span>
              </div>

              <div class="doc-card-short-status">{{ getDocumentShortStatus(item, doc.type, doc.status) }}</div>

              <div class="doc-card-meta">
                <div class="doc-card-meta-item">
                  <span class="label">Statut</span>
                  <strong>{{ getStatusLabel(doc.status) }}</strong>
                </div>
                <div class="doc-card-meta-item" *ngIf="doc.type === 'convention'">
                  <span class="label">Année univ.</span>
                  <strong>{{ getAnneeUniversitaire(item.dateDebut) }}</strong>
                </div>
                <div class="doc-card-meta-item">
                  <span class="label">Accès</span>
                  <strong>{{ canAccessPdf(item, doc.type, doc.status) ? 'Autorisé' : 'En attente' }}</strong>
                </div>
              </div>

              <div class="doc-card-actions">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="openDocDetails(item.stageId, doc.type, doc.status)"
                >
                  Détails
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="openDocument(item.stageId, doc.type, doc.status.libelle)"
                  [disabled]="!canAccessPdf(item, doc.type, doc.status) || isActionPending(item.stageId, doc.type)"
                  [title]="!canAccessPdf(item, doc.type, doc.status) ? getPdfBlockedTooltip(item, doc.type, doc.status) : 'Ouvrir le PDF'"
                >
                  Voir PDF
                </button>
                <button
                  *ngIf="doc.type === 'convention'"
                  type="button"
                  class="btn btn-sm"
                  [class.btn-primary]="!doc.status.signeeParResponsableUniversitaire"
                  [class.btn-secondary]="!!doc.status.signeeParResponsableUniversitaire"
                  (click)="signConvention(item.stageId, doc.status)"
                  [disabled]="!doc.status.documentId || doc.status.signeeParResponsableUniversitaire || isActionPending(item.stageId, doc.type)"
                >
                  {{ doc.status.signeeParResponsableUniversitaire ? '✓ Signé' : 'Signer' }}
                </button>
              </div>

            </article>
          </div>

        </article>
      </section>

      <!-- Document detail modal -->
      <div class="modal-overlay" *ngIf="showDocModal && selectedDocModal" (click)="closeDocDetails()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div style="min-width:0">
              <h2 style="margin:0;font-size:1.15rem">{{ getDocumentTypeLabel(selectedDocModal.type) }}</h2>
              <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.92rem">{{ selectedDocModal.status.libelle }}</p>
            </div>
            <button type="button" class="btn-close" (click)="closeDocDetails()">x</button>
          </div>

          <div class="form">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Statut</span>
                <span class="value">
                  <span class="status-pill" [ngClass]="getStatusBadgeClass(selectedDocModal.status)">{{ getStatusLabel(selectedDocModal.status) }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Acces PDF</span>
                <span class="value">{{ selectedDocModal.status.disponible ? 'Disponible' : 'Non disponible' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Document genere</span>
                <span class="value">{{ selectedDocModal.status.genere ? 'Oui' : 'Non' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Generation autorisee</span>
                <span class="value">{{ selectedDocModal.status.generationAutorisee ? 'Oui' : 'Non' }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedDocModal.status.raisonAbsence">
                <span class="label">Raison de l'indisponibilite</span>
                <span class="value" style="white-space:pre-wrap;line-height:1.6;color:#92400e">{{ selectedDocModal.status.raisonAbsence }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="!selectedDocModal.status.disponible">
                <span class="label">Conditions d'acces</span>
                <span class="value">{{ getDocumentDescription(selectedDocModal.type, selectedDocModal.status) }}</span>
              </div>
              <!-- Convention signing details -->
              <div class="detail-item full-width" *ngIf="selectedDocModal.type === 'convention'">
                <span class="label">Signature responsable universitaire</span>
                <span class="value">
                  <span class="status-pill" [ngClass]="selectedDocModal.status.signeeParResponsableUniversitaire ? 'status-positive' : 'status-warning'">
                    {{ selectedDocModal.status.signeeParResponsableUniversitaire ? 'Signee' : 'En attente de signature' }}
                  </span>
                  <span *ngIf="selectedDocModal.status.dateSignatureResponsableUniversitaire" style="margin-left:0.5rem;font-size:0.9rem;color:#64748b">
                    le {{ selectedDocModal.status.dateSignatureResponsableUniversitaire }}
                  </span>
                </span>
              </div>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="closeDocDetails()">Fermer</button>
              <button
                type="button"
                class="btn btn-secondary"
                (click)="openDocument(selectedDocModal.stageId, selectedDocModal.type, selectedDocModal.status.libelle)"
                [disabled]="!canAccessPdfModal() || isActionPending(selectedDocModal.stageId, selectedDocModal.type)"
                [title]="!canAccessPdfModal() ? getPdfBlockedTooltipModal() : 'Ouvrir le PDF'"
              >
                Voir PDF
              </button>
              <button
                *ngIf="selectedDocModal.type === 'convention'"
                type="button"
                class="btn btn-secondary"
                (click)="signConvention(selectedDocModal.stageId, selectedDocModal.status)"
                [disabled]="!selectedDocModal.status.documentId || selectedDocModal.status.signeeParResponsableUniversitaire || isActionPending(selectedDocModal.stageId, selectedDocModal.type)"
              >
                {{ selectedDocModal.status.signeeParResponsableUniversitaire ? 'Convention deja signee' : 'Signer la convention' }}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .documents-grid {
      display: grid;
      gap: 1.25rem;
    }

    .stage-card {
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 24px;
      padding: 1.25rem;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
      display: grid;
      gap: 1rem;
      /* layout wrapper — doc cards viennent de company-shared.css */
    }

    .stage-card__header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .stage-card__header h2 {
      margin: 0;
      font-size: 1.1rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stage-card__meta {
      margin-top: 0.25rem;
      color: #64748b;
      font-size: 0.9rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stage-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    @media (max-width: 768px) {
      .stage-card__header { flex-direction: column; }
    }
  `],
  styleUrls: ['../../company/company-shared.css', '../faculty-shared.css']
})
export class FacultyDocumentsPageComponent implements OnInit {
  stageDocuments: FacultyStageDocumentsOverview[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  pendingActionKey = '';
  selectedDocModal: DocModalEntry | null = null;
  showDocModal = false;
  private evaluationsByStageId = new Map<number, FacultyEvaluation>();
  private reportsByStageId = new Map<number, FacultyReport>();
  private internshipsByStageId = new Map<number, FacultyInternship>();

  constructor(
    private facultyPortalService: FacultyPortalService,
    private pdfWindowService: PdfWindowService
  ) {}

  get availableDocumentsCount(): number {
    return this.stageDocuments.reduce(
      (total, item) => total + this.getDocumentEntries(item).filter((doc) => doc.status.disponible).length,
      0
    );
  }

  get missingDocumentsCount(): number {
    return this.stageDocuments.reduce(
      (total, item) => total + this.getDocumentEntries(item).filter((doc) => !doc.status.disponible).length,
      0
    );
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.facultyPortalService.listStageDocuments().subscribe({
      next: (items) => {
        this.stageDocuments = items;
        // Refresh modal reference if open
        if (this.selectedDocModal) {
          const item = items.find((i) => i.stageId === this.selectedDocModal!.stageId);
          if (item) {
            const entry = this.getDocumentEntries(item).find((e) => e.type === this.selectedDocModal!.type);
            if (entry) this.selectedDocModal = { stageId: item.stageId, type: entry.type, status: entry.status };
          }
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les documents de stage.');
        this.isLoading = false;
      }
    });
  }

  getDocumentEntries(item: FacultyStageDocumentsOverview): Array<{ type: DocumentType; status: FacultyStageDocumentStatus }> {
    return [
      { type: 'convention', status: item.convention },
      { type: 'fiche-evaluation', status: item.ficheEvaluation },
      { type: 'cahier-stage', status: item.cahierStage }
    ].filter((entry): entry is { type: DocumentType; status: FacultyStageDocumentStatus } => entry.status !== null);
  }

  openDocDetails(stageId: number, type: DocumentType, status: FacultyStageDocumentStatus): void {
    this.selectedDocModal = { stageId, type, status };
    this.showDocModal = true;
  }

  closeDocDetails(): void {
    this.showDocModal = false;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showDocModal) this.closeDocDetails();
  }

  // La génération du PDF est désormais entièrement automatique : le backend produit
  // le document dès que toutes les signatures requises sont présentes. Le responsable
  // des stages n'a plus d'action manuelle de génération.

  openDocument(stageId: number, type: DocumentType, label: string): void {
    if (type === 'fiche-evaluation') {
      this.openEvaluationPdf(stageId);
      return;
    }
    if (type === 'cahier-stage') {
      this.openCahierPdf(stageId);
      return;
    }
    this.pendingActionKey = this.buildActionKey(stageId, type);
    this.errorMessage = '';
    this.successMessage = '';
    const pdfWindow = this.pdfWindowService.openPlaceholder(label);

    this.facultyPortalService.downloadStageDocumentPdf(stageId, type).subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(pdfWindow, blob, { title: label });
        this.pendingActionKey = '';
      },
      error: (error) => {
        pdfWindow?.close();
        this.errorMessage = this.extractErrorMessage(error, `Impossible d'ouvrir le PDF ${label}.`);
        this.pendingActionKey = '';
      }
    });
  }

  private openCahierPdf(stageId: number): void {
    const overview = this.stageDocuments.find((i) => i.stageId === stageId);
    if (!overview) {
      this.errorMessage = 'Données du stage introuvables.';
      return;
    }
    // Ouvrir la fenêtre MAINTENANT (geste utilisateur synchrone) pour éviter le blocage popup.
    // La fenêtre est transmise à travers les deux niveaux de forkJoin imbriqués.
    const win = window.open('', '_blank');
    if (!win) {
      this.errorMessage = "Impossible d'ouvrir la fenêtre PDF. Autorisez les popups pour ce site.";
      return;
    }
    win.document.write('<html><body style="font-family:sans-serif;padding:40px;color:#1a3a6e"><p>Chargement du cahier de stage…</p></body></html>');
    win.document.close();

    this.pendingActionKey = this.buildActionKey(stageId, 'cahier-stage');
    this.errorMessage = '';

    forkJoin({
      internship: this.internshipsByStageId.has(stageId)
        ? of(this.internshipsByStageId.get(stageId) as FacultyInternship)
        : this.facultyPortalService.getInternshipById(stageId).pipe(catchError(() => of(null as FacultyInternship | null))),
      report: this.reportsByStageId.has(stageId)
        ? of(this.reportsByStageId.get(stageId) as FacultyReport)
        : this.facultyPortalService.getReportByStage(stageId).pipe(catchError(() => of(null as FacultyReport | null))),
      meetings:   this.facultyPortalService.listMeetingsForStage(stageId),
      trello:     this.facultyPortalService.getStageProgressSummary(stageId).pipe(catchError(() => of(null))),
      absences:   this.facultyPortalService.getAbsencesForStage(stageId)
    }).pipe(timeout(20000)).subscribe({
      next: ({ internship, report, meetings, trello, absences }) => {
        if (internship) this.internshipsByStageId.set(stageId, internship);
        if (report) this.reportsByStageId.set(stageId, report);

        forkJoin({
          sigStagiaire:   this.facultyPortalService.getUserSignature(internship?.student?.id ?? null),
          sigEncAca:      this.facultyPortalService.getUserSignature(internship?.academicSupervisor?.id ?? null),
          sigEncPro:      this.facultyPortalService.getUserSignature(internship?.professionalSupervisor?.id ?? null),
          sigEntreprise:  this.facultyPortalService.getUserSignature(internship?.companySupervisor?.id ?? null)
        }).subscribe({
          next: ({ sigStagiaire, sigEncAca, sigEncPro, sigEntreprise }) => {
            this.pendingActionKey = '';
            win.document.open();
            win.document.write(this.buildCahierHtml(overview, internship, report, meetings, trello, absences, {
              stagiaire: sigStagiaire,
              encadrantAcademique: sigEncAca,
              encadrantProfessionnel: sigEncPro,
              responsableEntreprise: sigEntreprise
            }));
            win.document.close();
            win.focus();
            setTimeout(() => { try { win.print(); } catch (_) {} }, 700);
          },
          error: () => {
            this.pendingActionKey = '';
            win.close();
            this.errorMessage = 'Impossible de charger les signatures du cahier de stage.';
          }
        });
      },
      error: () => {
        this.pendingActionKey = '';
        win.close();
        this.errorMessage = 'Impossible de charger les données du cahier de stage.';
      }
    });
  }

  private buildCahierHtml(
    overview: FacultyStageDocumentsOverview,
    internship: FacultyInternship | null,
    report: FacultyReport | null,
    meetings: FacultyMeeting[],
    trello: Record<string, unknown> | null,
    absences: { dateAbsence: string; nbAbsence: number; justification: string; statut: string }[],
    sigs: { stagiaire: string; encadrantAcademique: string; encadrantProfessionnel: string; responsableEntreprise: string }
  ): string {
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
    const esc = (s: string) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const val = (s: string) => esc(s || '—');

    const weeklyMeetings = meetings.filter((m) => m.source === 'HEBDOMADAIRE');
    const finalMeeting = meetings.find((m) => m.source === 'FINALE');

    const meetingRows = weeklyMeetings.map((m, i) => `
      <tr>
        <td class="tc">${i + 1}</td>
        <td>${fmt(m.date)} ${m.heure ? m.heure.slice(0,5) : ''}</td>
        <td>${m.observation ? val(m.observation) : '<span class="non-renseigne">Non renseigné</span>'}</td>
        <td>${m.compteRendu ? val(m.compteRendu) : '<span class="non-renseigne">Non renseigné</span>'}</td>
        <td class="tc">${m.note != null ? m.note : '<span class="non-renseigne">—</span>'}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="tc non-renseigne">Aucune réunion hebdomadaire — Non renseigné</td></tr>';

    const absenceRows = absences.length
      ? absences.map((a) => `
          <tr>
            <td>${fmt(a.dateAbsence)}</td>
            <td class="tc">${a.nbAbsence}</td>
            <td>${a.justification ? val(a.justification) : '<span class="non-renseigne">Non renseigné</span>'}</td>
            <td><span class="badge-status">${val(a.statut)}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="tc non-renseigne">Aucune absence enregistrée</td></tr>';

    const totalTaches = Number((trello as any)?.nombreTotalTaches ?? 0);
    const terminees = Number((trello as any)?.nombreTachesTerminees ?? 0);
    const enCours = Number((trello as any)?.nombreTachesEnCours ?? 0);
    const aFaire = Number((trello as any)?.nombreTachesAFaire ?? 0);
    const trelloSection = trello
      ? `<h2>Tâches Trello</h2>
      <div class="trello-summary">
        <div class="trello-stat"><div class="ts-label">Total</div><div class="ts-value">${totalTaches}</div></div>
        <div class="trello-stat done"><div class="ts-label">Terminées</div><div class="ts-value">${terminees}</div></div>
        <div class="trello-stat doing"><div class="ts-label">En cours</div><div class="ts-value">${enCours}</div></div>
        <div class="trello-stat todo"><div class="ts-label">À faire</div><div class="ts-value">${aFaire}</div></div>
      </div>`
      : `<h2>Tâches Trello</h2><div class="non-renseigne-box">Aucune donnée Trello disponible — Non renseigné</div>`;

    const sigBox = (label: string, name: string, signed: boolean, imgSrc: string, date: string) => `
      <div class="sig-box">
        <div class="sig-label">${label}</div>
        <div class="sig-name">${val(name)}</div>
        ${imgSrc ? `<img class="sig-img" src="${imgSrc}" alt="Signature ${esc(label)}">` : ''}
        ${signed
          ? `<div class="sig-date">${date ? 'Signé le ' + fmt(date) : ''}</div><div class="sig-stamp">✓ Signé</div>`
          : '<div class="sig-none">Non signé — Non renseigné</div>'}
      </div>`;

    const allSigned = report ? (report.signeeEncAcad && report.signeeEncPro && report.signeeRespEntreprise && report.signeeStagiaire) : false;
    const dateSignature = report?.dateSignature ?? '';
    const stagiaireNom = internship?.student?.fullName || overview.stagiaireNom;
    const encAcaNom    = internship?.academicSupervisor?.fullName || overview.encadrantAcademiqueNom;
    const encProNom    = internship?.professionalSupervisor?.fullName || overview.encadrantProfessionnelNom;
    const entrepriseNom = internship?.companySupervisor?.fullName || overview.entrepriseNom;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Cahier de stage — ${esc(stagiaireNom)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5pt;color:#1e293b;background:#fff;padding:18mm 16mm}
  h1{font-size:17pt;font-weight:800;color:#1a3a6e;margin-bottom:4px}
  h2{font-size:12pt;font-weight:700;color:#1a3a6e;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #1a3a6e}
  .subtitle{font-size:10pt;color:#64748b;margin-bottom:18px}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:14px;border-bottom:3px solid #1a3a6e}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:9pt;font-weight:700}
  .badge-ok{background:#dcfce7;color:#166534}
  .badge-warn{background:#fef9c3;color:#854d0e}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 20px;margin-bottom:10px}
  .field .lbl{font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:2px}
  .field .val{font-weight:600;font-size:10pt}
  table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-top:6px}
  thead tr{background:#1a3a6e;color:#fff}
  thead th{padding:7px 9px;text-align:left;font-weight:700}
  tbody tr:nth-child(even){background:#f1f5f9}
  tbody td{padding:6px 9px;border-bottom:1px solid #e2e8f0;vertical-align:top}
  .tc{text-align:center}
  .text-muted{color:#94a3b8;font-style:italic}
  .final-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 14px;margin-top:6px}
  .final-box h3{font-size:10.5pt;font-weight:700;color:#0369a1;margin-bottom:6px}
  .final-text{white-space:pre-wrap;line-height:1.6;color:#334155}
  .trello-summary{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}
  .trello-stat{flex:1 1 100px;padding:10px 14px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;text-align:center}
  .trello-stat.done{border-color:#bbf7d0;background:#f0fdf4}
  .trello-stat.doing{border-color:#fde68a;background:#fffbeb}
  .trello-stat.todo{border-color:#bfdbfe;background:#eff6ff}
  .ts-label{font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:4px}
  .ts-value{font-size:20pt;font-weight:900;color:#1a3a6e}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px}
  .sig-box{border:1px solid #cbd5e1;border-radius:8px;padding:12px 14px;min-height:100px}
  .sig-label{font-size:8pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:6px}
  .sig-name{font-weight:700;font-size:10pt;margin-bottom:4px}
  .sig-img{display:block;max-width:180px;max-height:70px;margin:8px 0;border:1px solid #e2e8f0;border-radius:4px;object-fit:contain;background:#f8fafc}
  .sig-date{font-size:9pt;color:#64748b}
  .sig-stamp{font-size:8.5pt;color:#16a34a;font-weight:700;margin-top:4px}
  .sig-none{font-size:9pt;color:#dc2626;font-style:italic}
  .badge-status{display:inline-block;padding:2px 8px;border-radius:6px;font-size:8.5pt;background:#f1f5f9;color:#475569;font-weight:600}
  .non-renseigne{color:#94a3b8;font-style:italic;font-size:9pt}
  .non-renseigne-box{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;padding:10px 14px;color:#94a3b8;font-style:italic;font-size:9.5pt;margin-top:6px}
  .footer{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:8pt;color:#94a3b8;text-align:center}
  @media print{body{padding:10mm 12mm}h2{page-break-after:avoid}table{page-break-inside:auto}tr{page-break-inside:avoid}.trello-summary{flex-wrap:nowrap}}
</style>
</head>
<body>

<div class="header-row">
  <div>
    <h1>Cahier de stage</h1>
    <div class="subtitle">${val(overview.stageTitre)}</div>
  </div>
  <span class="badge ${allSigned ? 'badge-ok' : 'badge-warn'}">
    ${allSigned ? '✓ Signé par tous' : '⏳ En cours de signature'}
  </span>
</div>

<h2>Informations du stage</h2>
<div class="grid3">
  <div class="field"><div class="lbl">Stagiaire</div><div class="val">${val(stagiaireNom)}</div></div>
  <div class="field"><div class="lbl">Entreprise</div><div class="val">${val(overview.entrepriseNom)}</div></div>
  <div class="field"><div class="lbl">Statut</div><div class="val">${val(overview.stageStatut)}</div></div>
  <div class="field"><div class="lbl">Encadrant académique</div><div class="val">${val(encAcaNom)}</div></div>
  <div class="field"><div class="lbl">Encadrant professionnel</div><div class="val">${val(encProNom)}</div></div>
  <div class="field"><div class="lbl">Tuteur entreprise</div><div class="val">${val(entrepriseNom)}</div></div>
  <div class="field"><div class="lbl">Date de début</div><div class="val">${val(internship?.dateDebut ?? '')}</div></div>
  <div class="field"><div class="lbl">Date de fin</div><div class="val">${val(overview.dateFin)}</div></div>
  <div class="field"><div class="lbl">Durée</div><div class="val">${internship?.duree ? internship.duree + ' sem.' : internship?.nbSemaine ? internship.nbSemaine + ' sem.' : '—'}</div></div>
</div>

<h2>Réunions hebdomadaires et observations</h2>
<table>
  <thead>
    <tr>
      <th class="tc">#</th>
      <th>Date / Heure</th>
      <th>Observation</th>
      <th>Compte rendu</th>
      <th class="tc">Note</th>
    </tr>
  </thead>
  <tbody>${meetingRows}</tbody>
</table>

${finalMeeting ? `
<div class="final-box">
  <h3>Réunion finale — ${fmt(finalMeeting.date)}</h3>
  ${finalMeeting.observation ? `<div class="final-text">${val(finalMeeting.observation)}</div>` : ''}
  ${finalMeeting.compteRendu ? `<div class="final-text" style="margin-top:8px"><strong>Compte rendu :</strong> ${val(finalMeeting.compteRendu)}</div>` : ''}
</div>` : ''}

<h2>Fiche de présence / Absences</h2>
<table>
  <thead>
    <tr><th>Date</th><th class="tc">Heures</th><th>Justification</th><th>Statut</th></tr>
  </thead>
  <tbody>${absenceRows}</tbody>
</table>

${trelloSection}

<h2>Signatures</h2>
<div class="sig-grid">
  ${sigBox('Stagiaire',               stagiaireNom, report?.signeeStagiaire ?? false,      sigs.stagiaire,             dateSignature)}
  ${sigBox('Encadrant académique',    encAcaNom,    report?.signeeEncAcad ?? false,        sigs.encadrantAcademique,   dateSignature)}
  ${sigBox('Encadrant professionnel', encProNom,    report?.signeeEncPro ?? false,         sigs.encadrantProfessionnel,dateSignature)}
  ${sigBox('Responsable entreprise',  entrepriseNom,report?.signeeRespEntreprise ?? false, sigs.responsableEntreprise, dateSignature)}
</div>

<div class="footer">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Système de gestion des stages</div>
</body>
</html>`;
  }

  private openEvaluationPdf(stageId: number): void {
    const cached = this.evaluationsByStageId.get(stageId);
    if (cached) {
      this.renderEvaluationPdf(cached, stageId);
      return;
    }
    // Ouvrir la fenêtre MAINTENANT (geste utilisateur synchrone) pour éviter le blocage popup.
    const win = window.open('', '_blank');
    if (!win) {
      this.errorMessage = "Impossible d'ouvrir la fenêtre PDF. Autorisez les popups pour ce site.";
      return;
    }
    win.document.write('<html><body style="font-family:sans-serif;padding:40px;color:#1a3a6e"><p>Chargement de la fiche d\'évaluation…</p></body></html>');
    win.document.close();

    this.pendingActionKey = this.buildActionKey(stageId, 'fiche-evaluation');
    this.errorMessage = '';
    this.facultyPortalService.getEvaluationByStage(stageId).subscribe({
      next: (ev) => {
        this.pendingActionKey = '';
        if (!ev) {
          win.close();
          this.errorMessage = "Aucune fiche d'évaluation n'est disponible pour ce stage.";
          return;
        }
        this.evaluationsByStageId.set(stageId, ev);
        this.renderEvaluationPdf(ev, stageId, win);
      },
      error: (error) => {
        win.close();
        this.errorMessage = this.extractErrorMessage(error, "Impossible de charger la fiche d'évaluation.");
        this.pendingActionKey = '';
      }
    });
  }

  private renderEvaluationPdf(ev: FacultyEvaluation, stageId: number, preOpenedWin?: Window | null): void {
    const overview = this.stageDocuments.find((i) => i.stageId === stageId);
    if (!overview) return;
    const win = preOpenedWin ?? window.open('', '_blank');
    if (!win) {
      this.errorMessage = "Impossible d'ouvrir la fenêtre PDF. Autorisez les popups pour ce site.";
      return;
    }
    win.document.open();
    win.document.write(this.buildEvaluationHtml(ev, overview));
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch (_) {} }, 600);
  }

  private buildEvaluationHtml(ev: FacultyEvaluation, overview: FacultyStageDocumentsOverview): string {
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
    const esc = (s: string) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const val = (s: string) => esc(s || '—');
    const noteFinale = ev.noteFinale != null ? Number(ev.noteFinale).toFixed(2) : '—';
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Fiche d'évaluation — ${esc(overview.stagiaireNom)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1e293b;background:#fff;padding:20mm 18mm}
  h1{font-size:17pt;font-weight:800;color:#1a3a6e;margin-bottom:4px}
  h2{font-size:12pt;font-weight:700;color:#1a3a6e;margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid #1a3a6e}
  .subtitle{font-size:10pt;color:#64748b;margin-bottom:20px}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1a3a6e}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:9pt;font-weight:700}
  .badge-ok{background:#dcfce7;color:#166534}
  .badge-warn{background:#fef9c3;color:#854d0e}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 20px;margin-bottom:8px}
  .field{margin-bottom:6px}
  .field .lbl{font-size:8.5pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:2px}
  .field .val{font-weight:600;font-size:10.5pt}
  .box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-bottom:8px;min-height:40px;font-size:10.5pt;line-height:1.5;white-space:pre-wrap}
  .note-finale{display:flex;align-items:center;gap:16px;margin-top:16px;padding:12px 16px;background:#eff6ff;border:2px solid #1a3a6e;border-radius:8px}
  .note-finale .nf-label{font-weight:700;color:#1a3a6e;font-size:11pt}
  .note-finale .nf-value{font-size:22pt;font-weight:900;color:#1a3a6e}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:8px}
  .sig-box{border:1px solid #cbd5e1;border-radius:8px;padding:12px 16px;min-height:100px}
  .sig-box .sig-label{font-size:8.5pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:8px}
  .sig-box .sig-name{font-weight:700;margin-bottom:4px}
  .sig-img{display:block;max-width:200px;max-height:80px;margin:8px 0;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;object-fit:contain}
  .sig-box .sig-date{font-size:9.5pt;color:#64748b}
  .sig-box .sig-stamp{margin-top:6px;font-size:8.5pt;color:#16a34a;font-weight:700}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:8.5pt;color:#94a3b8;text-align:center}
  @media print{body{padding:10mm 12mm}h2{page-break-after:avoid}}
</style>
</head>
<body>
<div class="header-row">
  <div>
    <h1>Fiche d'évaluation de stage</h1>
    <div class="subtitle">${val(overview.stageTitre)}</div>
  </div>
  <span class="badge ${ev.signaturesCompletes ? 'badge-ok' : 'badge-warn'}">
    ${ev.signaturesCompletes ? '✓ Toutes signatures' : '⏳ En cours'}
  </span>
</div>
<h2>Informations du stage</h2>
<div class="grid3">
  <div class="field"><div class="lbl">Stagiaire</div><div class="val">${val(overview.stagiaireNom)}</div></div>
  <div class="field"><div class="lbl">Entreprise</div><div class="val">${val(overview.entrepriseNom)}</div></div>
  <div class="field"><div class="lbl">Encadrant académique</div><div class="val">${val(overview.encadrantAcademiqueNom)}</div></div>
  <div class="field"><div class="lbl">Encadrant professionnel</div><div class="val">${val(overview.encadrantProfessionnelNom)}</div></div>
  <div class="field"><div class="lbl">Date de fin</div><div class="val">${val(overview.dateFin)}</div></div>
  <div class="field"><div class="lbl">Statut du stage</div><div class="val">${val(overview.stageStatut)}</div></div>
</div>
<h2>Évaluation — Encadrant professionnel</h2>
<h3 style="font-size:10.5pt;font-weight:700;color:#334155;margin:12px 0 6px">Points forts</h3>
<div class="box">${val(ev.pointFortEncadrantPro)}</div>
<h3 style="font-size:10.5pt;font-weight:700;color:#334155;margin:12px 0 6px">Axes d'amélioration</h3>
<div class="box">${val(ev.axeAmeliorationEncadrantPro)}</div>
<h2>Évaluation — Responsable d'entreprise</h2>
<h3 style="font-size:10.5pt;font-weight:700;color:#334155;margin:12px 0 6px">Points forts</h3>
<div class="box">${val(ev.pointFortResponsableEntreprise)}</div>
<h3 style="font-size:10.5pt;font-weight:700;color:#334155;margin:12px 0 6px">Axes d'amélioration</h3>
<div class="box">${val(ev.axeAmeliorationResponsableEntreprise)}</div>
<div class="note-finale">
  <div class="nf-label">Note finale</div>
  <div class="nf-value">${noteFinale}</div>
  <div style="color:#475569;font-size:9.5pt">${ev.donneesCompletes ? 'Données complètes' : 'Données partielles'}</div>
</div>
<h2>Signatures</h2>
<div class="sig-grid">
  <div class="sig-box">
    <div class="sig-label">Encadrant professionnel</div>
    <div class="sig-name">${val(overview.encadrantProfessionnelNom)}</div>
    ${ev.signatureEncadrantProfessionnel ? `<img class="sig-img" src="${ev.signatureEncadrantProfessionnel}" alt="Signature encadrant professionnel">` : ''}
    ${ev.dateSignatureEncadrantProfessionnel
      ? `<div class="sig-date">Signé le ${fmt(ev.dateSignatureEncadrantProfessionnel)}</div><div class="sig-stamp">✓ Signature apposée</div>`
      : '<div class="sig-date" style="color:#dc2626">Non signé</div>'}
  </div>
  <div class="sig-box">
    <div class="sig-label">Représentant d'entreprise</div>
    <div class="sig-name">${val(overview.entrepriseNom)}</div>
    ${ev.signatureRepresentantEntreprise ? `<img class="sig-img" src="${ev.signatureRepresentantEntreprise}" alt="Signature représentant entreprise">` : ''}
    ${ev.dateSignatureRepresentantEntreprise
      ? `<div class="sig-date">Signé le ${fmt(ev.dateSignatureRepresentantEntreprise)}</div><div class="sig-stamp">✓ Signature apposée</div>`
      : '<div class="sig-date" style="color:#dc2626">Non signé</div>'}
  </div>
</div>
<div class="footer">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Système de gestion des stages</div>
</body>
</html>`;
  }

  isActionPending(stageId: number, type: DocumentType): boolean {
    return this.pendingActionKey === this.buildActionKey(stageId, type);
  }

  signConvention(stageId: number, status: FacultyStageDocumentStatus): void {
    if (!status.documentId) {
      this.errorMessage = 'La convention doit etre generee avant de pouvoir etre signee.';
      return;
    }

    this.pendingActionKey = this.buildActionKey(stageId, 'convention');
    this.errorMessage = '';
    this.successMessage = '';

    this.facultyPortalService.signAgreementAsResponsableUniversitaire(status.documentId).subscribe({
      next: () => {
        this.facultyPortalService.getStageDocuments(stageId).subscribe({
          next: (updatedStageDocuments) => {
            this.stageDocuments = this.stageDocuments.map((item) =>
              item.stageId === updatedStageDocuments.stageId ? updatedStageDocuments : item
            );
            // Refresh modal reference if open
            if (this.selectedDocModal?.stageId === stageId && this.selectedDocModal?.type === 'convention') {
              const entry = this.getDocumentEntries(updatedStageDocuments).find((e) => e.type === 'convention');
              if (entry) this.selectedDocModal = { stageId, type: 'convention', status: entry.status };
            }
            this.successMessage = 'Convention signee avec succes.';
            this.pendingActionKey = '';
          },
          error: (error) => {
            this.errorMessage = this.extractErrorMessage(error, 'La convention a ete signee, mais le rafraichissement a echoue.');
            this.pendingActionKey = '';
          }
        });
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'La signature de la convention a echoue.');
        this.pendingActionKey = '';
      }
    });
  }

  private buildActionKey(stageId: number, type: DocumentType): string {
    return `${stageId}:${type}`;
  }

  getDocumentTypeLabel(type: DocumentType): string {
    if (type === 'convention') return 'Convention';
    if (type === 'fiche-evaluation') return "Fiche d'evaluation";
    return 'Cahier de stage';
  }

  getAnneeUniversitaire(dateDebut: string): string {
    if (!dateDebut) return '—';
    const d = new Date(dateDebut);
    if (isNaN(d.getTime())) return '—';
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }

  getStatusLabel(status: FacultyStageDocumentStatus): string {
    if (status.disponible && status.genere) return 'Genere';
    if (status.disponible) return 'Signe';
    if (status.generationAutorisee && !status.genere) return 'Pret a generer';
    if (status.documentId && !status.disponible) return 'En attente';
    return status.statut || 'A remplir';
  }

  getStatusBadgeClass(status: FacultyStageDocumentStatus): string {
    const label = this.getStatusLabel(status);
    if (label === 'Signe' || label === 'Genere') return 'status-positive';
    if (label === 'Pret a generer') return 'status-info';
    if (label === 'A remplir') return 'status-neutral';
    return 'status-warning';
  }

  /** Short one-line summary shown in the card (never shows full raisonAbsence). */
  getDocumentShortStatus(item: FacultyStageDocumentsOverview, type: DocumentType, status: FacultyStageDocumentStatus): string {
    if (type === 'cahier-stage') {
      if (status.disponible && this.isStageEnded(item.dateFin, item.stageStatut)) {
        return 'Disponible — Téléchargement du cahier de clôture';
      }
      if (!status.disponible) return 'En attente des signatures obligatoires';
      return 'Accessible après la fin du stage et les signatures complètes';
    }
    if (type !== 'convention' && this.isSignaturesComplete(status) && !this.canAccessPdf(item, type, status)) {
      return 'En attente de la fin du stage';
    }
    if (this.isSignaturesComplete(status)) return 'Disponible au telechargement';
    if (!status.genere) return 'Document non encore genere';
    const raison = (status.raisonAbsence || '').toLowerCase();
    if (raison.includes('signature')) return 'En attente de signatures';
    return 'En cours de preparation';
  }

  /** Full description shown only inside the detail modal. */
  getDocumentDescription(type: DocumentType, status: FacultyStageDocumentStatus): string {
    if (status.disponible) {
      return 'Le document final est disponible pour verification et consultation PDF.';
    }
    if (status.raisonAbsence) {
      return status.raisonAbsence;
    }
    if (type === 'fiche-evaluation') {
      return "La fiche d'evaluation restera indisponible tant qu'elle n'est pas suffisamment completee et signee.";
    }
    return "Le document n'est pas encore pret pour la consultation.";
  }

  private isStageEnded(dateFin: string, stageStatut: string): boolean {
    if (stageStatut === 'TERMINE') return true;
    if (!dateFin) return false;
    return new Date(dateFin) <= new Date();
  }

  canAccessPdf(item: FacultyStageDocumentsOverview, type: DocumentType, status: FacultyStageDocumentStatus): boolean {
    if (type === 'fiche-evaluation') {
      const allSigned = status.disponible
        || status.statutDocument === 'SIGNATURES_COMPLETES'
        || status.statutDocument === 'DISPONIBLE_IMPRESSION';
      return allSigned && this.isStageEnded(item.dateFin, item.stageStatut);
    }
    if (type === 'convention') {
      return !!status.disponible;
    }
    // cahier-stage : toutes les signatures obligatoires (disponible = true côté backend) + stage terminé.
    return !!status.disponible && this.isStageEnded(item.dateFin, item.stageStatut);
  }

  canAccessPdfModal(): boolean {
    if (!this.selectedDocModal) return false;
    const item = this.stageDocuments.find((i) => i.stageId === this.selectedDocModal!.stageId);
    if (!item) return false;
    return this.canAccessPdf(item, this.selectedDocModal.type, this.selectedDocModal.status);
  }

  private isSignaturesComplete(status: FacultyStageDocumentStatus): boolean {
    return status.disponible
      || status.statutDocument === 'SIGNATURES_COMPLETES'
      || status.statutDocument === 'DISPONIBLE_IMPRESSION';
  }

  getPdfBlockedTooltip(item: FacultyStageDocumentsOverview, type: DocumentType, status: FacultyStageDocumentStatus): string {
    if (type === 'cahier-stage') {
      if (!status.disponible) {
        return 'Les 4 signatures obligatoires sont requises : encadrant professionnel, encadrant académique, responsable entreprise, stagiaire.';
      }
      return item.dateFin
        ? `Accessible après la fin du stage le ${new Date(item.dateFin).toLocaleDateString('fr-FR')} et les signatures complètes`
        : 'Accessible après la fin du stage et les signatures complètes.';
    }
    if (type !== 'convention' && this.isSignaturesComplete(status)) {
      return item.dateFin
        ? `Accessible après la fin du stage le ${new Date(item.dateFin).toLocaleDateString('fr-FR')}`
        : 'Accessible après la fin du stage.';
    }
    return status.raisonAbsence || 'Toutes les signatures obligatoires ne sont pas encore complètes.';
  }

  getPdfBlockedTooltipModal(): string {
    if (!this.selectedDocModal) return '';
    const item = this.stageDocuments.find((i) => i.stageId === this.selectedDocModal!.stageId);
    if (!item) return '';
    return this.getPdfBlockedTooltip(item, this.selectedDocModal.type, this.selectedDocModal.status);
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    return fallback;
  }
}
