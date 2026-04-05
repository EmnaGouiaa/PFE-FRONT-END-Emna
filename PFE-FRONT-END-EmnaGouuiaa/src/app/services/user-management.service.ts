import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface User {
    id: number;
    prenom: string;
    nom: string;
    email: string;
    role: string;
    compteValide: boolean;
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
    password: string;
    role: string;
}

export interface UpdateUserRequest {
    prenom?: string;
    nom?: string;
    email?: string;
    password?: string;
    role?: string;
    compteValide?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class UserManagementService {
    private readonly API_URL = 'http://localhost:9999/api/admin/users';

    constructor(private http: HttpClient) { }

    /**
     * Get all users
     */
    getAllUsers(): Observable<{ success: boolean; count: number; users: User[] }> {
        return this.http.get<{ success: boolean; count: number; users: User[] }>(this.API_URL);
    }

    /**
     * Get user by ID
     */
    getUserById(id: number): Observable<{ success: boolean; user: User }> {
        return this.http.get<{ success: boolean; user: User }>(`${this.API_URL}/${id}`);
    }

    /**
     * Create a new user
     */
    createUser(userData: CreateUserRequest): Observable<{ success: boolean; message: string; user: User }> {
        return this.http.post<{ success: boolean; message: string; user: User }>(this.API_URL, userData);
    }

    /**
     * Update an existing user
     */
    updateUser(id: number, userData: UpdateUserRequest): Observable<{ success: boolean; message: string; user: User }> {
        return this.http.put<{ success: boolean; message: string; user: User }>(`${this.API_URL}/${id}`, userData);
    }

    /**
     * Delete a user
     */
    deleteUser(id: number): Observable<{ success: boolean; message: string }> {
        return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/${id}`);
    }
}
