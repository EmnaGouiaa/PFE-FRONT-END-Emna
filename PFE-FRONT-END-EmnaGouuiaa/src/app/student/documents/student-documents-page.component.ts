import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import {
  StudentEvaluation,
  StudentInternship,
  StudentMeeting,
  StudentReport,
  StudentStageDocumentStatus,
  StudentStageDocumentsOverview,
  StudentTrelloSummary
} from '../../services/student/student.models';
import { PdfWindowService } from '../../services/pdf-window.service';
import { StudentPortalService } from '../../services/student/student-portal.service';

type StudentDocumentType = 'convention' | 'fiche-evaluation' | 'cahier-stage';
type DocEntry = { type: StudentDocumentType; status: StudentStageDocumentStatus };

@Component({
  selector: 'app-student-documents-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="company-page student-page">
      <section class="page-hero">
        <div>
          <h1>Documents de stage</h1>
          <p>Retrouvez les documents du stage, leur statut actuel et les actions autorisees pour votre profil.</p>
        </div>
        <button type="button" class="btn btn-secondary" (click)="reload()" [disabled]="isLoading || isActing">
          Actualiser
        </button>
      </section>

      <div class="message-error" *ngIf="errorMessage">{{ errorMessage }}</div>
      <div class="alert alert-success" *ngIf="successMessage">{{ successMessage }}</div>

      <section class="panel" *ngIf="!isLoadingInternships && internships.length">
        <div class="panel-header">
          <div>
            <h2>Stage</h2>
            <p class="panel-subtitle">Les documents affiches refletent l'etat reel de votre convention, de la fiche d'evaluation et du cahier.</p>
          </div>
        </div>

        <!-- Le sélecteur n'apparaît que si le stagiaire a plusieurs stages affectés. -->
        <select
          *ngIf="internships.length > 1"
          class="select stage-selector"
          [ngModel]="selectedStageId"
          (ngModelChange)="onStageChange($event)"
        >
          <option *ngFor="let internship of internships" [ngValue]="internship.id">
            {{ internship.titre || internship.sujet || ('Stage #' + internship.id) }}
          </option>
        </select>
      </section>

      <div class="empty-card" *ngIf="isLoadingInternships || isLoading">Chargement des documents...</div>
      <div class="empty-card" *ngIf="!isLoadingInternships && !internships.length">Aucun stage ne vous a encore ete affecte.</div>
      <div class="empty-card" *ngIf="!isLoading && selectedDocuments && documentEntries.length === 0">
        Aucun document de stage n'est disponible pour votre role.
      </div>

      <div class="doc-cards-row student-docs-row" *ngIf="!isLoading && documentEntries.length">
        <article class="doc-mini-card" *ngFor="let doc of documentEntries">

          <div class="doc-card-eyebrow">{{ getDocumentTypeLabel(doc.type) }}</div>

          <div class="doc-card-top">
            <div class="doc-card-title">{{ doc.status.libelle }}</div>
            <span class="status-pill" [ngClass]="getStatusBadgeClass(doc.status)">
              {{ getStatusLabel(doc.status) }}
            </span>
          </div>

          <div class="doc-card-short-status">{{ getDocumentShortStatus(doc.type, doc.status) }}</div>

          <div class="doc-card-meta">
            <div class="doc-card-meta-item">
              <span class="label">Statut</span>
              <strong>{{ getStatusLabel(doc.status) }}</strong>
            </div>
            <div class="doc-card-meta-item" *ngIf="doc.type === 'convention'">
              <span class="label">Année univ.</span>
              <strong>{{ conventionAnneeUniversitaire || '—' }}</strong>
            </div>
            <div class="doc-card-meta-item">
              <span class="label">Accès</span>
              <strong>{{ canAccessPdf(doc.type, doc.status) ? 'Autorisé' : 'En attente' }}</strong>
            </div>
          </div>

          <div class="doc-card-actions">
            <button type="button" class="btn btn-secondary btn-sm" (click)="openDocDetails(doc)">
              Détails
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              (click)="openPdf(doc.type, doc.status.libelle)"
              [disabled]="isActing || !canAccessPdf(doc.type, doc.status)"
              [title]="!canAccessPdf(doc.type, doc.status) ? getPdfBlockedTooltip(doc.type, doc.status) : 'Ouvrir le PDF'"
            >
              Voir PDF
            </button>
            <button
              *ngIf="doc.type === 'cahier-stage' && !doc.status.genere"
              type="button"
              class="btn btn-primary btn-sm"
              (click)="generateLogbook()"
              [disabled]="isActing || !doc.status.generationAutorisee"
            >
              Générer
            </button>
            <button
              *ngIf="doc.type === 'convention' && doc.status.documentId"
              type="button"
              class="btn btn-primary btn-sm"
              (click)="signConvention(doc.status)"
              [disabled]="isActing || conventionSigneeParStagiaire"
              [title]="conventionSigneeParStagiaire ? 'Vous avez déjà signé cette convention' : 'Signer la convention'"
            >
              {{ conventionSigneeParStagiaire ? '✓ Signé' : 'Signer' }}
            </button>
            <button
              *ngIf="doc.type === 'cahier-stage' && doc.status.documentId"
              type="button"
              class="btn btn-primary btn-sm"
              (click)="signLogbook(doc.status)"
              [disabled]="isActing || cahierSigneeParStagiaire"
              [title]="cahierSigneeParStagiaire ? 'Vous avez déjà signé ce cahier' : 'Signer le cahier'"
            >
              {{ cahierSigneeParStagiaire ? '✓ Signé' : 'Signer' }}
            </button>
          </div>

        </article>
      </div>

      <!-- Detail modal -->
      <div class="modal-overlay" *ngIf="showDocModal && selectedDoc" (click)="closeDocDetails()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div style="min-width:0">
              <h2 style="margin:0;font-size:1.15rem">{{ getDocumentTypeLabel(selectedDoc.type) }}</h2>
              <p style="margin:4px 0 0;color:var(--text-muted);font-size:0.92rem">{{ selectedDoc.status.libelle }}</p>
            </div>
            <button type="button" class="btn-close" (click)="closeDocDetails()">x</button>
          </div>

          <div class="form">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Statut</span>
                <span class="value">
                  <span class="status-pill" [ngClass]="getStatusBadgeClass(selectedDoc.status)">{{ getStatusLabel(selectedDoc.status) }}</span>
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Acces PDF</span>
                <span class="value">{{ selectedDoc.status.disponible ? 'Consultation autorisee' : 'Non disponible' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Document genere</span>
                <span class="value">{{ selectedDoc.status.genere ? 'Oui' : 'Non' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Generation autorisee</span>
                <span class="value">{{ selectedDoc.status.generationAutorisee ? 'Oui' : 'Non' }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="selectedDoc.status.raisonAbsence">
                <span class="label">Raison de l'indisponibilite</span>
                <span class="value" style="white-space:pre-wrap;line-height:1.6;color:#92400e">{{ selectedDoc.status.raisonAbsence }}</span>
              </div>
              <div class="detail-item full-width" *ngIf="!canAccessPdf(selectedDoc.type, selectedDoc.status)">
                <span class="label">Conditions d'acces</span>
                <span class="value">{{ getDocumentDescription(selectedDoc.type, selectedDoc.status) }}</span>
              </div>
            </div>

            <div class="inline-actions">
              <button type="button" class="btn btn-secondary" (click)="closeDocDetails()">Fermer</button>
              <button
                type="button"
                class="btn btn-secondary"
                (click)="openPdf(selectedDoc.type, selectedDoc.status.libelle)"
                [disabled]="isActing || !canAccessPdf(selectedDoc.type, selectedDoc.status)"
                [title]="!canAccessPdf(selectedDoc.type, selectedDoc.status) ? getPdfBlockedTooltip(selectedDoc.type, selectedDoc.status) : 'Ouvrir le PDF'"
              >
                Voir PDF
              </button>
              <button
                *ngIf="selectedDoc.type === 'cahier-stage' && !selectedDoc.status.genere"
                type="button"
                class="btn btn-primary"
                (click)="generateLogbook(); closeDocDetails()"
                [disabled]="isActing || !selectedDoc.status.generationAutorisee"
              >
                Generer le cahier
              </button>
              <button
                *ngIf="selectedDoc.type === 'convention' && selectedDoc.status.documentId"
                type="button"
                class="btn btn-primary"
                (click)="signConvention(selectedDoc.status); closeDocDetails()"
                [disabled]="isActing || conventionSigneeParStagiaire"
                [title]="conventionSigneeParStagiaire ? 'Vous avez déjà signé cette convention' : 'Signer la convention'"
              >
                {{ conventionSigneeParStagiaire ? '✓ Convention signée' : 'Signer la convention' }}
              </button>
              <button
                *ngIf="selectedDoc.type === 'cahier-stage' && selectedDoc.status.documentId"
                type="button"
                class="btn btn-primary"
                (click)="signLogbook(selectedDoc.status); closeDocDetails()"
                [disabled]="isActing || cahierSigneeParStagiaire"
                [title]="cahierSigneeParStagiaire ? 'Vous avez déjà signé ce cahier' : 'Signer le cahier'"
              >
                {{ cahierSigneeParStagiaire ? '✓ Cahier signé' : 'Signer le cahier' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .student-docs-row {
      /* Cartes légèrement plus larges pour la vue mono-stage du stagiaire */
      --doc-card-max: 380px;
    }
    .student-docs-row .doc-mini-card {
      max-width: var(--doc-card-max, 340px);
    }
  `],
  styleUrls: ['../../company/company-shared.css', '../student-shared.css']
})
export class StudentDocumentsPageComponent implements OnInit {
  internships: StudentInternship[] = [];
  selectedStageId: number | null = null;
  selectedDocuments: StudentStageDocumentsOverview | null = null;
  selectedDoc: DocEntry | null = null;
  showDocModal = false;
  isLoadingInternships = true;
  isLoading = false;
  isActing = false;
  errorMessage = '';
  successMessage = '';
  private evaluationsByStageId = new Map<number, StudentEvaluation>();
  private reportsByStageId = new Map<number, StudentReport>();

  /** Vrai si le stagiaire connecté a déjà signé la convention / le cahier de stage.
   *  Sert à masquer le bouton « Signer » pour empêcher une double signature. */
  conventionSigneeParStagiaire = false;
  cahierSigneeParStagiaire = false;
  /** Année universitaire de la convention courante (ex : 2024/2025). */
  conventionAnneeUniversitaire = '';

  constructor(
    private studentPortalService: StudentPortalService,
    private pdfWindowService: PdfWindowService
  ) {}

  get documentEntries(): DocEntry[] {
    if (!this.selectedDocuments) return [];
    return [
      { type: 'convention', status: this.selectedDocuments.convention },
      { type: 'fiche-evaluation', status: this.selectedDocuments.ficheEvaluation },
      { type: 'cahier-stage', status: this.selectedDocuments.cahierStage }
    ].filter((entry): entry is DocEntry => entry.status !== null);
  }

  get currentInternship(): StudentInternship | null {
    return this.internships.find((i) => i.id === this.selectedStageId) ?? null;
  }

  private isStageEnded(dateFin: string, statut: string): boolean {
    if (statut === 'TERMINE') return true;
    if (!dateFin) return false;
    return new Date(dateFin) <= new Date();
  }

  canAccessPdf(type: StudentDocumentType, status: StudentStageDocumentStatus): boolean {
    const internship = this.currentInternship;
    if (type === 'fiche-evaluation') {
      const allSigned = status.disponible
        || status.statutDocument === 'SIGNATURES_COMPLETES'
        || status.statutDocument === 'DISPONIBLE_IMPRESSION';
      if (!allSigned) return false;
      return this.isStageEnded(internship?.dateFin ?? '', internship?.statut ?? '');
    }
    if (type === 'convention') {
      return !!status.disponible;
    }
    // cahier-stage : les 4 signatures obligatoires doivent être présentes ET le stage doit être terminé.
    if (type === 'cahier-stage') {
      const report = this.selectedStageId ? this.reportsByStageId.get(this.selectedStageId) : null;
      const allSigned = report
        ? !!(report.signeeEncAcad && report.signeeEncPro && report.signeeRespEntreprise && report.signeeStagiaire)
        : !!status.disponible;
      return allSigned && this.isStageEnded(internship?.dateFin ?? '', internship?.statut ?? '');
    }
    return false;
  }

  ngOnInit(): void {
    this.studentPortalService.listMyInternships().subscribe({
      next: (internships) => {
        this.internships = internships;
        // Sélection automatique et partagée entre les pages (stage persisté / courant / unique).
        const selected = this.studentPortalService.resolveSelectedInternship(internships);
        this.selectedStageId = selected?.id ?? null;
        this.isLoadingInternships = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les stages.');
        this.isLoadingInternships = false;
      }
    });
  }

  onStageChange(stageId: number): void {
    this.selectedStageId = Number(stageId);
    // Mémorise le choix pour que les autres pages chargent le même stage.
    this.studentPortalService.setSelectedStageId(this.selectedStageId);
    this.reload();
  }

  reload(): void {
    if (!this.selectedStageId) return;
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const stageId = this.selectedStageId;

    // On charge l'aperçu des documents + l'état de signature de la convention et du
    // cahier. La convention/le cahier peuvent ne pas encore exister (404) — dans ce
    // cas on retombe sur null et les drapeaux restent à false.
    forkJoin({
      documents: this.studentPortalService.getStageDocuments(stageId),
      agreement: this.studentPortalService.getAgreementByStage(stageId).pipe(catchError(() => of(null))),
      report: this.studentPortalService.getReportByStage(stageId).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ documents, agreement, report }) => {
        this.selectedDocuments = documents;
        this.conventionSigneeParStagiaire = Boolean(agreement?.signeeStagiaire);
        this.conventionAnneeUniversitaire = agreement?.anneeUniversitaire ?? '';
        this.cahierSigneeParStagiaire = Boolean(report?.signeeStagiaire);
        if (report) this.reportsByStageId.set(stageId, report);
        // Refresh modal reference after reload so it shows updated data
        if (this.selectedDoc) {
          const refreshed = this.documentEntries.find((e) => e.type === this.selectedDoc!.type);
          if (refreshed) this.selectedDoc = refreshed;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de charger les documents.');
        this.isLoading = false;
      }
    });
  }

  openDocDetails(doc: DocEntry): void {
    this.selectedDoc = doc;
    this.showDocModal = true;
  }

  closeDocDetails(): void {
    this.showDocModal = false;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showDocModal) this.closeDocDetails();
  }

  openPdf(type: StudentDocumentType, label: string): void {
    if (!this.selectedStageId) return;
    if (type === 'fiche-evaluation') {
      this.openEvaluationPdf(this.selectedStageId);
      return;
    }
    if (type === 'cahier-stage') {
      this.openCahierPdf(this.selectedStageId);
      return;
    }
    this.isActing = true;
    this.errorMessage = '';
    const pdfWindow = this.pdfWindowService.openPlaceholder(label);

    this.studentPortalService.downloadStageDocumentPdf(this.selectedStageId, type).subscribe({
      next: (blob) => {
        this.pdfWindowService.showPdf(pdfWindow, blob, { title: label });
        this.isActing = false;
      },
      error: (error) => {
        pdfWindow?.close();
        this.errorMessage = this.studentPortalService.describeError(error, `Impossible d'ouvrir ${label}.`);
        this.isActing = false;
      }
    });
  }

  private openCahierPdf(stageId: number): void {
    const internship = this.currentInternship;
    const report = this.reportsByStageId.get(stageId);
    if (!internship) {
      this.errorMessage = 'Données du stage introuvables.';
      return;
    }
    // Ouvrir la fenêtre MAINTENANT (geste utilisateur synchrone) pour éviter le blocage popup.
    const win = window.open('', '_blank');
    if (!win) {
      this.errorMessage = "Impossible d'ouvrir la fenêtre PDF. Autorisez les popups pour ce site.";
      return;
    }
    win.document.write('<html><body style="font-family:sans-serif;padding:40px;color:#1a3a6e"><p>Chargement du cahier de stage…</p></body></html>');
    win.document.close();

    this.isActing = true;
    this.errorMessage = '';

    forkJoin({
      meetings:       this.studentPortalService.listMeetingsForStage(stageId).pipe(catchError(() => of([] as StudentMeeting[]))),
      trello:         this.studentPortalService.getStageProgressSummary(stageId).pipe(catchError(() => of(null as StudentTrelloSummary | null))),
      absences:       this.studentPortalService.getAbsencesForStage(stageId),
      sigStagiaire:   this.studentPortalService.getUserSignature(internship.student.id),
      sigEncAca:      this.studentPortalService.getUserSignature(internship.academicSupervisor.id),
      sigEncPro:      this.studentPortalService.getUserSignature(internship.professionalSupervisor.id),
      sigEntreprise:  this.studentPortalService.getUserSignature(internship.companySupervisor.id)
    }).pipe(timeout(20000)).subscribe({
      next: ({ meetings, trello, absences, sigStagiaire, sigEncAca, sigEncPro, sigEntreprise }) => {
        this.isActing = false;
        win.document.open();
        win.document.write(this.buildCahierHtml(internship, report ?? null, meetings, trello, absences, {
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
        this.isActing = false;
        win.close();
        this.errorMessage = 'Impossible de charger les données du cahier de stage.';
      }
    });
  }

  private buildCahierHtml(
    stage: StudentInternship,
    report: StudentReport | null,
    meetings: StudentMeeting[],
    trello: StudentTrelloSummary | null,
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
        <td>${val(m.nomEncadrantCreateur)}</td>
        <td class="tc">${m.note != null ? m.note : '<span class="non-renseigne">—</span>'}</td>
      </tr>`).join('') || '<tr><td colspan="6" class="tc non-renseigne">Aucune réunion hebdomadaire — Non renseigné</td></tr>';

    const absenceRows = absences.length
      ? absences.map((a) => `
          <tr>
            <td>${fmt(a.dateAbsence)}</td>
            <td class="tc">${a.nbAbsence}</td>
            <td>${a.justification ? val(a.justification) : '<span class="non-renseigne">Non renseigné</span>'}</td>
            <td><span class="badge-status">${val(a.statut)}</span></td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="tc non-renseigne">Aucune absence enregistrée</td></tr>';

    const trelloSection = trello
      ? `<h2>Tâches Trello</h2>
      <div class="trello-summary">
        <div class="trello-stat"><div class="ts-label">Total</div><div class="ts-value">${trello.nombreTotalTaches}</div></div>
        <div class="trello-stat done"><div class="ts-label">Terminées</div><div class="ts-value">${trello.nombreTachesTerminees}</div></div>
        <div class="trello-stat doing"><div class="ts-label">En cours</div><div class="ts-value">${trello.nombreTachesEnCours}</div></div>
        <div class="trello-stat todo"><div class="ts-label">À faire</div><div class="ts-value">${trello.nombreTachesAFaire}</div></div>
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

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Cahier de stage — ${esc(stage.student.fullName)}</title>
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
    <div class="subtitle">${val(stage.titre || stage.sujet)}</div>
  </div>
  <span class="badge ${allSigned ? 'badge-ok' : 'badge-warn'}">
    ${allSigned ? '✓ Signé par tous' : '⏳ En cours de signature'}
  </span>
</div>

<h2>Informations du stage</h2>
<div class="grid3">
  <div class="field"><div class="lbl">Stagiaire</div><div class="val">${val(stage.student.fullName)}</div></div>
  <div class="field"><div class="lbl">Email</div><div class="val">${val(stage.student.email)}</div></div>
  <div class="field"><div class="lbl">Entreprise</div><div class="val">${val(stage.company.nom)}</div></div>
  <div class="field"><div class="lbl">Encadrant académique</div><div class="val">${val(stage.academicSupervisor.fullName)}</div></div>
  <div class="field"><div class="lbl">Encadrant professionnel</div><div class="val">${val(stage.professionalSupervisor.fullName)}</div></div>
  <div class="field"><div class="lbl">Tuteur entreprise</div><div class="val">${val(stage.companySupervisor.fullName)}</div></div>
  <div class="field"><div class="lbl">Date de début</div><div class="val">${fmt(stage.dateDebut)}</div></div>
  <div class="field"><div class="lbl">Date de fin</div><div class="val">${fmt(stage.dateFin)}</div></div>
  <div class="field"><div class="lbl">Durée</div><div class="val">${stage.duree ? stage.duree + ' sem.' : stage.nbSemaine ? stage.nbSemaine + ' sem.' : '—'}</div></div>
</div>

<h2>Réunions hebdomadaires et observations</h2>
<table>
  <thead>
    <tr>
      <th class="tc">#</th>
      <th>Date / Heure</th>
      <th>Observation</th>
      <th>Compte rendu</th>
      <th>Encadrant</th>
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
  ${sigBox('Stagiaire',               stage.student.fullName,               report?.signeeStagiaire ?? false,      sigs.stagiaire,             dateSignature)}
  ${sigBox('Encadrant académique',    stage.academicSupervisor.fullName,    report?.signeeEncAcad ?? false,        sigs.encadrantAcademique,   dateSignature)}
  ${sigBox('Encadrant professionnel', stage.professionalSupervisor.fullName,report?.signeeEncPro ?? false,         sigs.encadrantProfessionnel,dateSignature)}
  ${sigBox('Responsable entreprise',  stage.companySupervisor.fullName,     report?.signeeRespEntreprise ?? false, sigs.responsableEntreprise, dateSignature)}
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

    this.isActing = true;
    this.errorMessage = '';
    this.studentPortalService.getEvaluationByStage(stageId).subscribe({
      next: (ev) => {
        this.evaluationsByStageId.set(stageId, ev);
        this.renderEvaluationPdf(ev, stageId, win);
        this.isActing = false;
      },
      error: (error) => {
        win.close();
        this.errorMessage = this.studentPortalService.describeError(error, "Impossible de charger la fiche d'évaluation.");
        this.isActing = false;
      }
    });
  }

  private renderEvaluationPdf(ev: StudentEvaluation, stageId: number, preOpenedWin?: Window | null): void {
    const overview = this.selectedDocuments;
    if (!overview || overview.stageId !== stageId) return;
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

  private buildEvaluationHtml(ev: StudentEvaluation, overview: StudentStageDocumentsOverview): string {
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

  generateLogbook(): void {
    if (!this.selectedStageId) return;
    this.isActing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.studentPortalService.generateLogbook(this.selectedStageId).subscribe({
      next: () => {
        this.successMessage = 'Cahier de stage genere.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de generer le cahier.');
        this.isActing = false;
      }
    });
  }

  signConvention(status: StudentStageDocumentStatus): void {
    // Garde-fou : ne jamais re-signer une convention déjà signée par le stagiaire.
    if (!status.documentId || this.conventionSigneeParStagiaire) return;
    if (!window.confirm('Confirmer la signature de la convention ?')) return;
    this.isActing = true;
    this.studentPortalService.signAgreementAsStudent(status.documentId).subscribe({
      next: () => {
        this.successMessage = 'Convention signee.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer la convention.');
        this.isActing = false;
      }
    });
  }

  signLogbook(status: StudentStageDocumentStatus): void {
    // Garde-fou : ne jamais re-signer un cahier déjà signé par le stagiaire.
    if (!status.documentId || this.cahierSigneeParStagiaire) return;
    if (!window.confirm('Confirmer la signature du cahier ?')) return;
    this.isActing = true;
    this.studentPortalService.signReportAsStudent(status.documentId).subscribe({
      next: () => {
        this.successMessage = 'Cahier de stage signe.';
        this.isActing = false;
        this.reload();
      },
      error: (error) => {
        this.errorMessage = this.studentPortalService.describeError(error, 'Impossible de signer le cahier.');
        this.isActing = false;
      }
    });
  }

  getDocumentTypeLabel(type: StudentDocumentType): string {
    if (type === 'convention') return 'Convention';
    if (type === 'fiche-evaluation') return "Fiche d'evaluation";
    return 'Cahier de stage';
  }

  getStatusLabel(status: StudentStageDocumentStatus): string {
    if (status.disponible && status.genere) return 'Genere';
    if (status.disponible) return 'Signe';
    if (status.generationAutorisee && !status.genere) return 'Pret a generer';
    if (status.documentId && !status.disponible) return 'En attente';
    return status.statut || 'A remplir';
  }

  getStatusBadgeClass(status: StudentStageDocumentStatus): string {
    const label = this.getStatusLabel(status);
    if (label === 'Signe' || label === 'Genere') return 'status-positive';
    if (label === 'Pret a generer') return 'status-info';
    if (label === 'A remplir') return 'status-neutral';
    return 'status-warning';
  }

  private isSignaturesComplete(status: StudentStageDocumentStatus): boolean {
    return status.disponible
      || status.statutDocument === 'SIGNATURES_COMPLETES'
      || status.statutDocument === 'DISPONIBLE_IMPRESSION';
  }

  /** Short one-line summary shown inside the card (never shows full raisonAbsence). */
  getDocumentShortStatus(type: StudentDocumentType, status: StudentStageDocumentStatus): string {
    const internship = this.currentInternship;
    if (type === 'cahier-stage') {
      const report = this.selectedStageId ? this.reportsByStageId.get(this.selectedStageId) : null;
      const allSigned = report
        ? !!(report.signeeEncAcad && report.signeeEncPro && report.signeeRespEntreprise && report.signeeStagiaire)
        : !!status.disponible;
      if (allSigned && this.isStageEnded(internship?.dateFin ?? '', internship?.statut ?? '')) {
        return 'Disponible — Téléchargement du cahier de clôture';
      }
      if (!allSigned) return 'En attente des signatures obligatoires';
      return 'Accessible après la fin du stage et les signatures complètes';
    }
    if (type !== 'convention' && this.isSignaturesComplete(status) && !this.canAccessPdf(type, status)) {
      return 'En attente de la fin du stage';
    }
    if (status.disponible || this.isSignaturesComplete(status)) return 'Disponible au telechargement';
    if (!status.genere) return 'Document non encore genere';
    const raison = (status.raisonAbsence || '').toLowerCase();
    if (raison.includes('signature')) return 'En attente de signatures';
    return 'En cours de preparation';
  }

  /** Full description shown only inside the detail modal. */
  getDocumentDescription(type: StudentDocumentType, status: StudentStageDocumentStatus): string {
    if (this.canAccessPdf(type, status)) {
      return 'Le document final est disponible a la consultation et au telechargement.';
    }
    if (type !== 'convention' && this.isSignaturesComplete(status)) {
      const dateFin = this.currentInternship?.dateFin;
      const dateLabel = dateFin ? ` (date de fin : ${new Date(dateFin).toLocaleDateString('fr-FR')})` : '';
      return `Ce document sera consultable uniquement apres la fin du stage${dateLabel}.`;
    }
    if (status.raisonAbsence) {
      return status.raisonAbsence;
    }
    if (type === 'fiche-evaluation') {
      return "La fiche d'evaluation sera consultable apres sa signature complete et la fin du stage.";
    }
    if (type === 'cahier-stage') {
      return "Le cahier de stage sera consultable apres sa signature complete et la fin du stage.";
    }
    return 'Le document est encore en cours de preparation.';
  }

  getPdfBlockedTooltip(type: StudentDocumentType, status: StudentStageDocumentStatus): string {
    const dateFin = this.currentInternship?.dateFin;
    if (type === 'cahier-stage') {
      const report = this.selectedStageId ? this.reportsByStageId.get(this.selectedStageId) : null;
      const allSigned = report
        ? !!(report.signeeEncAcad && report.signeeEncPro && report.signeeRespEntreprise && report.signeeStagiaire)
        : !!status.disponible;
      if (!allSigned) {
        return 'Les 4 signatures obligatoires sont requises : encadrant professionnel, encadrant académique, responsable entreprise, stagiaire.';
      }
      return dateFin
        ? `Accessible après la fin du stage le ${new Date(dateFin).toLocaleDateString('fr-FR')} et les signatures complètes`
        : 'Accessible après la fin du stage et les signatures complètes.';
    }
    if (type !== 'convention' && this.isSignaturesComplete(status)) {
      return dateFin
        ? `Accessible après la fin du stage le ${new Date(dateFin).toLocaleDateString('fr-FR')}`
        : 'Accessible après la fin du stage.';
    }
    if (status.raisonAbsence) {
      return status.raisonAbsence;
    }
    return 'Toutes les signatures obligatoires ne sont pas encore complètes.';
  }
}
