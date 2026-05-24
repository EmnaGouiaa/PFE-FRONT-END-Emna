import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthentificationService } from '../../services/authentification.service';
import { CompanyContextService } from '../../services/company/company-context.service';
import { CompanyContext } from '../../services/company/company.models';

@Component({
  selector: 'app-company-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './company-layout.component.html',
  styleUrls: ['../../admin/layout/admin-layout.component.css', './company-layout.component.css']
})
export class CompanyLayoutComponent implements OnInit {
  context: CompanyContext | null = null;
  errorMessage = '';

  constructor(
    private authService: AuthentificationService,
    private companyContextService: CompanyContextService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.companyContextService.getContext().subscribe({
      next: (context) => {
        this.context = context;
        this.errorMessage = '';
      },
      error: (error) => {
        this.errorMessage = error?.message ?? 'Impossible de charger le contexte entreprise.';
      }
    });
  }

  get nomEntrepriseAffiche(): string {
    return (
      this.context?.entreprise?.nomEntreprise ||
      this.context?.responsable?.entrepriseNom ||
      "Espace représentant d'entreprise"
    );
  }

  get nomCompletResponsable(): string {
    if (!this.context) return '';
    const { prenom, nom } = this.context.responsable;
    return `${prenom ?? ''} ${nom ?? ''}`.trim();
  }

  get emailResponsable(): string {
    return this.context?.responsable?.email ?? '';
  }

  get secteurActivite(): string {
    return this.context?.entreprise?.secteurActivite ?? '';
  }

  logout(): void {
    this.authService.deconnexion();
    this.router.navigate(['/connexion']);
  }
}
