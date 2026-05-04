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
}

export interface CreateUserRequest {
    prenom: string;
    nom: string;
    email: string;
    motDePasse: string;
    role: string;
}

export interface UpdateUserRequest {
    prenom?: string;
    nom?: string;
    email?: string;
    motDePasse?: string;
    password?: string;
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

    private toLegacyPasswordPayload(payload: UpdateUserRequest): any {
        const p: any = { ...payload };

        if (typeof p.motDePasse === 'string' && p.motDePasse.trim() !== '') {
            p.password = p.motDePasse;
            delete p.motDePasse;
        }

        return p;
    }

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
        if (typeof value === 'string') return value;
        if (value && typeof value === 'object') {
            const obj = value as any;
            return String(obj.role ?? obj.name ?? obj.code ?? obj.libelle ?? '');
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
            filiere: raw?.filiere,
            niveau: raw?.niveau,
            niveauStage: raw?.niveauStage,
            grade: raw?.grade,
            specialite: raw?.specialite,
            departement: raw?.departement,
            poste: raw?.poste,
            service: raw?.service,
            adresse: raw?.adresse,
            secteurActivite: raw?.secteurActivite,
            telephone: raw?.telephone
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
        );
    }

    /**
     * Deactivate/activate user account (backend-defined behavior)
     */
    desactiverUser(id: number): Observable<any> {
        return this.http.patch(`${this.API_URL}/${id}/desactiver`, {});
    }
}

