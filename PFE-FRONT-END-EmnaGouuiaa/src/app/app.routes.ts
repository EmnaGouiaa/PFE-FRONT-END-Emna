import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { UserRole } from './services/auth.service';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register').then(m => m.Register)
  },

  // Admin routes
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./admin/dashboard/admin-dashboard').then(m => m.AdminDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.ADMIN] }
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./admin/users/users').then(m => m.Users),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.ADMIN] }
  },

  // Student routes
  {
    path: 'student/dashboard',
    loadComponent: () => import('./components/student-dashboard/student-dashboard.component').then(m => m.StudentDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.STAGIAIRE] }
  },

  // Teacher/Supervisor routes
  {
    path: 'teacher/dashboard',
    loadComponent: () => import('./components/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.ENCADRANT_PROFESSIONNEL, UserRole.ENCADRANT_ACADEMIQUE] }
  },
  {
    path: 'encadrant/dashboard',
    loadComponent: () => import('./components/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.ENCADRANT_PROFESSIONNEL, UserRole.ENCADRANT_ACADEMIQUE] }
  },

  // Company routes
  {
    path: 'company/dashboard',
    loadComponent: () => import('./components/company-dashboard/company-dashboard.component').then(m => m.CompanyDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.RESPONSABLE_ENTREPRISE] }
  },
  {
    path: 'company/detail/:id',
    loadComponent: () => import('./companies/detail/detail').then(m => m.Detail),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.RESPONSABLE_ENTREPRISE] }
  },

  // Internship routes (accessible by multiple roles)
  {
    path: 'stages',
    loadComponent: () => import('./stages/list/list').then(m => m.List),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: [
        UserRole.ADMIN,
        UserRole.STAGIAIRE,
        UserRole.ENCADRANT_PROFESSIONNEL,
        UserRole.ENCADRANT_ACADEMIQUE,
        UserRole.RESPONSABLE_SERVICE_STAGES
      ]
    }
  },
  {
    path: 'stages/evaluation/:id',
    loadComponent: () => import('./stages/evaluation/evaluation').then(m => m.Evaluation),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: [
        UserRole.ADMIN,
        UserRole.STAGIAIRE,
        UserRole.ENCADRANT_PROFESSIONNEL,
        UserRole.ENCADRANT_ACADEMIQUE
      ]
    }
  },
  {
    path: 'stages/logbook/:id',
    loadComponent: () => import('./stages/logbook/logbook').then(m => m.Logbook),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: [
        UserRole.STAGIAIRE,
        UserRole.ENCADRANT_PROFESSIONNEL,
        UserRole.ENCADRANT_ACADEMIQUE
      ]
    }
  },

  // Internship Service Manager routes
  {
    path: 'responsable/dashboard',
    loadComponent: () => import('./components/role-based-dashboard/role-based-dashboard.component').then(m => m.RoleBasedDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [UserRole.RESPONSABLE_SERVICE_STAGES] }
  },

  // Unauthorized page
  {
    path: 'unauthorized',
    loadComponent: () => import('./components/unauthorized/unauthorized.component').then(m => m.Unauthorized)
  },

  // Redirect to login by default
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Wildcard route for 404
  { path: '**', redirectTo: '/login' }
];
