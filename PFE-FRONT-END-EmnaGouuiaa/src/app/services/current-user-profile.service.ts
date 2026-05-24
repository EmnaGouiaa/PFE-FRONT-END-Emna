import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';
import { AuthentificationService, ReponseAuthentification } from './authentification.service';

export interface CurrentUserProfile {
  id: number;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  telephone: string;
  adresse: string;
  matricule: string;
  grade: string;
  specialite: string;
  poste: string;
  service: string;
  entrepriseId: number | null;
  entrepriseNom: string;
  filiereId: number | null;
  filiereNom: string;
  niveau: number | null;
  actif: boolean;
  nomFichierSignature: string;
}

export interface CurrentUserProfileUpdateRequest {
  prenom?: string;
  nom?: string;
  telephone?: string;
  adresse?: string;
  poste?: string;
  service?: string;
  specialite?: string;
  nomFichierSignature?: string;
}

export interface CurrentUserEmailUpdateRequest {
  email: string;
  motDePasseActuel: string;
}

@Injectable({ providedIn: 'root' })
export class CurrentUserProfileService {
  private readonly usersUrl = `${API_BASE_URL}/utilisateurs`;
  private readonly authUrl = `${API_BASE_URL}/auth`;
  private readonly signatureCachePrefix = 'nomFichierSignature';

  constructor(
    private http: HttpClient,
    private authService: AuthentificationService
  ) {}

  getCurrentProfile(): Observable<CurrentUserProfile> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('Utilisateur connecté introuvable.'));
    }

    return this.http.get<any>(`${this.authUrl}/me`).pipe(
      map((raw) => this.normalizeProfile(raw)),
      tap((profile) => this.cacheSignature(profile.id, profile.nomFichierSignature)),
      catchError((error) => {
        if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403 || error.status === 404)) {
          return of(this.profileFromSession(userId));
        }

        return of(this.profileFromSession(userId));
      })
    );
  }

  updateCurrentProfile(payload: CurrentUserProfileUpdateRequest): Observable<CurrentUserProfile> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('Utilisateur connecté introuvable.'));
    }

    return this.http.patch<any>(`${this.usersUrl}/me/profile`, this.toPatchBody(payload)).pipe(
      map((raw) => this.normalizeProfile(raw)),
      tap((profile) => this.cacheSignature(profile.id, profile.nomFichierSignature)),
      switchMap(() => this.getCurrentProfile())
    );
  }

  updateCurrentEmail(payload: CurrentUserEmailUpdateRequest): Observable<CurrentUserProfile> {
    const userId = this.authService.getUserId();
    if (!userId) {
      return throwError(() => new Error('Utilisateur connecté introuvable.'));
    }

    const requestBody = {
      email: this.normalizeOptionalString(payload.email),
      motDePasseActuel: payload.motDePasseActuel
    };

    return this.http.patch<ReponseAuthentification & { message?: string }>(`${this.usersUrl}/me/email`, requestBody).pipe(
      tap((response) => this.authService.actualiserSession(response)),
      switchMap(() => this.getCurrentProfile())
    );
  }

  hasSignature(): boolean {
    return Boolean(this.getCachedSignature()?.trim());
  }

  getCachedSignature(): string {
    const userId = this.authService.getUserId();
    if (!userId) return '';

    try {
      return localStorage.getItem(this.cacheKey(userId)) ?? '';
    } catch {
      return '';
    }
  }

  cacheSignature(userId: number, signature: string | null | undefined): void {
    try {
      localStorage.setItem(this.cacheKey(userId), String(signature ?? '').trim());
    } catch {
      // Cache best-effort only.
    }
  }

  describeError(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      return error.error?.message ?? error.message ?? fallback;
    }

    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message?: unknown }).message ?? fallback);
    }

    return fallback;
  }

  private toPatchBody(payload: CurrentUserProfileUpdateRequest): Record<string, unknown> {
    return {
      prenom: this.normalizeOptionalString(payload.prenom),
      nom: this.normalizeOptionalString(payload.nom),
      telephone: this.normalizeOptionalString(payload.telephone),
      adresse: this.normalizeOptionalString(payload.adresse),
      poste: this.normalizeOptionalString(payload.poste),
      service: this.normalizeOptionalString(payload.service),
      specialite: this.normalizeOptionalString(payload.specialite),
      // Le backend (UpdateProfileRequest) attend le champ "urlSignature".
      // On envoie la valeur brute (y compris '') pour qu'une chaîne vide efface la signature.
      urlSignature: typeof payload.nomFichierSignature === 'string'
        ? payload.nomFichierSignature.trim()
        : undefined
    };
  }

  private normalizeProfile(raw: any): CurrentUserProfile {
    const profile = raw && typeof raw === 'object' && 'data' in raw ? raw.data : raw;
    const id = Number(profile?.id ?? profile?.userId ?? this.authService.getUserId() ?? 0);

    return {
      id,
      prenom: String(profile?.prenom ?? this.authService.getUtilisateurActuel()?.prenom ?? ''),
      nom: String(profile?.nom ?? this.authService.getUtilisateurActuel()?.nom ?? ''),
      email: String(profile?.email ?? this.authService.getEmail() ?? ''),
      role: String(profile?.role ?? this.authService.getRoleUtilisateur() ?? ''),
      telephone: String(profile?.telephone ?? ''),
      adresse: String(profile?.adresse ?? ''),
      matricule: String(profile?.matricule ?? ''),
      grade: String(profile?.grade ?? ''),
      specialite: String(profile?.specialite ?? ''),
      poste: String(profile?.poste ?? ''),
      service: String(profile?.service ?? ''),
      entrepriseId: this.normalizeId(profile?.entrepriseId),
      entrepriseNom: String(profile?.entrepriseNom ?? ''),
      filiereId: this.normalizeId(profile?.filiereId),
      filiereNom: String(profile?.filiereNom ?? ''),
      niveau: this.normalizeNumber(profile?.niveau),
      actif: Boolean(profile?.actif ?? true),
      // Le backend renvoie "urlSignature" ; "nomFichierSignature" est gardé comme repli legacy.
      nomFichierSignature: String(profile?.urlSignature ?? profile?.nomFichierSignature ?? this.getCachedSignature() ?? '')
    };
  }

  private profileFromSession(userId: number): CurrentUserProfile {
    const currentUser = this.authService.getUtilisateurActuel();

    return {
      id: userId,
      prenom: currentUser?.prenom ?? '',
      nom: currentUser?.nom ?? '',
      email: currentUser?.email ?? this.authService.getEmail() ?? '',
      role: String(currentUser?.role ?? this.authService.getRoleUtilisateur() ?? ''),
      telephone: '',
      adresse: '',
      matricule: '',
      grade: '',
      specialite: '',
      poste: '',
      service: '',
      entrepriseId: null,
      entrepriseNom: '',
      filiereId: null,
      filiereNom: '',
      niveau: null,
      actif: true,
      nomFichierSignature: this.getCachedSignature()
    };
  }

  private normalizeId(value: unknown): number | null {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private normalizeNumber(value: unknown): number | null {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private normalizeOptionalString(value: unknown): string | undefined {
    const normalized = String(value ?? '').trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private cacheKey(userId: number): string {
    return `${this.signatureCachePrefix}:${userId}`;
  }
}
