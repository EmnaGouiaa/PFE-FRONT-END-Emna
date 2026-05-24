import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ServiceProfilService } from '../../services/service-profil.service';
import { AuthentificationService } from '../../services/authentification.service';

@Component({
  selector: 'app-first-login-password-change',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fl-page">
      <div class="fl-bg-blob fl-bg-blob-1"></div>
      <div class="fl-bg-blob fl-bg-blob-2"></div>
      <div class="fl-bg-blob fl-bg-blob-3"></div>

      <main class="fl-card" role="main" aria-labelledby="fl-title">

        <!-- ── Header ──────────────────────────────────────────────────── -->
        <header class="fl-header">
          <div class="fl-icon-wrap" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 id="fl-title">Sécurisation de votre compte</h1>
          <p>Veuillez définir un nouveau mot de passe pour continuer.</p>
        </header>

        <!-- ── Alertes globales ────────────────────────────────────────── -->
        <div *ngIf="messageErreur" class="fl-alert fl-alert-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ messageErreur }}
        </div>

        <!-- ── Etat succes (anime) ─────────────────────────────────────── -->
        <div *ngIf="succes" class="fl-success-anim" aria-live="polite">
          <div class="fl-check-circle">
            <svg viewBox="0 0 52 52">
              <circle class="fl-check-bg" cx="26" cy="26" r="25" fill="none"/>
              <path class="fl-check-mark" fill="none" d="M14.1 27.2 22 35l16-17"/>
            </svg>
          </div>
          <p class="fl-success-text">Mot de passe mis à jour. Redirection…</p>
        </div>

        <!-- ── Formulaire ──────────────────────────────────────────────── -->
        <form *ngIf="!succes" [formGroup]="formulaire" (ngSubmit)="soumettre()" class="fl-form" novalidate>

          <!-- Mot de passe provisoire -->
          <div class="fl-field">
            <label for="ancienMotDePasse">Mot de passe provisoire</label>
            <div class="fl-input-wrap" [class.fl-invalid]="estChampInvalide('ancienMotDePasse')">
              <span class="fl-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                  <circle cx="12" cy="16" r="1"/>
                  <rect x="3" y="10" width="18" height="12" rx="2"/>
                  <path d="M7 10V7a5 5 0 0 1 10 0v3"/>
                </svg>
              </span>
              <input id="ancienMotDePasse"
                     [type]="afficherAncien ? 'text' : 'password'"
                     formControlName="ancienMotDePasse"
                     autocomplete="current-password"
                     placeholder="Reçu par email" />
              <button type="button" class="fl-toggle" (click)="afficherAncien = !afficherAncien"
                      [attr.aria-label]="afficherAncien ? 'Masquer' : 'Afficher'">
                {{ afficherAncien ? '🙈' : '👁' }}
              </button>
            </div>
            <small *ngIf="estChampInvalide('ancienMotDePasse')" class="fl-err">
              Le mot de passe provisoire est obligatoire.
            </small>
          </div>

          <!-- Nouveau mot de passe -->
          <div class="fl-field">
            <label for="nouveauMotDePasse">Nouveau mot de passe</label>
            <div class="fl-input-wrap" [class.fl-invalid]="estChampInvalide('nouveauMotDePasse')">
              <span class="fl-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input id="nouveauMotDePasse"
                     [type]="afficherNouveau ? 'text' : 'password'"
                     formControlName="nouveauMotDePasse"
                     autocomplete="new-password"
                     placeholder="Minimum 8 caractères" />
              <button type="button" class="fl-toggle" (click)="afficherNouveau = !afficherNouveau"
                      [attr.aria-label]="afficherNouveau ? 'Masquer' : 'Afficher'">
                {{ afficherNouveau ? '🙈' : '👁' }}
              </button>
            </div>

            <!-- Indicateur de force du mot de passe -->
            <div *ngIf="nouveauMdpValue" class="fl-strength">
              <div class="fl-strength-bar" [attr.data-level]="forceMdp">
                <span [class.actif]="forceMdpScore >= 1"></span>
                <span [class.actif]="forceMdpScore >= 2"></span>
                <span [class.actif]="forceMdpScore >= 3"></span>
              </div>
              <span class="fl-strength-label" [attr.data-level]="forceMdp">{{ forceMdpLabel }}</span>
            </div>

            <small *ngIf="estChampInvalide('nouveauMotDePasse')" class="fl-err">
              Votre mot de passe doit contenir au minimum 8 caractères, une majuscule et un chiffre.
            </small>
          </div>

          <!-- Confirmation -->
          <div class="fl-field">
            <label for="confirmationNouveauMotDePasse">Confirmer le mot de passe</label>
            <div class="fl-input-wrap" [class.fl-invalid]="confirmationInvalide">
              <span class="fl-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input id="confirmationNouveauMotDePasse"
                     [type]="afficherConfirmation ? 'text' : 'password'"
                     formControlName="confirmationNouveauMotDePasse"
                     autocomplete="new-password"
                     placeholder="Retapez le mot de passe" />
              <button type="button" class="fl-toggle" (click)="afficherConfirmation = !afficherConfirmation"
                      [attr.aria-label]="afficherConfirmation ? 'Masquer' : 'Afficher'">
                {{ afficherConfirmation ? '🙈' : '👁' }}
              </button>
            </div>
            <small *ngIf="confirmationInvalide" class="fl-err">
              Les mots de passe ne correspondent pas.
            </small>
          </div>

          <!-- Hint securite -->
          <p class="fl-hint">
            <strong>Conseil :</strong> votre mot de passe doit contenir au minimum
            8&nbsp;caractères, une majuscule et un chiffre.
          </p>

          <!-- Bouton principal -->
          <button type="submit" class="fl-submit"
                  [disabled]="enChargement || !boutonActif">
            <span *ngIf="!enChargement">Mettre à jour le mot de passe</span>
            <span *ngIf="enChargement" class="fl-spinner-row">
              <span class="fl-spinner" aria-hidden="true"></span>
              Mise à jour…
            </span>
          </button>

          <p class="fl-foot">
            🔒 Cette étape est obligatoire avant l'accès à votre espace.
          </p>
        </form>
      </main>
    </div>
  `,
  styles: [`
    /* ── Page background ─────────────────────────────────────────────── */
    :host { display: block; }
    .fl-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background:
        linear-gradient(135deg, #1a3a6e 0%, #2596be 100%);
      position: relative;
      overflow: hidden;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    .fl-bg-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.45;
      pointer-events: none;
    }
    .fl-bg-blob-1 { width: 420px; height: 420px; background: #38bdf8; top: -120px; left: -120px; }
    .fl-bg-blob-2 { width: 480px; height: 480px; background: #cbd812; bottom: -160px; right: -160px; opacity: 0.30; }
    .fl-bg-blob-3 { width: 320px; height: 320px; background: #6366f1; top: 40%; right: 20%; opacity: 0.20; }

    /* ── Card ─────────────────────────────────────────────────────────── */
    .fl-card {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 460px;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 40px 36px;
      box-shadow:
        0 30px 60px -15px rgba(15, 23, 42, 0.35),
        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
      animation: fl-card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fl-card-enter {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Header ──────────────────────────────────────────────────────── */
    .fl-header { text-align: center; margin-bottom: 28px; }
    .fl-icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: linear-gradient(135deg, #1a3a6e, #2596be);
      color: #fff;
      margin-bottom: 14px;
      box-shadow: 0 12px 24px rgba(37, 150, 190, 0.32);
    }
    .fl-icon-wrap svg { width: 30px; height: 30px; }
    .fl-header h1 {
      margin: 0 0 6px;
      font-size: 1.5rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .fl-header p {
      margin: 0;
      color: #64748b;
      font-size: 0.92rem;
      line-height: 1.5;
    }

    /* ── Alerte ──────────────────────────────────────────────────────── */
    .fl-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-radius: 12px;
      font-size: 0.88rem;
      line-height: 1.4;
      margin-bottom: 18px;
    }
    .fl-alert-error {
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(220, 38, 38, 0.25);
      color: #b91c1c;
    }
    .fl-alert svg { flex-shrink: 0; }

    /* ── Form ────────────────────────────────────────────────────────── */
    .fl-form { display: flex; flex-direction: column; gap: 16px; }
    .fl-field label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
    }
    .fl-input-wrap {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    }
    .fl-input-wrap:focus-within {
      border-color: #2596be;
      box-shadow: 0 0 0 4px rgba(37, 150, 190, 0.15);
      background: #fff;
    }
    .fl-input-wrap.fl-invalid {
      border-color: #ef4444;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
    }
    .fl-input-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      flex-shrink: 0;
      color: #64748b;
    }
    .fl-input-wrap input {
      flex: 1;
      min-width: 0;
      border: 0;
      outline: 0;
      background: transparent;
      padding: 12px 10px 12px 0;
      font-size: 0.95rem;
      color: #0f172a;
      font-family: inherit;
    }
    .fl-input-wrap input::placeholder { color: #94a3b8; }
    .fl-toggle {
      background: none;
      border: 0;
      cursor: pointer;
      padding: 0 14px;
      font-size: 1.05rem;
      color: #64748b;
      transition: color 0.15s;
    }
    .fl-toggle:hover { color: #1a3a6e; }

    /* ── Strength meter ──────────────────────────────────────────────── */
    .fl-strength {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 8px;
    }
    .fl-strength-bar {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    .fl-strength-bar span {
      flex: 1;
      height: 5px;
      border-radius: 3px;
      background: #e2e8f0;
      transition: background 0.25s;
    }
    .fl-strength-bar[data-level="faible"] span.actif { background: #ef4444; }
    .fl-strength-bar[data-level="moyen"] span.actif  { background: #f59e0b; }
    .fl-strength-bar[data-level="fort"] span.actif   { background: #10b981; }
    .fl-strength-label {
      font-size: 0.78rem;
      font-weight: 700;
      min-width: 50px;
      text-align: right;
    }
    .fl-strength-label[data-level="faible"] { color: #ef4444; }
    .fl-strength-label[data-level="moyen"]  { color: #f59e0b; }
    .fl-strength-label[data-level="fort"]   { color: #10b981; }

    /* ── Erreurs inline ──────────────────────────────────────────────── */
    .fl-err {
      display: block;
      margin-top: 6px;
      font-size: 0.8rem;
      color: #b91c1c;
      line-height: 1.4;
    }

    /* ── Hint ────────────────────────────────────────────────────────── */
    .fl-hint {
      margin: 4px 0 8px;
      padding: 10px 12px;
      background: rgba(37, 150, 190, 0.07);
      border-left: 3px solid #2596be;
      border-radius: 8px;
      font-size: 0.82rem;
      color: #334155;
      line-height: 1.5;
    }
    .fl-hint strong { color: #1a3a6e; }

    /* ── Submit ──────────────────────────────────────────────────────── */
    .fl-submit {
      width: 100%;
      padding: 14px 18px;
      margin-top: 4px;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(135deg, #1a3a6e 0%, #2596be 100%);
      color: #fff;
      font-size: 0.98rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 22px rgba(26, 58, 110, 0.30);
      transition: transform 0.18s, box-shadow 0.18s, filter 0.15s;
      letter-spacing: 0.01em;
    }
    .fl-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 14px 28px rgba(26, 58, 110, 0.38);
      filter: brightness(1.05);
    }
    .fl-submit:active:not(:disabled) { transform: translateY(0); }
    .fl-submit:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }
    .fl-spinner-row { display: inline-flex; align-items: center; gap: 10px; }
    .fl-spinner {
      width: 16px; height: 16px;
      border: 2.5px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: fl-spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes fl-spin { to { transform: rotate(360deg); } }

    /* ── Foot ────────────────────────────────────────────────────────── */
    .fl-foot {
      text-align: center;
      margin: 14px 0 0;
      font-size: 0.78rem;
      color: #94a3b8;
    }

    /* ── Success animation ───────────────────────────────────────────── */
    .fl-success-anim {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px 0;
      animation: fl-fade-in 0.4s ease;
    }
    @keyframes fl-fade-in { from { opacity: 0; } to { opacity: 1; } }
    .fl-check-circle { width: 80px; height: 80px; }
    .fl-check-circle svg { width: 100%; height: 100%; display: block; }
    .fl-check-bg {
      stroke: #10b981;
      stroke-width: 2.5;
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      animation: fl-draw-circle 0.55s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }
    .fl-check-mark {
      stroke: #10b981;
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 50;
      stroke-dashoffset: 50;
      animation: fl-draw-check 0.4s cubic-bezier(0.65, 0, 0.45, 1) 0.55s forwards;
    }
    @keyframes fl-draw-circle { to { stroke-dashoffset: 0; } }
    @keyframes fl-draw-check  { to { stroke-dashoffset: 0; } }
    .fl-success-text {
      margin: 0;
      font-weight: 700;
      color: #047857;
      font-size: 1rem;
    }

    /* ── Responsive ──────────────────────────────────────────────────── */
    @media (max-width: 480px) {
      .fl-card { padding: 28px 22px; border-radius: 18px; }
      .fl-header h1 { font-size: 1.25rem; }
    }
  `]
})
export class FirstLoginPasswordChangeComponent {
  enChargement = false;
  succes = false;
  messageErreur = '';

  // Toggles d'affichage des mots de passe
  afficherAncien = false;
  afficherNouveau = false;
  afficherConfirmation = false;

  readonly formulaire;

  constructor(
    private readonly fb: FormBuilder,
    private readonly serviceProfil: ServiceProfilService,
    private readonly authService: AuthentificationService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.formulaire = this.fb.group({
      ancienMotDePasse: ['', [Validators.required]],
      nouveauMotDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmationNouveauMotDePasse: ['', [Validators.required]]
    });
  }

  // ── Helpers d'affichage ──────────────────────────────────────────────

  /** Affiche l'erreur d'un champ s'il a été touché. */
  estChampInvalide(nom: string): boolean {
    const ctrl = this.formulaire.get(nom);
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  /** Vrai si la confirmation ne correspond pas au nouveau mot de passe. */
  get confirmationInvalide(): boolean {
    const confirmation = this.formulaire.get('confirmationNouveauMotDePasse');
    if (!confirmation) return false;
    const touche = confirmation.touched || confirmation.dirty;
    if (!touche || !confirmation.value) return false;
    return confirmation.value !== this.formulaire.get('nouveauMotDePasse')?.value;
  }

  /** Valeur courante du nouveau mot de passe (utilisée pour l'indicateur de force). */
  get nouveauMdpValue(): string {
    return String(this.formulaire.get('nouveauMotDePasse')?.value ?? '');
  }

  /**
   * Score de robustesse du mot de passe (0..3) :
   *   - 1 point si longueur ≥ 8
   *   - 1 point si contient majuscule + minuscule
   *   - 1 point si contient un chiffre OU un caractère spécial
   * Combiné en label : Faible (1) / Moyen (2) / Fort (3+).
   */
  get forceMdpScore(): number {
    const v = this.nouveauMdpValue;
    if (!v) return 0;
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/[0-9]/.test(v) || /[^A-Za-z0-9]/.test(v)) score++;
    return score;
  }

  get forceMdp(): 'faible' | 'moyen' | 'fort' {
    const s = this.forceMdpScore;
    if (s <= 1) return 'faible';
    if (s === 2) return 'moyen';
    return 'fort';
  }

  get forceMdpLabel(): string {
    return { faible: 'Faible', moyen: 'Moyen', fort: 'Fort' }[this.forceMdp];
  }

  /** Bouton actif quand le form est globalement valide + confirmation OK + force ≥ moyen. */
  get boutonActif(): boolean {
    if (this.formulaire.invalid) return false;
    if (this.confirmationInvalide) return false;
    if (this.confirmation !== this.nouveauMdpValue) return false;
    return this.forceMdpScore >= 2;
  }

  private get confirmation(): string {
    return String(this.formulaire.get('confirmationNouveauMotDePasse')?.value ?? '');
  }

  // ── Soumission ───────────────────────────────────────────────────────

  soumettre(): void {
    this.messageErreur = '';

    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    const valeurs = this.formulaire.getRawValue();
    if (valeurs.nouveauMotDePasse !== valeurs.confirmationNouveauMotDePasse) {
      this.messageErreur = 'Les mots de passe ne correspondent pas.';
      return;
    }

    const validation = this.serviceProfil.validerMotDePasse(valeurs.nouveauMotDePasse ?? '');
    if (!validation.estValide) {
      this.messageErreur = validation.erreurs[0]
        || 'Votre mot de passe doit contenir au minimum 8 caractères, une majuscule et un chiffre.';
      return;
    }

    this.enChargement = true;

    this.serviceProfil.mettreAJourMotDePasse({
      motDePasseActuel: valeurs.ancienMotDePasse ?? '',
      nouveauMotDePasse: valeurs.nouveauMotDePasse ?? '',
      confirmationMotDePasse: valeurs.confirmationNouveauMotDePasse ?? ''
    }).subscribe({
      next: () => {
        this.enChargement = false;
        this.succes = true;
        const retourUrl = this.route.snapshot.queryParamMap.get('retourUrl');
        const destination = retourUrl && !retourUrl.startsWith('/premiere-connexion')
          ? retourUrl
          : this.authService.getRouteTableauDeBord();
        setTimeout(() => {
          void this.router.navigateByUrl(destination);
        }, 1400);
      },
      error: (error) => {
        this.enChargement = false;
        this.messageErreur =
          error?.error?.message
          || error?.error
          || error?.message
          || 'Impossible de modifier le mot de passe.';
      }
    });
  }
}
