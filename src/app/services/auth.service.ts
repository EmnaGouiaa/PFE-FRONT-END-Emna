import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  AuthentificationService,
  ReponseAuthentification,
  RoleUtilisateur,
  UtilisateurActuel
} from './authentification.service';

// Compatibility layer for the pre-migration API (AuthService/UserRole/User).
// The app's source of truth remains AuthentificationService/RoleUtilisateur.

export enum UserRole {
  ADMIN = RoleUtilisateur.ADMINISTRATEUR,
  STAGIAIRE = RoleUtilisateur.STAGIAIRE,
  ENCADRANT_ACADEMIQUE = RoleUtilisateur.ENCADRANT_ACADEMIQUE,
  ENCADRANT_PROFESSIONNEL = RoleUtilisateur.ENCADRANT_PROFESSIONNEL,
  RESPONSABLE_ENTREPRISE = RoleUtilisateur.RESPONSABLE_ENTREPRISE,
  RESPONSABLE_SERVICE_STAGES = RoleUtilisateur.RESPONSABLE_SERVICE_STAGES,
  AGENT_STAGE = RoleUtilisateur.AGENT_STAGE,
  RESPONSABLE_UNIVERSITAIRE_STAGES = RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES
}

export interface User {
  id: number | null;
  prenom: string;
  nom: string;
  email: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  readonly currentUser$: Observable<User | null>;
  readonly estAuthentifie$: Observable<boolean>;

  constructor(private serviceAuthentification: AuthentificationService) {
    this.estAuthentifie$ = this.serviceAuthentification.estAuthentifie$;
    this.currentUser$ = this.serviceAuthentification.utilisateurActuel$.pipe(
      map((utilisateur) => (utilisateur ? this.toLegacyUser(utilisateur) : null))
    );
  }

  // Legacy API: { email, password } + Observable response.
  login(donnees: { email: string; password: string }): Observable<ReponseAuthentification> {
    return this.serviceAuthentification.connexion({
      email: donnees.email,
      motDePasse: donnees.password
    });
  }

  logout(): void {
    this.serviceAuthentification.deconnexion();
  }

  isLoggedIn(): boolean {
    return this.serviceAuthentification.estAuthentifie();
  }

  getToken(): string | null {
    return this.serviceAuthentification.getToken();
  }

  getCurrentUser(): User | null {
    const utilisateur = this.serviceAuthentification.getUtilisateurActuel();
    return utilisateur ? this.toLegacyUser(utilisateur) : null;
  }

  // Legacy string role used by some older guards/components.
  getUserRole(): string | null {
    const roleBrut = this.serviceAuthentification.getRole();
    if (!roleBrut) return null;

    const roleUpper = roleBrut.toUpperCase();
    if (roleUpper === 'ADMINISTRATEUR') return 'ADMIN';
    return roleBrut;
  }

  hasRole(
    role: RoleUtilisateur | UserRole | string | Array<RoleUtilisateur | UserRole | string>
  ): boolean {
    const rolesDemandes = Array.isArray(role) ? role : [role];
    const roleUtilisateur = this.serviceAuthentification.getRoleUtilisateur();
    if (!roleUtilisateur) return false;

    return rolesDemandes.some((r) => this.normaliserRole(String(r)) === roleUtilisateur);
  }

  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  isStagiaire(): boolean {
    return this.hasRole(UserRole.STAGIAIRE);
  }

  isEncadrant(): boolean {
    return this.hasRole([UserRole.ENCADRANT_ACADEMIQUE, UserRole.ENCADRANT_PROFESSIONNEL]);
  }

  isResponsable(): boolean {
    return this.hasRole([
      UserRole.RESPONSABLE_SERVICE_STAGES,
      UserRole.RESPONSABLE_ENTREPRISE,
      UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES
    ]);
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    const payload = this.decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return true;

    return Date.now() >= payload.exp * 1000;
  }

  private toLegacyUser(utilisateur: UtilisateurActuel): User {
    return {
      id: utilisateur.userId,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
      email: utilisateur.email,
      role: utilisateur.role ? String(utilisateur.role) : ''
    };
  }

  private normaliserRole(role: string): RoleUtilisateur | null {
    const roleUpper = role.toUpperCase();

    // Allow legacy ADMIN.
    if (roleUpper === 'ADMIN') return RoleUtilisateur.ADMINISTRATEUR;

    // Pass-through for the real enum values.
    const valeurs = Object.values(RoleUtilisateur) as string[];
    if (valeurs.includes(role)) return role as RoleUtilisateur;
    if (valeurs.includes(roleUpper)) return roleUpper as RoleUtilisateur;

    return null;
  }

  private decodeJwtPayload(token: string): any | null {
    const parties = token.split('.');
    if (parties.length !== 3) return null;

    // base64url -> base64
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
