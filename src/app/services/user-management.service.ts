import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from './api.config';

export interface User {
    id: number;
    prenom: string;
    nom: string;
    email: string;
    role: string;
    actif: boolean;
    matricule?: string;
    filiere?: string;
<<<<<<< HEAD
    filiereNom?: string;
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    niveau?: string;
    niveauStage?: string;
    grade?: string;
    specialite?: string;
    departement?: string;
    poste?: string;
    service?: string;
    adresse?: string;
    secteurActivite?: string;
    telephone?: string;
<<<<<<< HEAD
    nomFichierSignature?: string;
    emailSent?: boolean | null;
    message?: string;
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}

export interface CreateUserRequest {
    prenom: string;
    nom: string;
    email: string;
<<<<<<< HEAD
    telephone?: string;
=======
    motDePasse: string;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    role: string;
}

export interface UpdateUserRequest {
    prenom?: string;
    nom?: string;
    email?: string;
<<<<<<< HEAD
    telephone?: string;
    nomFichierSignature?: string;
=======
    motDePasse?: string;
    password?: string;
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    role?: string;
    actif?: boolean;
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

<<<<<<< HEAD
=======
    private toLegacyPasswordPayload(payload: UpdateUserRequest): any {
        const p: any = { ...payload };

        if (typeof p.motDePasse === 'string' && p.motDePasse.trim() !== '') {
            p.password = p.motDePasse;
            delete p.motDePasse;
        }

        return p;
    }

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
        if (typeof value === 'string') {
            const normalized = value.trim();
            return normalized.startsWith('ROLE_') ? normalized.slice('ROLE_'.length) : normalized;
        }
        if (value && typeof value === 'object') {
            const obj = value as any;
            const raw = String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '').trim();
            return raw.startsWith('ROLE_') ? raw.slice('ROLE_'.length) : raw;
=======
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
            const obj = value as any;
            return String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '');
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
            filiere: raw?.filiere ?? raw?.filiereNom,
            filiereNom: raw?.filiereNom ?? raw?.filiere,
=======
            filiere: raw?.filiere,
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
            niveau: raw?.niveau,
            niveauStage: raw?.niveauStage,
            grade: raw?.grade,
            specialite: raw?.specialite,
            departement: raw?.departement,
            poste: raw?.poste,
            service: raw?.service,
            adresse: raw?.adresse,
            secteurActivite: raw?.secteurActivite,
<<<<<<< HEAD
            telephone: raw?.telephone,
            nomFichierSignature: raw?.nomFichierSignature,
            emailSent: typeof raw?.emailSent === 'boolean' ? raw.emailSent : null,
            message: typeof raw?.message === 'string' ? raw.message : ''
=======
            telephone: raw?.telephone
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
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
=======

        return this.http.put<any>(url, userData).pipe(
            map((response) => this.normalizeUser(this.unwrapObject<any>(response))),
            catchError((error: HttpErrorResponse) => {
                // Compatibility fallback: some backend DTO versions expect "password"
                // instead of "motDePasse" for update payloads.
                const maybeRetry =
                    error.status === 400 &&
                    typeof userData?.motDePasse === 'string' &&
                    userData.motDePasse.trim().length > 0;

                if (!maybeRetry) {
                    return throwError(() => error);
                }

                const legacyPayload = this.toLegacyPasswordPayload(userData);
                return this.http.put<any>(url, legacyPayload).pipe(
                    map((response) => this.normalizeUser(this.unwrapObject<any>(response))),
                    catchError((retryError) => throwError(() => retryError))
                );
            })
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
        );
    }

    /**
     * Deactivate/activate user account (backend-defined behavior)
     */
    desactiverUser(id: number): Observable<any> {
        return this.http.patch(`${this.API_URL}/${id}/desactiver`, {});
    }
<<<<<<< HEAD

    activerUser(id: number): Observable<any> {
        return this.http.patch(`${this.API_URL}/${id}/activer`, {});
    }

    deleteUser(id: number): Observable<void> {
        return this.http.delete<void>(`${this.API_URL}/${id}`);
    }
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}

