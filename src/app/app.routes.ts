import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';
import { RoleUtilisateur } from './services/authentification.service';

<<<<<<< HEAD
const RESPONSABLE_STAGES_ROLES = [
  RoleUtilisateur.RESPONSABLE_SERVICE_STAGES,
  RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES
];

=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
  { path: 'encadrant/dashboard', redirectTo: 'enseignant/tableau-de-bord', pathMatch: 'full' },
  { path: 'company/dashboard', redirectTo: 'entreprise/tableau-de-bord', pathMatch: 'full' },
  { path: 'responsable', redirectTo: 'responsable/tableau-de-bord', pathMatch: 'full' },
  { path: 'responsable/dashboard', redirectTo: 'responsable/tableau-de-bord', pathMatch: 'full' },
=======
  { path: 'encadrant/dashboard', redirectTo: 'encadrant/tableau-de-bord', pathMatch: 'full' },
  { path: 'company/dashboard', redirectTo: 'entreprise/tableau-de-bord', pathMatch: 'full' },
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

  {
    path: 'connexion',
    loadComponent: () => import('./auth/login/login').then(m => m.Login)
  },
  {
    path: 'inscription',
    loadComponent: () => import('./auth/register/register').then(m => m.Register)
  },
<<<<<<< HEAD
  {
    path: 'mot-de-passe-oublie',
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'premiere-connexion',
    loadComponent: () => import('./auth/first-login-password-change/first-login-password-change.component').then(m => m.FirstLoginPasswordChangeComponent),
    canActivate: [AuthGuard]
  },
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3

  // Gestion du profil (tous les utilisateurs authentifiés)
  {
    path: 'profil',
<<<<<<< HEAD
    loadComponent: () => import('./components/profile-redirect.component').then(m => m.ProfileRedirectComponent),
=======
    loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent),
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
        redirectTo: 'entreprises',
        pathMatch: 'full'
=======
        loadComponent: () => import('./admin/representants/admin-representants.component').then(m => m.AdminRepresentantsComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR] }
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
        data: {
          roles: [RoleUtilisateur.ADMINISTRATEUR]
        }
=======
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR, RoleUtilisateur.RESPONSABLE_SERVICE_STAGES] }
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      },
      {
        path: 'validation-administrative',
        redirectTo: 'demandes-stage',
        pathMatch: 'full'
<<<<<<< HEAD
      },
      {
        path: 'profil',
        loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.ADMINISTRATEUR, RoleUtilisateur.AGENT_STAGE] }
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
      }
    ]
  },

  // Routes Étudiant
  {
<<<<<<< HEAD
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
        path: 'enquete-satisfaction',
        loadComponent: () => import('./components/satisfaction-survey-page.component').then(m => m.SatisfactionSurveyPageComponent)
      },
      {
        path: 'documents-stage',
        loadComponent: () => import('./student/documents/student-documents-page.component').then(m => m.StudentDocumentsPageComponent)
      },
      { path: 'rapport', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'convention', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'evaluation', redirectTo: 'documents-stage', pathMatch: 'full' }
    ]
  },

  // Routes Encadrants
  {
    path: 'enseignant/tableau-de-bord',
    loadComponent: () => import('./supervisor/supervisor-redirect.component').then(m => m.SupervisorRedirectComponent),
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.ENCADRANT_PROFESSIONNEL, RoleUtilisateur.ENCADRANT_ACADEMIQUE] }
  },
  {
    path: 'encadrant/tableau-de-bord',
<<<<<<< HEAD
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
      { path: 'enquete-satisfaction', loadComponent: () => import('./components/satisfaction-survey-page.component').then(m => m.SatisfactionSurveyPageComponent) },
      { path: 'documents-stage', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'documents' } },
      { path: 'cahier-stage', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'evaluations', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'conventions', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'notifications', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'notifications' } },
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
      { path: 'enquete-satisfaction', loadComponent: () => import('./components/satisfaction-survey-page.component').then(m => m.SatisfactionSurveyPageComponent) },
      { path: 'documents-stage', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'documents' } },
      { path: 'cahier-stage', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'conventions', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'notifications', loadComponent: () => import('./supervisor/workspace/supervisor-workspace.component').then(m => m.SupervisorWorkspaceComponent), data: { section: 'notifications' } },
      { path: 'profil', loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent) }
    ]
  },

  // Routes Entreprise
  {
    path: 'entreprise',
    loadComponent: () => import('./company/layout/company-layout.component').then(m => m.CompanyLayoutComponent),
    canActivate: [AuthGuard],
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
        path: 'enquete-satisfaction',
        loadComponent: () => import('./components/satisfaction-survey-page.component').then(m => m.SatisfactionSurveyPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      },
      { path: 'evaluations', redirectTo: 'documents-stage', pathMatch: 'full' },
      { path: 'conventions', redirectTo: 'documents-stage', pathMatch: 'full' },
      {
        path: 'candidatures',
        loadComponent: () => import('./company/applications/company-applications.component').then(m => m.CompanyApplicationsPageComponent),
        canActivate: [RoleGuard],
        data: { roles: [RoleUtilisateur.RESPONSABLE_ENTREPRISE] }
      }
    ]
  },
  {
    path: 'entreprise/detail/:id',
    redirectTo: 'entreprise/profil',
    pathMatch: 'full'
=======
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
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
<<<<<<< HEAD
        ...RESPONSABLE_STAGES_ROLES
=======
        RoleUtilisateur.RESPONSABLE_SERVICE_STAGES
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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

<<<<<<< HEAD
  // Routes Responsable Universitaire des Stages
  {
    path: 'responsable',
    loadComponent: () => import('./faculty/layout/faculty-layout.component').then(m => m.FacultyLayoutComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: RESPONSABLE_STAGES_ROLES },
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
        loadComponent: () => import('./components/satisfaction-survey-page.component').then(m => m.SatisfactionSurveyPageComponent)
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
        path: 'formulaires',
        redirectTo: 'enquete-satisfaction',
        pathMatch: 'full'
      },
      {
        path: 'statistiques',
        redirectTo: 'enquete-satisfaction',
        pathMatch: 'full'
      },
      {
        path: 'profil',
        loadComponent: () => import('./components/profile-management.component').then(m => m.ProfileManagementComponent)
      }
    ]
=======
  // Routes Responsable Service Stages
  {
    path: 'responsable/tableau-de-bord',
    loadComponent: () => import('./components/role-based-dashboard/role-based-dashboard.component').then(m => m.RoleBasedDashboard),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: [RoleUtilisateur.RESPONSABLE_SERVICE_STAGES] }
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
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
