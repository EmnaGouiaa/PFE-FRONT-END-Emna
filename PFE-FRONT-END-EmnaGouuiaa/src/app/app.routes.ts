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
  { path: 'encadrant/dashboard', redirectTo: 'enseignant/tableau-de-bord', pathMatch: 'full' },
  { path: 'company/dashboard', redirectTo: 'entreprise/tableau-de-bord', pathMatch: 'full' },
  { path: 'responsable', redirectTo: 'responsable/tableau-de-bord', pathMatch: 'full' },
  { path: 'responsable/dashboard', redirectTo: 'responsable/tableau-de-bord', pathMatch: 'full' },

  {
    path: 'connexion',
    loadComponent: () => import('./auth/login/login').then(m => m.Login)
  },
  {
    path: 'inscription',
    loadComponent: () => import('./auth/register/register').then(m => m.Register)
  },
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'premiere-connexion',
    loadComponent: () => import('./auth/first-login-password-change/first-login-password-change.component').then(m => m.FirstLoginPasswordChangeComponent),
    canActivate: [AuthGuard]
  },

  // Gestion du profil (tous les utilisateurs authentifiés)
  {
    path: 'profil',
    loadComponent: () => import('./components/profile-redirect.component').then(m => m.ProfileRedirectComponent),
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
        redirectTo: 'entreprises',
        pathMatch: 'full'
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
        data: {
          roles: [
            RoleUtilisateur.ADMINISTRATEUR,
            RoleUtilisateur.RESPONSABLE_STAGE
          ]
        }
      },
      {
        path: 'validation-administrative',
        redirectTo: 'demandes-stage',
        pathMatch: 'full'
      },
      {
        path: 'profil',
        loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR, RoleUtilisateur.RESPONSABLE_STAGE, RoleUtilisateur.AGENT_STAGE] }
      }
    ]
  },

  // Routes Étudiant
  {
    path: 'etudiant',
    loadComponent: () => import('./student/layout/student-layout.component').then(m => m.StudentLayoutComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.STAGIAIRE] },
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      {
        path: 'tableau-de-bord',
        loadComponent: () => import('./student/dashboard/student-dashboard-page.component').then(m => m.StudentDashboardPageComponent)
      },
      {
        path: 'profil',
        loadComponent: () => import('./student/profile/student-profile-page.component').then(m => m.StudentProfilePageComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./student/notifications/student-notifications-page.component').then(m => m.StudentNotificationsPageComponent)
      },
      {
        path: 'offres',
        loadComponent: () => import('./student/offers/student-offers-page.component').then(m => m.StudentOffersPageComponent)
      },
      {
        path: 'demande-entreprise',
        loadComponent: () => import('./student/requests/student-company-request-page.component').then(m => m.StudentCompanyRequestPageComponent)
      },
      {
        path: 'demande-stage',
        redirectTo: 'demande-entreprise',
        pathMatch: 'full'
      },
      {
        path: 'mon-stage',
        loadComponent: () => import('./student/internships/student-internship-page.component').then(m => m.StudentInternshipPageComponent)
      },
      {
        path: 'suivi-stage',
        loadComponent: () => import('./student/follow-up/student-follow-up-page.component').then(m => m.StudentFollowUpPageComponent)
      },
      {
        path: 'reunions',
        loadComponent: () => import('./student/meetings/student-meetings-page.component').then(m => m.StudentMeetingsPageComponent)
      },
      {
        path: 'documents-stage',
        loadComponent: () => import('./student/documents/student-documents-page.component').then(m => m.StudentDocumentsPageComponent)
      },
      { path: 'rapport', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'convention', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'evaluation', redirectTo: 'documents-stage', pathMatch: 'full' },
      {
        path: 'enquete-satisfaction',
        loadComponent: () =>
          import('./components/enquete/enquete-user-page.component').then(
            (m) => m.EnqueteUserPageComponent
          )
      }
    ]
  },

  // Routes Encadrants
  {
    path: 'enseignant/tableau-de-bord',
    loadComponent: () => import('./supervisor/supervisor-redirect.component').then(m => m.SupervisorRedirectComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.ENCADRANT_PROFESSIONNEL, RoleUtilisateur.ENCADRANT_ACADEMIQUE] }
  },
  {
    path: 'encadrant/tableau-de-bord',
    loadComponent: () => import('./supervisor/supervisor-redirect.component').then(m => m.SupervisorRedirectComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.ENCADRANT_PROFESSIONNEL, RoleUtilisateur.ENCADRANT_ACADEMIQUE] }
  },
  {
    path: 'encadrant-professionnel',
    loadComponent: () => import('./supervisor/layout/supervisor-layout.component').then(m => m.SupervisorLayoutComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.ENCADRANT_PROFESSIONNEL] },
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      { path: 'tableau-de-bord', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'dashboard' } },
      { path: 'stagiaires', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'stagiaires' } },
      { path: 'reunions', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'reunions' } },
      { path: 'documents-stage', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'documents' } },
      { path: 'cahier-stage', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'evaluations', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'evaluations' } },
      { path: 'conventions', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'notifications', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'notifications' } },
      {
        path: 'enquete-satisfaction',
        loadComponent: () =>
          import('./components/enquete/enquete-user-page.component').then(
            (m) => m.EnqueteUserPageComponent
          )
      },
      { path: 'profil', loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent) }
    ]
  },
  {
    path: 'encadrant-academique',
    loadComponent: () => import('./supervisor/layout/supervisor-layout.component').then(m => m.SupervisorLayoutComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.ENCADRANT_ACADEMIQUE] },
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      { path: 'tableau-de-bord', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'dashboard' } },
      { path: 'stagiaires', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'stagiaires' } },
      { path: 'reunions', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'reunions' } },
      { path: 'documents-stage', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'documents' } },
      { path: 'cahier-stage', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'conventions', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'notifications', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'notifications' } },
      {
        path: 'enquete-satisfaction',
        loadComponent: () =>
          import('./components/enquete/enquete-user-page.component').then(
            (m) => m.EnqueteUserPageComponent
          )
      },
      { path: 'profil', loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent) }
    ]
  },

  // Routes Entreprise
  {
    path: 'entreprise',
    loadComponent: () => import('./company/layout/company-layout.component').then(m => m.CompanyLayoutComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] },
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      {
        path: 'tableau-de-bord',
        loadComponent: () => import('./company/dashboard/company-dashboard.component').then(m => m.CompanyDashboardPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'profil',
        loadComponent: () => import('./company/profile/company-profile.component').then(m => m.CompanyProfilePageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'offres',
        loadComponent: () => import('./company/offers/company-offers.component').then(m => m.CompanyOffersPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'stages',
        loadComponent: () => import('./company/internships/company-internships.component').then(m => m.CompanyInternshipsPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'documents-stage',
        loadComponent: () => import('./company/validations/company-validations.component').then(m => m.CompanyValidationsPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'validations',
        redirectTo: 'documents-stage',
        pathMatch: 'full'
      },
      {
        path: 'encadrants',
        loadComponent: () => import('./company/supervisors/company-supervisors.component').then(m => m.CompanySupervisorsPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'reunions',
        loadComponent: () => import('./company/meetings/company-meetings.component').then(m => m.CompanyMeetingsPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'evaluation',
        loadComponent: () => import('./company/evaluations/company-evaluations.component').then(m => m.CompanyEvaluationsPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      { path: 'evaluations', redirectTo: 'evaluation', pathMatch: 'full' },
      { path: 'conventions', redirectTo: 'documents-stage', pathMatch: 'full' },
      {
        path: 'enquete-satisfaction',
        loadComponent: () =>
          import('./company/enquete/company-enquete.component').then(
            (m) => m.CompanyEnquetePageComponent
          ),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      {
        path: 'absences',
        loadComponent: () =>
          import('./company/absences/company-absences.component').then(
            (m) => m.CompanyAbsencesPageComponent
          ),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      }
    ]
  },
  {
    path: 'entreprise/detail/:id',
    redirectTo: 'entreprise/profil',
    pathMatch: 'full'
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
        RoleUtilisateur.RESPONSABLE_STAGE
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
        RoleUtilisateur.ENCADRANT_ACADEMIQUE,
        RoleUtilisateur.RESPONSABLE_ENTREPRISE
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
        RoleUtilisateur.ENCADRANT_ACADEMIQUE,
        RoleUtilisateur.RESPONSABLE_ENTREPRISE
      ]
    }
  },

  // Routes Responsable Universitaire des Stages
  {
    path: 'responsable',
    loadComponent: () => import('./faculty/layout/faculty-layout.component').then(m => m.FacultyLayoutComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.RESPONSABLE_STAGE] },
    children: [
      { path: '', redirectTo: 'tableau-de-bord', pathMatch: 'full' },
      {
        path: 'tableau-de-bord',
        loadComponent: () => import('./faculty/dashboard/faculty-dashboard.component').then(m => m.FacultyDashboardPageComponent)
      },
      {
        path: 'demandes-entreprises',
        loadComponent: () => import('./faculty/requests/faculty-company-requests.component').then(m => m.FacultyCompanyRequestsPageComponent)
      },
      {
        path: 'validation-offres',
        loadComponent: () => import('./faculty/offers/faculty-offers-validation.component').then(m => m.FacultyOffersValidationPageComponent)
      },
      {
        path: 'offres',
        loadComponent: () => import('./faculty/offers/faculty-all-offers.component').then(m => m.FacultyAllOffersPageComponent)
      },
      {
        path: 'stages',
        loadComponent: () => import('./faculty/internships/faculty-internships.component').then(m => m.FacultyInternshipsPageComponent)
      },
      {
        path: 'affectations-encadrants',
        loadComponent: () => import('./faculty/assignments/faculty-assignments.component').then(m => m.FacultyAssignmentsPageComponent)
      },
      {
        path: 'reunions',
        loadComponent: () => import('./faculty/meetings/faculty-meetings.component').then(m => m.FacultyMeetingsPageComponent)
      },
      {
        path: 'enquete-satisfaction',
        loadComponent: () => import('./faculty/enquete/enquete-admin-page.component').then(m => m.EnqueteAdminPageComponent)
      },
      {
        path: 'evaluations-rapports',
        redirectTo: 'documents-stage',
        pathMatch: 'full'
      },
      {
        path: 'documents-stage',
        loadComponent: () => import('./faculty/documents/faculty-documents.component').then(m => m.FacultyDocumentsPageComponent)
      },
      {
        path: 'conventions',
        redirectTo: 'documents-stage',
        pathMatch: 'full'
      },
      {
        path: 'profil',
        loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent)
      }
    ]
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
