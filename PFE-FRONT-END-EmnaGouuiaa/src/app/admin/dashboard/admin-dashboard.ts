import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserManagementService, User } from '../../services/user-management.service';
import { AuthService, UserRole } from '../../services/auth.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './admin-dashboard.html',
    styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit {
    stats = {
        totalUsers: 0,
        students: 0,
        teachers: 0,
        companies: 0
    };
    recentUsers: User[] = [];
    isLoading = false;

    constructor(
        private userManagementService: UserManagementService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        this.loadStats();
    }

    loadStats(): void {
        this.isLoading = true;
        this.userManagementService.getAllUsers().subscribe({
            next: (response) => {
                const users = response.users;
                this.stats.totalUsers = users.length;
                this.stats.students = users.filter(u => u.role === UserRole.STAGIAIRE).length;
                this.stats.teachers = users.filter(u =>
                    u.role === UserRole.ENCADRANT_ACADEMIQUE ||
                    u.role === UserRole.ENCADRANT_PROFESSIONNEL
                ).length;
                this.stats.companies = users.filter(u => u.role === UserRole.RESPONSABLE_ENTREPRISE).length;

                // Get 5 most recent users
                this.recentUsers = users.slice(-5).reverse();
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Error loading stats:', error);
                this.isLoading = false;
            }
        });
    }

    getRoleBadgeClass(role: string): string {
        switch (role) {
            case UserRole.ADMIN: return 'badge-admin';
            case UserRole.STAGIAIRE: return 'badge-student';
            case UserRole.ENCADRANT_ACADEMIQUE:
            case UserRole.ENCADRANT_PROFESSIONNEL: return 'badge-teacher';
            case UserRole.RESPONSABLE_ENTREPRISE: return 'badge-company';
            case UserRole.RESPONSABLE_SERVICE_STAGES: return 'badge-manager';
            case UserRole.RESPONSABLE_UNIVERSITAIRE_STAGES: return 'badge-university';
            default: return 'badge-default';
        }
    }

    getRoleLabel(role: string): string {
        const labels: { [key: string]: string } = {
            'ADMIN': 'Admin',
            'STAGIAIRE': 'Student',
            'ENCADRANT_ACADEMIQUE': 'Academic Supervisor',
            'ENCADRANT_PROFESSIONNEL': 'Professional Supervisor',
            'RESPONSABLE_ENTREPRISE': 'Company Manager',
            'RESPONSABLE_SERVICE_STAGES': 'Internship Manager',
            'RESPONSABLE_UNIVERSITAIRE_STAGES': 'University Manager'
        };
        return labels[role] || role;
    }
}
