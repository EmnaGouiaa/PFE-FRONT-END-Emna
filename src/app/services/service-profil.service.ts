import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface DonneesProfil {
  id: number;
  email: string;
  prenom: string;
  nom: string;
  role: string;
  telephone?: string;
  adresse?: string;
  poste?: string;
  specialite?: string;
  actif: boolean;
  creeLe: string;
  misAJourLe: string;
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
  specialite?: string;
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
  private readonly API_URL = `${API_BASE_URL}/profil`;

  constructor(private http: HttpClient) {}

  getProfil(): Observable<DonneesProfil> {
    return this.http.get<DonneesProfil>(this.API_URL)
      .pipe(catchError(error => throwError(() => error)));
  }

  mettreAJourProfil(donnees: MiseAJourProfil): Observable<DonneesProfil> {
    return this.http.put<DonneesProfil>(this.API_URL, donnees)
      .pipe(catchError(error => throwError(() => error)));
  }

  mettreAJourMotDePasse(donnees: MiseAJourMotDePasse): Observable<DonneesProfil> {
    return this.http.put<DonneesProfil>(`${this.API_URL}/mot-de-passe`, donnees)
      .pipe(catchError(error => throwError(() => error)));
  }

  desactiverCompte(): Observable<DonneesProfil> {
    return this.http.put<DonneesProfil>(`${this.API_URL}/desactiver`, {})
      .pipe(catchError(error => throwError(() => error)));
  }

  getNomAffichageRole(role: string): string {
    const mapRole: { [key: string]: string } = {
      'STAGIAIRE': 'Étudiant',
      'ADMINISTRATEUR': 'Administrateur',
      'RESPONSABLE_ENTREPRISE': 'Représentant Entreprise',
      'ENCADRANT_PROFESSIONNEL': 'Encadrant Professionnel',
      'ENCADRANT_ACADEMIQUE': 'Encadrant Académique'
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
}
