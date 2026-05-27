import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { CompanyAgreement, CompanyContext, CompanyEvaluation, CompanyInternship, CompanyMeeting, CompanyValidationItem } from '../../services/company/company.models';
import { CompanyValidationsService } from '../../services/company/company-validations.service';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyInternshipsService } from '../../services/company/company-internships.service';
import { CompanyAgreementsService } from '../../services/company/company-agreements.service';
import { CompanyEvaluationsService } from '../../services/company/company-evaluations.service';
import { CompanyAbsencesService } from '../../services/company/company-absences.service';
import { CompanyMeetingsService } from '../../services/company/company-meetings.service';
import { PdfWindowService } from '../../services/pdf-window.service';
import { API_BASE_URL } from '../../services/api.config';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-company-validations-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './company-validations.component.html',
  styleUrls: ['../company-shared.css'],
  styles: [`
    .doc-internship-group {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(16, 71, 120, 0.08);
    }
    .doc-internship-group:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    .doc-internship-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .doc-student-avatar {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: linear-gradient(135deg, #1a3a6e, #2980b9);
      color: #fff;
      font-size: 0.85rem;
      font-weight: 900;
    }
    .doc-internship-name {
      font-weight: 800;
      color: #0f172a;
      font-size: 0.95rem;
    }
    .doc-internship-sub {
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
    }
    /* doc-mini-card styles définis dans company-shared.css */
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    .detail-item {
      padding: 12px 14px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 14px;
      background: rgba(248, 250, 252, 0.9);
    }
    .detail-item .label {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
      margin-bottom: 4px;
    }
    .detail-item .value {
      font-weight: 700;
      color: #0f172a;
    }
    .alert-info {
      color: #0369a1;
      background: rgba(3, 105, 161, 0.08);
      border-color: rgba(3, 105, 161, 0.18);
    }
    .evaluation-nudge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .btn-small {
      padding: 6px 14px;
      font-size: 0.85rem;
      border-radius: 10px;
    }
    @media (max-width: 640px) {
      .doc-cards-row { flex-direction: column; }
      .doc-mini-card { max-width: 100%; }
    }
  `]
})
export class CompanyValidationsPageComponent implements OnInit {
  context: CompanyContext | null = null;
  internships: CompanyInternship[] = [];
  agreementsByStageId = new Map<number, CompanyAgreement>();
  evaluationsByStageId = new Map<number, CompanyEvaluation>();

  items: CompanyValidationItem[] = [];

  isLoading = false;
  isActing = false;
  isSigning = false;
  errorMessage = '';
  successMessage = '';
  showEvaluationLink = false;

  // ── Modale de détails document ─────────────────────────────────────────
  showDocModal = false;
  selectedDocStageId: number | null = null;
  selectedDocType: 'convention' | 'fiche-evaluation' | 'cahier-stage' | null = null;

  constructor(
    private companyContextService: CompanyContextService,
    private companyInternshipsService: CompanyInternshipsService,
    private companyAgreementsService: CompanyAgreementsService,
    private companyEvaluationsService: CompanyEvaluationsService,
    private companyValidationsService: CompanyValidationsService,
    private companyAbsencesService: CompanyAbsencesService,
    private companyMeetingsService: CompanyMeetingsService,
    private pdfWindowService: PdfWindowService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showEvaluationLink = false;

    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;
        const entrepriseId = context.responsable.entrepriseId;
        if (!entrepriseId) {
          this.errorMessage = "Aucune entreprise n'est rattachée à ce compte.";
          this.isLoading = false;
          return;
        }

        forkJoin({
          internships: this.companyInternshipsService.listByEntreprise(entrepriseId).pipe(catchError(() => of([] as CompanyInternship[]))),
          validationItems: this.companyValidationsService.list().pipe(catchError(() => of([] as CompanyValidationItem[])))
        }).pipe(timeout(15000)).subscribe({
          next: ({ internships, validationItems }) => {
            this.internships = internships;
            this.items = validationItems;
            this.loadDocumentData(internships);
          },
          error: (error) => {
            this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les données.');
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger le contexte entreprise.');
        this.isLoading = false;
      }
    });
  }

  private loadDocumentData(internships: CompanyInternship[]): void {
    if (!internships.length) {
      this.isLoading = false;
      return;
    }

    forkJoin({
      agreements: forkJoin(
        internships.map((i) =>
          this.companyAgreementsService.getByStageId(i.id).pipe(catchError(() => of(null)))
        )
      ),
      evaluations: forkJoin(
        internships.map((i) =>
          this.companyEvaluationsService.getByStageId(i.id).pipe(catchError(() => of(null)))
        )
      )
    }).pipe(timeout(15000)).subscribe({
      next: ({ agreements, evaluations }) => {
        this.agreementsByStageId = new Map(
          agreements
            .filter((a): a is CompanyAgreement => !!a && a.stageId > 0)
            .map((a) => [a.stageId, a])
        );
        this.evaluationsByStageId = new Map(
          evaluations
            .filter((e): e is CompanyEvaluation => !!e && e.stageId > 0)
            .map((e) => [e.stageId, e])
        );
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  getAgreement(stageId: number): CompanyAgreement | null {
    return this.agreementsByStageId.get(stageId) ?? null;
  }

  getEvaluation(stageId: number): CompanyEvaluation | null {
    return this.evaluationsByStageId.get(stageId) ?? null;
  }

  isConventionSignedByCompany(agreement: CompanyAgreement): boolean {
    return agreement.signeeEntreprise;
  }

  isEvaluationSignedByCompany(evaluation: CompanyEvaluation): boolean {
    return !!evaluation.dateSignatureRepresentantEntreprise;
  }

  signConvention(agreement: CompanyAgreement): void {
    if (agreement.signeeEntreprise) return;
    this.isSigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyAgreementsService.signByEntreprise(agreement.id).pipe(timeout(15000)).subscribe({
      next: (updated) => {
        this.agreementsByStageId.set(updated.stageId, updated);
        this.successMessage = 'Convention signée avec succès.';
        this.isSigning = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de signer cette convention.');
        this.isSigning = false;
      }
    });
  }

  signEvaluation(evaluation: CompanyEvaluation): void {
    if (this.isEvaluationSignedByCompany(evaluation)) return;
    const userId = this.context?.userId;
    if (!userId) {
      this.errorMessage = 'Identifiant utilisateur introuvable.';
      return;
    }
    this.isSigning = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyEvaluationsService.sign(evaluation.id, userId).pipe(timeout(15000)).subscribe({
      next: (updated) => {
        this.evaluationsByStageId.set(updated.stageId, updated);
        this.successMessage = "Fiche d'évaluation signée avec succès.";
        this.isSigning = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, "Impossible de signer la fiche d'évaluation.");
        this.isSigning = false;
      }
    });
  }

  getConventionStatusLabel(agreement: CompanyAgreement): string {
    if (agreement.statutSignatures) return 'Toutes signatures';
    if (agreement.signeeEntreprise) return 'Signé par vous';
    return 'En attente de votre signature';
  }

  getEvaluationStatusLabel(evaluation: CompanyEvaluation): string {
    if (evaluation.signaturesCompletes) return 'Toutes signatures';
    if (this.isEvaluationSignedByCompany(evaluation)) return 'Signé par vous';
    if (evaluation.donneesCompletes) return 'Données complètes';
    return 'En attente';
  }

  getEvaluationStatusClass(evaluation: CompanyEvaluation): string {
    if (evaluation.signaturesCompletes) return 'status-pill active';
    if (this.isEvaluationSignedByCompany(evaluation)) return 'status-pill status-info';
    if (evaluation.donneesCompletes) return 'status-pill status-warning';
    return 'status-pill status-neutral';
  }

  approveSelected(item: CompanyValidationItem): void {
    if (!item) return;
    this.isActing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyValidationsService.approve(item).subscribe({
      next: (updated) => {
        this.upsertItem(updated);
        this.successMessage = `${updated.title} validé avec succès.`;
        this.showEvaluationLink = updated.type === 'CAHIER_STAGE';
        this.isActing = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de valider cet élément.');
        this.isActing = false;
      }
    });
  }

  getCahierItem(stageId: number): CompanyValidationItem | null {
    return this.items.find((item) => item.type === 'CAHIER_STAGE' && item.stageId === stageId) ?? null;
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'VALIDEE': return 'Validé';
      case 'REFUSEE': return 'Refusé';
      default: return 'En attente';
    }
  }

  isStageEnded(internship: CompanyInternship): boolean {
    if (internship.statut === 'TERMINE') return true;
    if (!internship.dateFin) return false;
    return new Date(internship.dateFin) <= new Date();
  }

  canAccessPdf(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): boolean {
    const internship = this.internships.find((i) => i.id === stageId);
    if (!internship) return false;
    if (type === 'convention') {
      return !!this.getAgreement(stageId)?.statutSignatures;
    }
    if (type === 'fiche-evaluation') {
      const ev = this.getEvaluation(stageId);
      return !!(ev?.signaturesCompletes && ev?.donneesCompletes) && this.isStageEnded(internship);
    }
    // cahier-stage : toutes les signatures obligatoires (status VALIDEE côté backend) + stage terminé.
    const cahier = this.getCahierItem(stageId);
    return cahier?.status === 'VALIDEE' && this.isStageEnded(internship);
  }

  downloadPdf(stageId: number, type: 'convention' | 'fiche-evaluation' | 'cahier-stage'): void {
    // Garde systématique : bloquer l'accès PDF si les signatures ne sont pas complètes.
    if (!this.canAccessPdf(stageId, type)) {
      this.errorMessage = 'Le document n\'est pas encore disponible. Il sera généré et consultable après la signature de tous les signataires requis.';
      return;
    }
    if (type === 'fiche-evaluation') {
      this.openEvaluationPdf(stageId);
      return;
    }
    if (type === 'convention') {
      this.openConventionPdf(stageId);
      return;
    }
    // cahier-stage
    this.openCahierPdf(stageId);
  }

  private openConventionPdf(stageId: number, detailsMode = false): void {
    const agreement = this.getAgreement(stageId);
    const internship = this.internships.find((i) => i.id === stageId);
    if (!agreement || !internship) {
      this.errorMessage = 'Données de convention introuvables.';
      return;
    }
    const win = window.open('', '_blank');
    if (!win) {
      this.errorMessage = "Impossible d'ouvrir une nouvelle fenêtre. Vérifiez les paramètres de votre navigateur.";
      return;
    }
    let html = this.buildConventionHtml(agreement, internship);
    if (detailsMode) { html = this.injectPdfNotice(html, this.canAccessPdf(stageId, 'convention')); }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    if (!detailsMode) { setTimeout(() => { try { win.print(); } catch (_) {} }, 600); }
  }

  /** Ouvre la modale de détails pour la convention. */
  openConventionDetails(stageId: number): void {
    if (!this.getAgreement(stageId)) {
      this.errorMessage = 'Convention introuvable pour ce stage.';
      return;
    }
    this.selectedDocStageId = stageId;
    this.selectedDocType = 'convention';
    this.showDocModal = true;
  }

  /** Ouvre la modale de détails pour la fiche d'évaluation. */
  openEvaluationDetails(stageId: number): void {
    if (!this.getEvaluation(stageId)) {
      this.errorMessage = "Fiche d'évaluation introuvable pour ce stage.";
      return;
    }
    this.selectedDocStageId = stageId;
    this.selectedDocType = 'fiche-evaluation';
    this.showDocModal = true;
  }

  /** Ouvre la modale de détails pour le cahier de stage. */
  openCahierDetails(stageId: number): void {
    if (!this.getCahierItem(stageId)) {
      this.errorMessage = 'Données du cahier de stage introuvables.';
      return;
    }
    this.selectedDocStageId = stageId;
    this.selectedDocType = 'cahier-stage';
    this.showDocModal = true;
  }

  closeDocDetails(): void {
    this.showDocModal = false;
    this.selectedDocStageId = null;
    this.selectedDocType = null;
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.showDocModal) this.closeDocDetails();
  }

  getSelectedInternship(): CompanyInternship | null {
    if (!this.selectedDocStageId) return null;
    return this.internships.find((i) => i.id === this.selectedDocStageId) ?? null;
  }

  isSelectedStageEnded(): boolean {
    const internship = this.getSelectedInternship();
    return internship ? this.isStageEnded(internship) : false;
  }

  private openCahierPdf(stageId: number, detailsMode = false): void {
    const cahier = this.getCahierItem(stageId);
    const internship = this.internships.find((i) => i.id === stageId);
    if (!cahier || !internship) {
      this.errorMessage = 'Données du cahier de stage introuvables.';
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
      meetings:      this.companyMeetingsService.listForStage(stageId).pipe(catchError(() => of([] as CompanyMeeting[]))),
      absences:      this.companyAbsencesService.listByStage(stageId).pipe(catchError(() => of([]))),
      trello:        this.http.get<any>(`${API_BASE_URL}/stages/${stageId}/resume-trello`).pipe(catchError(() => of(null))),
      sigStagiaire:  internship.stagiaireId
        ? this.http.get<{ urlSignature?: string }>(`${API_BASE_URL}/utilisateurs/${internship.stagiaireId}/signature-collaborateur`).pipe(map((r) => String(r?.urlSignature ?? '')), catchError(() => of('')))
        : of(''),
      sigEncPro:     internship.encadrantProfessionnelId
        ? this.http.get<{ urlSignature?: string }>(`${API_BASE_URL}/utilisateurs/${internship.encadrantProfessionnelId}/signature-collaborateur`).pipe(map((r) => String(r?.urlSignature ?? '')), catchError(() => of('')))
        : of('')
    }).pipe(timeout(20000)).subscribe({
      next: ({ meetings, absences, trello, sigStagiaire, sigEncPro }) => {
        this.isActing = false;
        let html = this.buildCahierHtml(cahier, internship, meetings, absences, trello, {
          stagiaire: sigStagiaire,
          encadrantProfessionnel: sigEncPro
        });
        if (detailsMode) { html = this.injectPdfNotice(html, this.canAccessPdf(stageId, 'cahier-stage')); }
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
        if (!detailsMode) { setTimeout(() => { try { win.print(); } catch (_) {} }, 700); }
      },
      error: () => {
        this.isActing = false;
        win.close();
        this.errorMessage = 'Impossible de charger les données du cahier de stage.';
      }
    });
  }

  private buildConventionHtml(ag: CompanyAgreement, stage: CompanyInternship): string {
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
    const esc = (s: string) => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const val = (s: string) => esc(s || '—');
    const sig = (signed: boolean, label: string, name: string) => `
      <div class="sig-box">
        <div class="sig-label">${label}</div>
        <div class="sig-name">${val(name)}</div>
        ${signed
          ? '<div class="sig-stamp">✓ Signé</div>'
          : '<div class="sig-none">En attente de signature</div>'}
      </div>`;
    const anneeUniv = ag.anneeUniversitaire || '—';
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Convention de stage n° ${ag.numConv ?? ag.id}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#1e293b;background:#fff;padding:20mm 18mm}
  h1{font-size:17pt;font-weight:800;color:#1a3a6e;margin-bottom:4px}
  h2{font-size:12pt;font-weight:700;color:#1a3a6e;margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid #1a3a6e}
  .subtitle{font-size:10pt;color:#64748b;margin-bottom:4px}
  .annee-univ{font-size:9.5pt;font-weight:700;color:#1a3a6e;margin-bottom:16px}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #1a3a6e}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:9pt;font-weight:700}
  .badge-ok{background:#dcfce7;color:#166534}
  .badge-warn{background:#fef9c3;color:#854d0e}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 20px;margin-bottom:8px}
  .field{margin-bottom:6px}
  .field .lbl{font-size:8.5pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:2px}
  .field .val{font-weight:600;font-size:10.5pt}
  .sig-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:8px}
  .sig-box{border:1px solid #cbd5e1;border-radius:8px;padding:12px 14px;min-height:90px}
  .sig-label{font-size:8.5pt;text-transform:uppercase;letter-spacing:.06em;color:#64748b;margin-bottom:6px}
  .sig-name{font-weight:700;margin-bottom:6px;font-size:10pt}
  .sig-stamp{font-size:8.5pt;color:#16a34a;font-weight:700}
  .sig-none{font-size:8.5pt;color:#dc2626}
  .footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:8.5pt;color:#94a3b8;text-align:center}
  @media print{body{padding:10mm 12mm}}
</style>
</head>
<body>
<div class="header-row">
  <div>
    <h1>Convention de stage</h1>
    <div class="subtitle">N° ${ag.numConv ?? ag.id} — ${val(stage.titre)}</div>
    <div class="annee-univ">Année universitaire : ${anneeUniv}</div>
  </div>
  <span class="badge ${ag.statutSignatures ? 'badge-ok' : 'badge-warn'}">
    ${ag.statutSignatures ? '✓ Toutes signatures' : '⏳ En cours de signature'}
  </span>
</div>

<h2>Informations du stage</h2>
<div class="grid3">
  <div class="field"><div class="lbl">Année universitaire</div><div class="val">${anneeUniv}</div></div>
  <div class="field"><div class="lbl">Stagiaire</div><div class="val">${val(stage.stagiaireNom)}</div></div>
  <div class="field"><div class="lbl">Email</div><div class="val">${val(stage.stagiaireEmail)}</div></div>
  <div class="field"><div class="lbl">Encadrant académique</div><div class="val">${val(stage.encadrantAcademiqueNom)}</div></div>
  <div class="field"><div class="lbl">Encadrant professionnel</div><div class="val">${val(stage.encadrantProfessionnelNom)}</div></div>
  <div class="field"><div class="lbl">Tuteur entreprise</div><div class="val">${val(stage.tuteurEntrepriseNom)}</div></div>
  <div class="field"><div class="lbl">Durée</div><div class="val">${stage.duree ? stage.duree + ' semaine(s)' : (stage.nbSemaine ? stage.nbSemaine + ' sem.' : '—')}</div></div>
  <div class="field"><div class="lbl">Date de début</div><div class="val">${fmt(ag.dateDebut || stage.dateDebut)}</div></div>
  <div class="field"><div class="lbl">Date de fin</div><div class="val">${fmt(ag.dateFin || stage.dateFin)}</div></div>
  <div class="field"><div class="lbl">Statut</div><div class="val">${val(stage.statut)}</div></div>
</div>

<h2>Signatures</h2>
<div class="sig-grid">
  ${sig(ag.signeeStagiaire,    'Stagiaire',                  stage.stagiaireNom)}
  ${sig(ag.signeeEncAca,       'Encadrant académique',       stage.encadrantAcademiqueNom)}
  ${sig(ag.signeeEncPro,       'Encadrant professionnel',    stage.encadrantProfessionnelNom)}
  ${sig(ag.signeeEntreprise,   'Représentant entreprise',    stage.tuteurEntrepriseNom)}
  ${sig(ag.signeeResp,         'Responsable des stages',     '—')}
</div>

<div class="footer">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Système de gestion des stages</div>
</body>
</html>`;
  }

  private buildCahierHtml(
    cahier: CompanyValidationItem,
    stage: CompanyInternship,
    meetings: CompanyMeeting[],
    absences: { dateAbsence: string; nbAbsence: number; justification: string; statut: string }[],
    trello: any,
    sigs: { stagiaire: string; encadrantProfessionnel: string }
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

    const trelloSection = trello
      ? `<h2>Tâches Trello</h2>
      <div class="trello-summary">
        <div class="trello-stat"><div class="ts-label">Total</div><div class="ts-value">${trello.nombreTotalTaches ?? 0}</div></div>
        <div class="trello-stat done"><div class="ts-label">Terminées</div><div class="ts-value">${trello.nombreTachesTerminees ?? 0}</div></div>
        <div class="trello-stat doing"><div class="ts-label">En cours</div><div class="ts-value">${trello.nombreTachesEnCours ?? 0}</div></div>
        <div class="trello-stat todo"><div class="ts-label">À faire</div><div class="ts-value">${trello.nombreTachesAFaire ?? 0}</div></div>
      </div>`
      : `<h2>Tâches Trello</h2><div class="non-renseigne-box">Aucune donnée Trello disponible — Non renseigné</div>`;

    const sigBox = (label: string, name: string, imgSrc: string) => `
      <div class="sig-box">
        <div class="sig-label">${label}</div>
        <div class="sig-name">${val(name)}</div>
        ${imgSrc ? `<img class="sig-img" src="${imgSrc}" alt="Signature ${esc(label)}">` : '<div class="sig-none">Non signé — Non renseigné</div>'}
        ${imgSrc ? '<div class="sig-stamp">✓ Signé</div>' : ''}
      </div>`;

    const isValidee = cahier.status === 'VALIDEE';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Cahier de stage — ${esc(stage.stagiaireNom)}</title>
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
  .sig-stamp{font-size:8.5pt;color:#16a34a;font-weight:700;margin-top:4px}
  .sig-none{font-size:9pt;color:#dc2626;font-style:italic;margin-top:4px}
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
    <div class="subtitle">${val(stage.stagiaireNom)} — ${val(stage.titre)}</div>
  </div>
  <span class="badge ${isValidee ? 'badge-ok' : 'badge-warn'}">
    ${isValidee ? '✓ Validé' : '⏳ En cours'}
  </span>
</div>

<h2>Informations du stage</h2>
<div class="grid3">
  <div class="field"><div class="lbl">Stagiaire</div><div class="val">${val(stage.stagiaireNom)}</div></div>
  <div class="field"><div class="lbl">Email</div><div class="val">${val(stage.stagiaireEmail)}</div></div>
  <div class="field"><div class="lbl">Encadrant académique</div><div class="val">${val(stage.encadrantAcademiqueNom)}</div></div>
  <div class="field"><div class="lbl">Encadrant professionnel</div><div class="val">${val(stage.encadrantProfessionnelNom)}</div></div>
  <div class="field"><div class="lbl">Tuteur entreprise</div><div class="val">${val(stage.tuteurEntrepriseNom)}</div></div>
  <div class="field"><div class="lbl">Statut</div><div class="val">${val(stage.statut)}</div></div>
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
  ${sigBox('Stagiaire',               stage.stagiaireNom,          sigs.stagiaire)}
  ${sigBox('Encadrant professionnel', stage.encadrantProfessionnelNom, sigs.encadrantProfessionnel)}
  ${sigBox('Encadrant académique',    stage.encadrantAcademiqueNom, '')}
  ${sigBox('Tuteur entreprise',       stage.tuteurEntrepriseNom,    '')}
</div>

<div class="footer">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Système de gestion des stages</div>
</body>
</html>`;
  }

  private openEvaluationPdf(stageId: number, detailsMode = false): void {
    const evaluation = this.getEvaluation(stageId);
    const internship = this.internships.find((i) => i.id === stageId);
    if (!evaluation || !internship) {
      this.errorMessage = "Données d'évaluation introuvables.";
      return;
    }
    const viewerWindow = window.open('', '_blank');
    if (!viewerWindow) {
      this.errorMessage = "Impossible d'ouvrir une nouvelle fenêtre. Vérifiez les paramètres de votre navigateur.";
      return;
    }
    let html = this.buildEvaluationHtml(evaluation, internship);
    if (detailsMode) { html = this.injectPdfNotice(html, this.canAccessPdf(stageId, 'fiche-evaluation')); }
    viewerWindow.document.open();
    viewerWindow.document.write(html);
    viewerWindow.document.close();
    viewerWindow.focus();
    if (!detailsMode) { setTimeout(() => { try { viewerWindow.print(); } catch (_) {} }, 600); }
  }

  /** Injecte un bandeau PDF (disponible ou non) en bas du document HTML généré. */
  private injectPdfNotice(html: string, canPrint: boolean): string {
    const printStyle = '<style>@media print{.no-print{display:none!important}}</style>';
    const notice = canPrint
      ? `<div class="no-print" style="margin:24px 0 0;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:10.5pt;color:#166534;display:flex;align-items:center;justify-content:space-between;gap:16px"><span>✓ Toutes les signatures sont complètes. Ce document est disponible en PDF.</span><button onclick="window.print()" style="flex-shrink:0;padding:8px 20px;background:#15803d;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:10pt">Imprimer / Télécharger PDF</button></div>`
      : `<div class="no-print" style="margin:24px 0 0;padding:14px 18px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;font-size:10.5pt;color:#9a3412"><strong>⚠ Document non disponible au format PDF.</strong> Il sera généré et consultable après la signature de tous les signataires requis.</div>`;
    return html.replace('</head>', printStyle + '\n</head>').replace('</body>', notice + '\n</body>');
  }

  private buildEvaluationHtml(ev: CompanyEvaluation, stage: CompanyInternship): string {
    const fmt = (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
    const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const notesRows = ev.notesAttribuees.map(n => `
      <tr>
        <td>${esc(n.critereLibelle || '')}</td>
        <td style="text-align:center">${n.poids}</td>
        <td style="text-align:center">${n.note} / ${n.bareme}</td>
        <td style="text-align:center">${n.scorePondere != null ? n.scorePondere.toFixed(2) : '—'}</td>
        <td>${esc(n.commentaire || '')}</td>
      </tr>`).join('');
    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Fiche d'évaluation — ${esc(stage.titre)}</title>
  <style>
    @page { size: A4; margin: 22mm 18mm; }
    @media print { .no-print { display: none; } }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; font-size: 12px; }
    .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 14px; border-bottom: 3px solid #1a3a6e; margin-bottom: 20px; }
    .header-title { font-size: 20px; font-weight: 900; color: #1a3a6e; }
    .header-sub { font-size: 11px; color: #64748b; margin-top: 4px; }
    .badge { background: #1a3a6e; color: #fff; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .section-title { font-size: 13px; font-weight: 800; color: #1a3a6e; text-transform: uppercase; letter-spacing: 0.06em; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid rgba(26,58,110,0.15); }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .info-cell { background: #f8fafc; border: 1px solid rgba(15,23,42,0.08); border-radius: 10px; padding: 8px 12px; }
    .info-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
    .info-value { font-weight: 700; color: #0f172a; }
    .assess-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .assess-box { background: #f8fafc; border: 1px solid rgba(15,23,42,0.08); border-radius: 10px; padding: 12px 14px; }
    .assess-label { font-size: 11px; font-weight: 800; color: #1a3a6e; margin-bottom: 6px; }
    .assess-text { color: #334155; white-space: pre-wrap; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #1a3a6e; color: #fff; padding: 8px 10px; text-align: left; font-weight: 700; }
    td { padding: 7px 10px; border-bottom: 1px solid rgba(15,23,42,0.08); vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .note-finale { text-align: center; margin: 20px 0; padding: 18px; background: linear-gradient(135deg,#1a3a6e,#2980b9); color: #fff; border-radius: 14px; }
    .note-finale-label { font-size: 13px; font-weight: 700; opacity: 0.85; margin-bottom: 4px; }
    .note-finale-value { font-size: 32px; font-weight: 900; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
    .sig-box { border: 1px solid rgba(15,23,42,0.12); border-radius: 10px; padding: 14px 16px; }
    .sig-label { font-size: 11px; font-weight: 800; color: #1a3a6e; margin-bottom: 8px; }
    .sig-date { font-size: 11px; color: #64748b; margin-top: 6px; }
    .sig-name { font-weight: 700; color: #0f172a; }
    .sig-img { display: block; max-width: 200px; max-height: 80px; margin: 8px 0; border: 1px solid #e2e8f0; border-radius: 4px; background: #f8fafc; object-fit: contain; }
    .sig-stamp { margin-top: 4px; font-size: 10px; color: #16a34a; font-weight: 700; }
    .sig-none { font-size: 11px; color: #dc2626; }
    footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 28px; padding-top: 10px; border-top: 1px solid rgba(15,23,42,0.08); }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="header-title">Fiche d'évaluation de stage</div>
      <div class="header-sub">${esc(stage.titre)}</div>
    </div>
    <div class="badge">Confidentiel</div>
  </div>

  <div class="section-title">Informations du stage</div>
  <div class="info-grid">
    <div class="info-cell"><div class="info-label">Stagiaire</div><div class="info-value">${esc(stage.stagiaireNom)}</div></div>
    <div class="info-cell"><div class="info-label">Encadrant académique</div><div class="info-value">${esc(stage.encadrantAcademiqueNom)}</div></div>
    <div class="info-cell"><div class="info-label">Encadrant professionnel</div><div class="info-value">${esc(stage.encadrantProfessionnelNom)}</div></div>
    <div class="info-cell"><div class="info-label">Date de début</div><div class="info-value">${fmt(stage.dateDebut)}</div></div>
    <div class="info-cell"><div class="info-label">Date de fin</div><div class="info-value">${fmt(stage.dateFin)}</div></div>
    <div class="info-cell"><div class="info-label">Titre du stage</div><div class="info-value">${esc(ev.stageTitre || stage.titre)}</div></div>
  </div>

  <div class="section-title">Appréciations</div>
  <div class="assess-grid">
    <div class="assess-box">
      <div class="assess-label">Points forts — Encadrant professionnel</div>
      <div class="assess-text">${esc(ev.pointFortEncadrantPro || '—')}</div>
    </div>
    <div class="assess-box">
      <div class="assess-label">Axes d'amélioration — Encadrant professionnel</div>
      <div class="assess-text">${esc(ev.axeAmeliorationEncadrantPro || '—')}</div>
    </div>
    <div class="assess-box">
      <div class="assess-label">Points forts — Représentant entreprise</div>
      <div class="assess-text">${esc(ev.pointFortResponsableEntreprise || '—')}</div>
    </div>
    <div class="assess-box">
      <div class="assess-label">Axes d'amélioration — Représentant entreprise</div>
      <div class="assess-text">${esc(ev.axeAmeliorationResponsableEntreprise || '—')}</div>
    </div>
  </div>

  <div class="section-title">Critères d'évaluation</div>
  <table>
    <thead><tr><th>Critère</th><th style="text-align:center">Poids</th><th style="text-align:center">Note</th><th style="text-align:center">Score pondéré</th><th>Commentaire</th></tr></thead>
    <tbody>${notesRows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8">Aucun critère enregistré</td></tr>'}</tbody>
  </table>

  <div class="note-finale">
    <div class="note-finale-label">Note finale</div>
    <div class="note-finale-value">${ev.noteFinale != null ? ev.noteFinale.toFixed(2) + ' / 20' : '—'}</div>
  </div>

  <div class="section-title">Signatures</div>
  <div class="sig-grid">
    <div class="sig-box">
      <div class="sig-label">Encadrant professionnel</div>
      <div class="sig-name">${esc(stage.encadrantProfessionnelNom || '—')}</div>
      ${ev.signatureEncadrantProfessionnel ? `<img class="sig-img" src="${ev.signatureEncadrantProfessionnel}" alt="Signature encadrant professionnel">` : ''}
      ${ev.dateSignatureEncadrantProfessionnel
        ? `<div class="sig-date">Signé le : ${fmt(ev.dateSignatureEncadrantProfessionnel)}</div><div class="sig-stamp">✓ Signature apposée</div>`
        : '<div class="sig-none">Non signé</div>'}
    </div>
    <div class="sig-box">
      <div class="sig-label">Représentant entreprise</div>
      <div class="sig-name">${esc(stage.tuteurEntrepriseNom || '—')}</div>
      ${ev.signatureRepresentantEntreprise ? `<img class="sig-img" src="${ev.signatureRepresentantEntreprise}" alt="Signature représentant entreprise">` : ''}
      ${ev.dateSignatureRepresentantEntreprise
        ? `<div class="sig-date">Signé le : ${fmt(ev.dateSignatureRepresentantEntreprise)}</div><div class="sig-stamp">✓ Signature apposée</div>`
        : '<div class="sig-none">Non signé</div>'}
    </div>
  </div>

  <footer>Document généré le ${new Date().toLocaleDateString('fr-FR')} · Confidentiel</footer>
</body>
</html>`;
  }

  private upsertItem(updated: CompanyValidationItem): void {
    const index = this.items.findIndex((item) => item.key === updated.key);
    if (index >= 0) {
      const nextItems = [...this.items];
      nextItems[index] = updated;
      this.items = nextItems;
    } else {
      this.items = [updated, ...this.items];
    }
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
  }
}
