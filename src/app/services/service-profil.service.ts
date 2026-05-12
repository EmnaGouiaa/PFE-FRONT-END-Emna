import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';
import { AuthentificationService, ReponseAuthentification } from './authentification.service';

export interface DonneesProfil {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  role: string;
  telephone?: string;
  adresse?: string;
  matricule?: string;
  grade?: string;
  poste?: string;
  service?: string;
  specialite?: string;
  dateNaiss?: string;
  entrepriseId?: number | null;
  entrepriseNom?: string;
  filiereId?: number | null;
  filiereNom?: string;
  niveau?: number | null;
  nomFichierSignature?: string;
  actif: boolean;
  creeLe: string;
  misAJourLe: string;
  champsProfilAutorises: string[];
  documentsStageAutorises: string[];
}

export interface MiseAJourProfil {
  prenom: string;
  nom: string;
  telephone?: string;
  motDePasseActuel?: string;
  nouveauMotDePasse?: string;
  confirmationMotDePasse?: string;
  adresse?: string;
  poste?: string;
  service?: string;
  specialite?: string;
  grade?: string;
  matricule?: string;
  dateNaiss?: string;
  niveau?: number | null;
  nomFichierSignature?: string;
}

export interface MiseAJourEmail {
  email: string;
  motDePasseActuel: string;
}

export interface MiseAJourMotDePasse {
  motDePasseActuel: string;
  nouveauMotDePasse: string;
  confirmationMotDePasse: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceProfilService {
  private readonly API_URL = `${API_BASE_URL}/utilisateurs`;
  private readonly AUTH_URL = `${API_BASE_URL}/auth`;
  private readonly signatureCachePrefix = 'nomFichierSignature';

  constructor(
    private http: HttpClient,
    private authService: AuthentificationService
  ) {}

  getProfil(): Observable<DonneesProfil> {
    const userId = this.requireUserId();

    return this.http.get<any>(`${this.AUTH_URL}/me`).pipe(
      map((response) => this.normalizeProfile(response)),
      catchError(() => of(this.profileFromSession(userId)))
    );
  }

  mettreAJourProfil(donnees: MiseAJourProfil): Observable<DonneesProfil> {
    const userId = this.requireUserId();
    const requestBody = {
      prenom: this.normalizeOptionalString(donnees.prenom),
      nom: this.normalizeOptionalString(donnees.nom),
      telephone: this.normalizeOptionalString(donnees.telephone),
      adresse: this.normalizeOptionalString(donnees.adresse),
      poste: this.normalizeOptionalString(donnees.poste),
      service: this.normalizeOptionalString(donnees.service),
      specialite: this.normalizeOptionalString(donnees.specialite),
      grade: this.normalizeOptionalString(donnees.grade),
      matricule: this.normalizeOptionalString(donnees.matricule),
      dateNaiss: this.normalizeOptionalString(donnees.dateNaiss),
      niveau: donnees.niveau ?? undefined,
      nomFichierSignature: this.normalizeOptionalString(donnees.nomFichierSignature)
    };

    return this.http.patch<any>(`${this.API_URL}/me/profile`, requestBody).pipe(
      map((response) => this.normalizeProfile(response)),
      catchError(error => throwError(() => error))
    );
  }

  modifierAdresseEmail(donnees: MiseAJourEmail): Observable<DonneesProfil> {
    const requestBody = {
      email: this.normalizeOptionalString(donnees.email),
      motDePasseActuel: donnees.motDePasseActuel
    };

    return this.http.patch<ReponseAuthentification & { message?: string }>(`${this.API_URL}/me/email`, requestBody).pipe(
      tap((response) => this.authService.actualiserSession(response)),
      switchMap(() => this.getProfil()),
      catchError(error => throwError(() => error))
    );
  }

  mettreAJourMotDePasse(donnees: MiseAJourMotDePasse): Observable<DonneesProfil> {
    const requestBody = {
      ancienMotDePasse: donnees.motDePasseActuel,
      nouveauMotDePasse: donnees.nouveauMotDePasse,
      confirmationNouveauMotDePasse: donnees.confirmationMotDePasse
    };

    return this.http.patch<any>(`${this.API_URL}/me/mot-de-passe`, requestBody).pipe(
      map((response) => this.normalizeProfile(response)),
      tap(() => this.authService.marquerMotDePasseModifie()),
      catchError(error => throwError(() => error))
    );
  }

  getNomAffichageRole(role: string): string {
    const mapRole: { [key: string]: string } = {
      STAGIAIRE: 'Étudiant',
      ADMINISTRATEUR: 'Administrateur',
      RESPONSABLE_ENTREPRISE: 'Représentant de l’entreprise',
      ENCADRANT_PROFESSIONNEL: 'Encadrant professionnel',
      ENCADRANT_ACADEMIQUE: 'Encadrant académique',
      RESPONSABLE_SERVICE_STAGES: 'Responsable des stages',
      RESPONSABLE_UNIVERSITAIRE_STAGES: 'Responsable universitaire des stages'
    };
    return mapRole[role] || role;
  }

  formaterDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  validerMotDePasse(motDePasse: string): { estValide: boolean; erreurs: string[] } {
    const erreurs: string[] = [];
    if (motDePasse.length < 8) erreurs.push('Le mot de passe doit contenir au moins 8 caractères');
    if (!/[a-z]/.test(motDePasse)) erreurs.push('Le mot de passe doit contenir au moins une lettre minuscule');
    if (!/[A-Z]/.test(motDePasse)) erreurs.push('Le mot de passe doit contenir au moins une lettre majuscule');
    if (!/\d/.test(motDePasse)) erreurs.push('Le mot de passe doit contenir au moins un chiffre');
    return { estValide: erreurs.length === 0, erreurs };
  }

  private requireUserId(): number {
    const userId = this.authService.getUserId();
    if (!userId) {
      throw new Error('Utilisateur connecté introuvable.');
    }
    return userId;
  }

  private normalizeProfile(raw: any): DonneesProfil {
    const profile = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
    const current = this.authService.getUtilisateurActuel();
    const id = Number(profile?.id ?? profile?.userId ?? current?.userId ?? 0);
    const signature = String(profile?.nomFichierSignature ?? this.getCachedSignature(id) ?? '');
    const role = String(profile?.role ?? current?.role ?? '');
    const champsProfilAutorises = this.normalizeStringList(profile?.champsProfilAutorises);
    this.cacheSignature(id, signature);

    return {
      id,
      email: String(profile?.email ?? current?.email ?? ''),
      prenom: String(profile?.prenom ?? current?.prenom ?? ''),
      nom: String(profile?.nom ?? current?.nom ?? ''),
      role,
      telephone: String(profile?.telephone ?? ''),
      adresse: String(profile?.adresse ?? ''),
      matricule: String(profile?.matricule ?? ''),
      grade: String(profile?.grade ?? ''),
      poste: String(profile?.poste ?? ''),
      service: String(profile?.service ?? ''),
      specialite: String(profile?.specialite ?? ''),
      dateNaiss: String(profile?.dateNaiss ?? ''),
      entrepriseId: this.normalizeId(profile?.entrepriseId),
      entrepriseNom: String(profile?.entrepriseNom ?? ''),
      filiereId: this.normalizeId(profile?.filiereId),
      filiereNom: String(profile?.filiereNom ?? ''),
      niveau: this.normalizeNumber(profile?.niveau),
      nomFichierSignature: signature,
      actif: Boolean(profile?.actif ?? true),
      creeLe: String(profile?.creeLe ?? ''),
      misAJourLe: String(profile?.misAJourLe ?? ''),
      champsProfilAutorises: champsProfilAutorises.length ? champsProfilAutorises : this.defaultProfileFields(role),
      documentsStageAutorises: this.normalizeStringList(profile?.documentsStageAutorises)
    };
  }

  private profileFromSession(userId: number): DonneesProfil {
    const current = this.authService.getUtilisateurActuel();
    return {
      id: userId,
      email: current?.email ?? this.authService.getEmail() ?? '',
      prenom: current?.prenom ?? '',
      nom: current?.nom ?? '',
      role: String(current?.role ?? this.authService.getRoleUtilisateur() ?? ''),
      telephone: '',
      adresse: '',
      matricule: '',
      grade: '',
      poste: '',
      service: '',
      specialite: '',
      dateNaiss: '',
      entrepriseId: null,
      entrepriseNom: '',
      filiereId: null,
      filiereNom: '',
      niveau: null,
      nomFichierSignature: this.getCachedSignature(userId),
      actif: true,
      creeLe: '',
      misAJourLe: '',
      champsProfilAutorises: this.defaultProfileFields(String(current?.role ?? this.authService.getRoleUtilisateur() ?? '')),
      documentsStageAutorises: []
    };
  }

  private normalizeStringList(value: unknown): string[] {
    return Array.isArray(value)
      ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];
  }

  private defaultProfileFields(role: string): string[] {
    const common = ['email', 'nom', 'prenom', 'telephone', 'adresse', 'nomFichierSignature'];
    const specific: Record<string, string[]> = {
      STAGIAIRE: ['dateNaiss', 'matricule'],
      ENCADRANT_ACADEMIQUE: ['grade', 'specialite'],
      ENCADRANT_PROFESSIONNEL: ['poste', 'service'],
      RESPONSABLE_ENTREPRISE: ['poste', 'service'],
      RESPONSABLE_SERVICE_STAGES: ['service'],
      RESPONSABLE_UNIVERSITAIRE_STAGES: []
    };
    return [...common, ...(specific[role] ?? [])];
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private normalizeId(value: unknown): number | null {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private normalizeNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private cacheSignature(userId: number, signature: string): void {
    try {
      localStorage.setItem(`${this.signatureCachePrefix}:${userId}`, signature.trim());
    } catch {
      // Cache best-effort only.
    }
  }

  private getCachedSignature(userId: number): string {
    try {
      return localStorage.getItem(`${this.signatureCachePrefix}:${userId}`) ?? '';
    } catch {
      return '';
    }
  }
}
