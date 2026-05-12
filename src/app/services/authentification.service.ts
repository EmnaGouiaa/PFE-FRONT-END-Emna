import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export enum RoleUtilisateur {
  ADMINISTRATEUR = 'ADMINISTRATEUR',
  STAGIAIRE = 'STAGIAIRE',
  ENCADRANT_ACADEMIQUE = 'ENCADRANT_ACADEMIQUE',
  ENCADRANT_PROFESSIONNEL = 'ENCADRANT_PROFESSIONNEL',
  RESPONSABLE_ENTREPRISE = 'RESPONSABLE_ENTREPRISE',
  RESPONSABLE_SERVICE_STAGES = 'RESPONSABLE_SERVICE_STAGES',
  // Present in routes/admin UI; keep for backward compatibility.
  AGENT_STAGE = 'AGENT_STAGE',
  RESPONSABLE_UNIVERSITAIRE_STAGES = 'RESPONSABLE_UNIVERSITAIRE_STAGES'
}

export interface RequeteAuthentification {
  email: string;
  motDePasse: string;
}

export interface ReponseAuthentification {
  token: string;
  userId: number;
  nom: string;
  prenom: string;
  email: string;
  role: RoleUtilisateur | string;
  doitChangerMotDePasse?: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface UtilisateurActuel {
  userId: number | null;
  nom: string;
  prenom: string;
  email: string;
  role: RoleUtilisateur | null;
  doitChangerMotDePasse: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthentificationService {
  private readonly apiUrl = `${API_BASE_URL}/auth`;
  private readonly cleToken = 'token';
  private readonly cleRole = 'role';
  private readonly cleUserId = 'userId';
  private readonly cleNom = 'nom';
  private readonly clePrenom = 'prenom';
  private readonly cleEmail = 'email';
  private readonly cleDoitChangerMotDePasse = 'doitChangerMotDePasse';

  private readonly estAuthentifieSubject = new BehaviorSubject<boolean>(this.estAuthentifie());
  readonly estAuthentifie$ = this.estAuthentifieSubject.asObservable();

  private readonly utilisateurActuelSubject = new BehaviorSubject<UtilisateurActuel | null>(
    this.lireUtilisateurDepuisStockage()
  );
  readonly utilisateurActuel$ = this.utilisateurActuelSubject.asObservable();

  constructor(private http: HttpClient) {}

  connexion(donnees: RequeteAuthentification): Observable<ReponseAuthentification> {
    console.log('🌍 AuthentificationService: Tentative de connexion...');

    const body: RequeteAuthentification = {
      email: donnees.email.trim(),
      motDePasse: donnees.motDePasse
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<ReponseAuthentification>(`${this.apiUrl}/login`, body, { headers }).pipe(
      tap((reponse) => {
        console.log('✅ Connexion réussie :', reponse);
        this.sauvegarderSession(reponse);
      }),
      catchError((erreur: HttpErrorResponse) => {
        console.error('❌ Erreur de connexion :', erreur);
        return throwError(() => erreur);
      })
    );
  }

  forgotPassword(donnees: ForgotPasswordRequest): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/forgot-password`, {
      email: donnees.email.trim()
    }).pipe(
      catchError((erreur: HttpErrorResponse) => throwError(() => erreur))
    );
  }

  resetPassword(donnees: ResetPasswordRequest): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(`${this.apiUrl}/reset-password`, {
      email: donnees.email.trim(),
      code: donnees.code.trim(),
      newPassword: donnees.newPassword,
      confirmPassword: donnees.confirmPassword
    }).pipe(
      catchError((erreur: HttpErrorResponse) => throwError(() => erreur))
    );
  }

  deconnexion(): void {
    localStorage.removeItem(this.cleToken);
    localStorage.removeItem(this.cleRole);
    localStorage.removeItem(this.cleUserId);
    localStorage.removeItem(this.cleNom);
    localStorage.removeItem(this.clePrenom);
    localStorage.removeItem(this.cleEmail);
    localStorage.removeItem(this.cleDoitChangerMotDePasse);

    // Legacy keys that can cause stale auth mixing.
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userRole');

    this.estAuthentifieSubject.next(false);
    this.utilisateurActuelSubject.next(null);
  }

  estAuthentifie(): boolean {
    return !!this.getToken();
  }

  // Alias expected by migrated guards/interceptor.
  effacerDonneesAuthentification(): void {
    this.deconnexion();
  }

  getToken(): string | null {
    return localStorage.getItem(this.cleToken);
  }

  getRole(): string | null {
    return localStorage.getItem(this.cleRole);
  }

  getRoleUtilisateur(): RoleUtilisateur | null {
    // Source of truth: the JWT token claims. Fallback to the stored role when decoding is unavailable.
    return this.extraireRoleDepuisToken(this.getToken()) ?? this.normaliserRole(this.getRole());
  }

  getUserId(): number | null {
    const valeur = localStorage.getItem(this.cleUserId);
    return valeur ? Number(valeur) : null;
  }

  getNomComplet(): string {
    const nom = localStorage.getItem(this.cleNom) ?? '';
    const prenom = localStorage.getItem(this.clePrenom) ?? '';
    return `${prenom} ${nom}`.trim();
  }

  getEmail(): string | null {
    return localStorage.getItem(this.cleEmail);
  }

  doitChangerMotDePasse(): boolean {
    return localStorage.getItem(this.cleDoitChangerMotDePasse) === 'true';
  }

  marquerMotDePasseModifie(): void {
    localStorage.setItem(this.cleDoitChangerMotDePasse, 'false');
    const current = this.utilisateurActuelSubject.value;
    if (current) {
      this.utilisateurActuelSubject.next({
        ...current,
        doitChangerMotDePasse: false
      });
    }
  }

  aRole(role: RoleUtilisateur): boolean {
    return this.getRoleUtilisateur() === role;
  }

  estResponsableStages(role: RoleUtilisateur | null = this.getRoleUtilisateur()): boolean {
    return (
      role === RoleUtilisateur.RESPONSABLE_SERVICE_STAGES ||
      role === RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES
    );
  }

  getRouteTableauDeBord(role: RoleUtilisateur | null = this.getRoleUtilisateur()): string {
    switch (role) {
      case RoleUtilisateur.ADMINISTRATEUR:
        return '/admin/tableau-de-bord';
      case RoleUtilisateur.STAGIAIRE:
        return '/etudiant/tableau-de-bord';
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return '/encadrant-professionnel/tableau-de-bord';
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return '/encadrant-academique/tableau-de-bord';
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
      case RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES:
        return '/responsable/tableau-de-bord';
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return '/entreprise/tableau-de-bord';
      default:
        return '/connexion';
    }
  }

  getUtilisateurActuel(): UtilisateurActuel | null {
    return this.utilisateurActuelSubject.value;
  }

  actualiserSession(reponse: ReponseAuthentification): void {
    this.sauvegarderSession(reponse);
  }

  private sauvegarderSession(reponse: ReponseAuthentification): void {
    // Ensure no stale role/token from previous logins remains.
    this.effacerDonneesDeSessionAvantConnexion();

    // Prefer token claims as source of truth (it must match backend authorization).
    const roleDepuisToken = this.extraireRoleDepuisToken(reponse.token);
    const roleDepuisReponse = this.normaliserRole(String(reponse.role));
    const roleFinal = roleDepuisToken ?? roleDepuisReponse;

    if (roleDepuisReponse && roleDepuisToken !== roleDepuisReponse) {
      console.warn('⚠️ Rôle différent entre token et réponse. Token:', roleDepuisToken, 'Réponse:', roleDepuisReponse);
    }

    if (!roleDepuisToken) {
      console.warn('⚠️ Impossible d’extraire un rôle depuis le token JWT. Vérifiez les claims (role/roles/authorities).');
    }

    localStorage.setItem(this.cleToken, reponse.token);
    // Persist the resolved role to keep redirects/guards stable even if token decoding fails later.
    if (roleFinal) {
      localStorage.setItem(this.cleRole, String(roleFinal));
    } else {
      localStorage.removeItem(this.cleRole);
    }
    localStorage.setItem(this.cleUserId, String(reponse.userId));
    localStorage.setItem(this.cleNom, reponse.nom);
    localStorage.setItem(this.clePrenom, reponse.prenom);
    localStorage.setItem(this.cleEmail, reponse.email);
    localStorage.setItem(this.cleDoitChangerMotDePasse, String(Boolean(reponse.doitChangerMotDePasse)));

    this.estAuthentifieSubject.next(true);
    this.utilisateurActuelSubject.next(this.construireUtilisateurActuel(reponse));
  }

  private lireUtilisateurDepuisStockage(): UtilisateurActuel | null {
    if (!this.getToken()) return null;

    const nom = localStorage.getItem(this.cleNom) ?? '';
    const prenom = localStorage.getItem(this.clePrenom) ?? '';
    const email = localStorage.getItem(this.cleEmail) ?? '';
    const role = this.getRoleUtilisateur();
    const userId = this.getUserId();

    return {
      userId,
      nom,
      prenom,
      email,
      role,
      doitChangerMotDePasse: this.doitChangerMotDePasse()
    };
  }

  private construireUtilisateurActuel(reponse: ReponseAuthentification): UtilisateurActuel {
    const roleDepuisToken = this.extraireRoleDepuisToken(reponse.token);
    const roleDepuisReponse = this.normaliserRole(String(reponse.role));

    return {
      userId: reponse.userId,
      nom: reponse.nom,
      prenom: reponse.prenom,
      email: reponse.email,
      role: roleDepuisToken ?? roleDepuisReponse,
      doitChangerMotDePasse: Boolean(reponse.doitChangerMotDePasse)
    };
  }

  private normaliserRole(role: string | null): RoleUtilisateur | null {
    if (!role) return null;

    // Already in the new enum values.
    const valeurs = Object.values(RoleUtilisateur) as string[];
    const roleNettoye = role.startsWith('ROLE_') ? role.slice('ROLE_'.length) : role;
    if (valeurs.includes(roleNettoye)) return roleNettoye as RoleUtilisateur;

    // Legacy/alternate spellings.
    const roleUpper = roleNettoye.toUpperCase();
    if (roleUpper === 'ADMIN') return RoleUtilisateur.ADMINISTRATEUR;

    return null;
  }

  private effacerDonneesDeSessionAvantConnexion(): void {
    // Clear both current and known legacy keys before storing a new session.
    const cles = [
      this.cleToken,
      this.cleRole,
      this.cleUserId,
      this.cleNom,
      this.clePrenom,
      this.cleEmail,
      this.cleDoitChangerMotDePasse,
      'jwtToken',
      'userRole'
    ];

    for (const cle of cles) {
      try {
        localStorage.removeItem(cle);
      } catch {
        // ignore
      }
    }
  }

  private extraireRoleDepuisToken(token: string | null | undefined): RoleUtilisateur | null {
    if (!token) return null;

    const payload = this.decoderJwtPayload(token);
    if (!payload) return null;

    const candidats: string[] = [];

    if (typeof payload.role === 'string') candidats.push(payload.role);
    if (typeof payload.roles === 'string') candidats.push(payload.roles);
    if (Array.isArray(payload.roles)) candidats.push(...payload.roles);

    const authorities = payload.authorities ?? payload.authority;
    if (typeof authorities === 'string') candidats.push(authorities);
    if (Array.isArray(authorities)) {
      for (const a of authorities) {
        if (typeof a === 'string') candidats.push(a);
        else if (a && typeof a === 'object' && typeof (a as any).authority === 'string') {
          candidats.push((a as any).authority);
        }
      }
    }

    for (const candidat of candidats) {
      const role = this.normaliserRole(String(candidat).trim());
      if (role) return role;
    }

    return null;
  }

  private decoderJwtPayload(token: string): any | null {
    const parties = token.split('.');
    if (parties.length !== 3) return null;

    let base64 = parties[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding) base64 += '='.repeat(4 - padding);

    try {
      return JSON.parse(atob(base64));
    } catch {
      return null;
    }
  }
}
