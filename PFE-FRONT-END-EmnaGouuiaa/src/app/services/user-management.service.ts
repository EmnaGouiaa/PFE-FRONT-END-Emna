import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface Filiere {
    id: number;
    nom: string;
}

export interface User {
    id: number;
    prenom: string;
    nom: string;
    email: string;
    role: string;
    actif: boolean;
    matricule?: string;
    filiere?: string;
    filiereId?: number | null;
    filiereNom?: string;
    /** Niveau d'etude du stagiaire (numerique cote backend, parfois serialise en string). */
    niveau?: string | number;
    niveauStage?: string;
    grade?: string;
    specialite?: string;
    departement?: string;
    poste?: string;
    service?: string;
    adresse?: string;
    secteurActivite?: string;
    telephone?: string;
    urlSignature?: string;
    nomFichierSignature?: string;
    emailSent?: boolean | null;
    message?: string;
}

export interface CreateUserRequest {
    prenom: string;
    nom: string;
    email: string;
    telephone?: string;
    role: string;
    /** Matricule du stagiaire — saisi uniquement par l'administrateur à la création. */
    matricule?: string;
    /** Identifiant de la filière — obligatoire pour un STAGIAIRE. */
    filiereId?: number;
    /** Niveau du stagiaire — saisi uniquement par l'administrateur à la création. */
    niveau?: number;
}

export interface UpdateUserRequest {
    prenom?: string;
    nom?: string;
    email?: string;
    telephone?: string;
    nomFichierSignature?: string;
    role?: string;
    actif?: boolean;
    /** Filiere du stagiaire — uniquement transmise lors de la modification d'un STAGIAIRE. */
    filiereId?: number;
    /** Niveau d'etude du stagiaire — uniquement transmis lors de la modification d'un STAGIAIRE. */
    niveau?: number;
}



export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
    count?: number;
}

@Injectable({
    providedIn: 'root'
})
export class UserManagementService {
    private readonly API_URL = `${API_BASE_URL}/users`;

    constructor(private http: HttpClient) { }

    private unwrapAny(response: any): any {
        return (response && typeof response === 'object' && 'data' in response) ? response.data : response;
    }

    private unwrapList<T>(response: any): T[] {
        const raw = this.unwrapAny(response);
        if (Array.isArray(raw)) return raw as T[];

        if (raw && typeof raw === 'object') {
            if (Array.isArray((raw as any).content)) return (raw as any).content as T[];
            if (Array.isArray((raw as any).items)) return (raw as any).items as T[];
            if (Array.isArray((raw as any).results)) return (raw as any).results as T[];
            if (Array.isArray((raw as any).users)) return (raw as any).users as T[];
        }

        return [];
    }

    private unwrapObject<T>(response: any): T {
        return this.unwrapAny(response) as T;
    }

    private normalizeRole(value: unknown): string {
        if (typeof value === 'string') {
            const normalized = value.trim();
            return normalized.startsWith('ROLE_') ? normalized.slice('ROLE_'.length) : normalized;
        }
        if (value && typeof value === 'object') {
            const obj = value as any;
            const raw = String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '').trim();
            return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
        }
        return '';
    }

    private normalizeUser(raw: any): User {
        const id = Number(raw?.id ?? raw?.userId ?? raw?.utilisateurId ?? 0);
        const prenom = String(raw?.prenom ?? raw?.firstName ?? '');
        const nom = String(raw?.nom ?? raw?.lastName ?? '');
        const email = String(raw?.email ?? '');
        const role = this.normalizeRole(raw?.role);

        const actifBrut = raw?.actif ?? raw?.active ?? raw?.enabled ?? raw?.estActif;
        const actif = typeof actifBrut === 'boolean' ? actifBrut : true;

        return {
            id,
            prenom,
            nom,
            email,
            role,
            actif,
            matricule: raw?.matricule,
            filiere: raw?.filiere ?? raw?.filiereNom,
            filiereId: raw?.filiereId != null ? Number(raw.filiereId) : null,
            filiereNom: raw?.filiereNom ?? raw?.filiere,
            niveau: raw?.niveau,
            niveauStage: raw?.niveauStage,
            grade: raw?.grade,
            specialite: raw?.specialite,
            departement: raw?.departement,
            poste: raw?.poste,
            service: raw?.service,
            adresse: raw?.adresse,
            secteurActivite: raw?.secteurActivite,
            telephone: raw?.telephone,
            urlSignature: raw?.urlSignature,
            nomFichierSignature: raw?.nomFichierSignature,
            emailSent: typeof raw?.emailSent === 'boolean' ? raw.emailSent : null,
            message: typeof raw?.message === 'string' ? raw.message : ''
        };
    }

    /**
     * Get all users
     */
    getAllUsers(): Observable<User[]> {
        return this.http
            .get<any>(this.API_URL)
            .pipe(map((response) => this.unwrapList<any>(response).map((u) => this.normalizeUser(u))));
    }

    /**
     * Get user by ID
     */
    getUserById(id: number): Observable<User> {
        return this.http
            .get<any>(`${this.API_URL}/${id}`)
            .pipe(map((response) => this.normalizeUser(this.unwrapObject<any>(response))));
    }

    /**
     * Create a new user
     */
    createUser(userData: CreateUserRequest): Observable<User> {
        return this.http
            .post<any>(this.API_URL, userData)
            .pipe(map((response) => this.normalizeUser(this.unwrapObject<any>(response))));
    }

    /**
     * Update an existing user
     */
    updateUser(id: number, userData: UpdateUserRequest): Observable<User> {
        const url = `${this.API_URL}/${id}`;
        const requestBody = {
            nom: userData.nom,
            prenom: userData.prenom,
            email: userData.email,
            telephone: userData.telephone,
            actif: userData.actif,
            nomFichierSignature: userData.nomFichierSignature,
            role: userData.role
        };

        console.log('[UserManagementService] update payload:', requestBody);

        return this.http.put<any>(url, requestBody).pipe(
            map((response) => this.normalizeUser(this.unwrapObject<any>(response))),
            catchError((error: HttpErrorResponse) => throwError(() => error))
        );
    }

    /**
     * Deactivate/activate user account (backend-defined behavior)
     */
    desactiverUser(id: number): Observable<any> {
        return this.http.patch(`${this.API_URL}/${id}/desactiver`, {});
    }

    activerUser(id: number): Observable<any> {
        return this.http.patch(`${this.API_URL}/${id}/activer`, {});
    }

    /**
     * Supprime un utilisateur (DELETE /utilisateurs/{id}). Reserve a l'administrateur.
     * Backend : soft-delete (supprime=true) + anonymisation des champs uniques.
     * Cote API, la suppression echoue avec un message explicite en cas de contrainte
     * metier (suppression du propre compte, utilisateur deja supprime, etc.).
     */
    deleteUser(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/${id}`).pipe(
            catchError((error: HttpErrorResponse) => throwError(() => error))
        );
    }

    deleteUserSignature(id: number): Observable<User> {
        return this.http.delete<any>(`${this.API_URL}/${id}/signature`).pipe(
            map((response) => this.normalizeUser(this.unwrapObject<any>(response))),
            catchError((error: HttpErrorResponse) => throwError(() => error))
        );
    }

    /**
     * Récupère la liste de toutes les filières disponibles.
     * Retourne un tableau vide en cas d'erreur réseau.
     */
    getFilieres(): Observable<Filiere[]> {
        return this.http.get<any>(`${API_BASE_URL}/filieres`).pipe(
            map((res: any) => {
                const raw: any[] = Array.isArray(res) ? res : (res?.data ?? []);
                return raw.map((f: any) => ({ id: Number(f.id), nom: String(f.nom ?? '') }));
            }),
            catchError(() => of([]))
        );
    }
}

