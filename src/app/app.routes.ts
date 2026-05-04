import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { RoleUtilisateur } from './services/authentification.service';

export const routes: Routes = [
  // Aliases kept to avoid breaking older components/links.
  { path: 'login', redirectTo: 'connexion', pathMatch: 'full' },
  { path: 'register', redirectTo: 'inscription', pathMatch: 'full' },
  { path: 'profile', redirectTo: 'profil', pathMatch: 'full' },
  { path: 'unauthorized', redirectTo: 'non-autorise', pathMatch: 'full' },

  { path: 'admin', redirectTo: 'admin/tableau-de-bord', pathMatch: 'full' },
  { path: 'admin/dashboard', redirectTo: 'admin/tableau-de-bord', pathMatch: 'full' },
  { path: 'admin/users', redirectTo: 'admin/utilisateurs', pathMatch: 'full' },

  { path: 'student/dashboard', redirectTo: 'etudiant/tableau-de-bord', pathMatch: 'full' },
  { path: 'teacher/dashboard', redirectTo: 'enseignant/tableau-de-bord', pathMatch: 'full' },
  { path: 'encadrant/dashboard', redirectTo: 'encadrant/tableau-de-bord', pathMatch: 'full' },
  { path: 'company/dashboard', redirectTo: 'entreprise/tableau-de-bord', pathMatch: 'full' },

  {
    path: 'connexion',
    loadComponent: () => import('./auth/login/login').then(m => m.Login)
  },
  {
    path: 'inscription',
    loadComponent: () => import('./auth/register/register').then(m => m.Register)
  },

  // Gestion du profil (tous les utilisateurs authentifiés)
  {
    path: 'profil',
    loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent),
    canActivate: [AuthGuard]
  },

  // Routes Administrateur
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      {
        path: 'tableau-de-bord',
        loadComponent: () => import('./admin/dashboard/admin-dashboard').then(m => m.AdminDashboard),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR] }
      },
      {
        path: 'utilisateurs',
        loadComponent: () => import('./admin/users/users').then(m => m.Users),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR] }
      },
      {
        path: 'entreprises',
        loadComponent: () => import('./admin/entreprises/admin-entreprises.component').then(m => m.AdminEntreprisesComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR] }
      },
      {
        path: 'representants',
        loadComponent: () => import('./admin/representants/admin-representants.component').then(m => m.AdminRepresentantsComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR] }
      },
      {
        path: 'demandes',
        redirectTo: 'demandes-stage',
        pathMatch: 'full'
      },
      {
        path: 'demandes-stage',
        loadComponent: () =>
          import('./admin/demandes-stage/admin-demandes-stage.component').then(m => m.AdminDemandesStageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR, RoleUtilisateur.RESPONSABLE_SERVICE_STAGES] }
      },
      {
        path: 'validation-administrative',
        redirectTo: 'demandes-stage',
        pathMatch: 'full'
      }
    ]
  },

  // Routes Étudiant
  {
    path: 'etudiant/tableau-de-bord',
    loadComponent: () => import('./components/student-dashboard.component').then(m => m.StudentDashboardComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.STAGIAIRE] }
  },
  {
    path: 'etudiant/demande-stage',
    loadComponent: () => import('./components/internship-request-form.component').then(m => m.InternshipRequestFormComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.STAGIAIRE] }
  },

  // Routes Enseignant/Encadrant
  {
    path: 'enseignant/tableau-de-bord',
    loadComponent: () => import('./components/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.ENCADRANT_PROFESSIONNEL, RoleUtilisateur.ENCADRANT_ACADEMIQUE] }
  },
  {
    path: 'encadrant/tableau-de-bord',
    loadComponent: () => import('./components/teacher-dashboard/teacher-dashboard.component').then(m => m.TeacherDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.ENCADRANT_PROFESSIONNEL, RoleUtilisateur.ENCADRANT_ACADEMIQUE] }
  },

  // Routes Entreprise
  {
    path: 'entreprise/tableau-de-bord',
    loadComponent: () => import('./components/company-dashboard/company-dashboard.component').then(m => m.CompanyDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
  },
  {
    path: 'entreprise/detail/:id',
    loadComponent: () => import('./companies/detail/detail').then(m => m.Detail),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
  },

  // Routes Stages (accessibles par plusieurs rôles)
  {
    path: 'stages',
    loadComponent: () => import('./stages/list/list').then(m => m.List),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: [
        RoleUtilisateur.ADMINISTRATEUR,
        RoleUtilisateur.STAGIAIRE,
        RoleUtilisateur.ENCADRANT_PROFESSIONNEL,
        RoleUtilisateur.ENCADRANT_ACADEMIQUE,
        RoleUtilisateur.RESPONSABLE_SERVICE_STAGES
      ]
    }
  },
  {
    path: 'stages/convention/:id',
    loadComponent: () => import('./stages/agreement-detail/agreement-detail.component').then(m => m.AgreementDetailComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'stages/signer/:jeton',
    loadComponent: () => import('./stages/agreement-detail/agreement-detail.component').then(m => m.AgreementDetailComponent)
  },
  {
    path: 'stages/evaluation/:id',
    loadComponent: () => import('./stages/evaluation/evaluation').then(m => m.Evaluation),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: [
        RoleUtilisateur.ADMINISTRATEUR,
        RoleUtilisateur.STAGIAIRE,
        RoleUtilisateur.ENCADRANT_PROFESSIONNEL,
        RoleUtilisateur.ENCADRANT_ACADEMIQUE
      ]
    }
  },
  {
    path: 'stages/journal-de-bord/:id',
    loadComponent: () => import('./stages/logbook/logbook').then(m => m.Logbook),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: [
        RoleUtilisateur.STAGIAIRE,
        RoleUtilisateur.ENCADRANT_PROFESSIONNEL,
        RoleUtilisateur.ENCADRANT_ACADEMIQUE
      ]
    }
  },

  // Routes Responsable Service Stages
  {
    path: 'responsable/tableau-de-bord',
    loadComponent: () => import('./components/role-based-dashboard/role-based-dashboard.component').then(m => m.RoleBasedDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.RESPONSABLE_SERVICE_STAGES] }
  },

  // Page non autorisé
  {
    path: 'non-autorise',
    loadComponent: () => import('./components/unauthorized/unauthorized.component').then(m => m.Unauthorized)
  },

  // Redirection par défaut vers la connexion
  { path: '', redirectTo: '/connexion', pathMatch: 'full' },

  // Route générique pour 404
  { path: '**', redirectTo: '/connexion' }
];
