import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthentificationService } from '../services/authentification.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(
    private serviceAuthentification: AuthentificationService,
    private router: Router
  ) { }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Ne pas ajouter de jeton pour les endpoints publics d'authentification.
    if (this.estPointEntreeAuthentification(request.url)) {
      return next.handle(request);
    }

    const token = this.serviceAuthentification.getToken();
    const requestAvecJeton = token ? this.ajouterJetonALaRequete(request, token) : request;

    return next.handle(requestAvecJeton).pipe(
      catchError((erreur: HttpErrorResponse) => {
        if (erreur.status === 401) {
          console.warn('Jeton JWT expiré ou invalide');
          this.serviceAuthentification.effacerDonneesAuthentification();
          this.router.navigate(['/connexion']);
          return throwError(() => new Error('Session expirée. Veuillez vous reconnecter.'));
        }

        if (erreur.status === 403) {
          // Important: ne pas transformer l’erreur en message générique, sinon les pages admin ne peuvent
          // pas afficher la vraie cause (403 backend) et cela ressemble à un “échec silencieux”.
          console.warn('Accès interdit : permissions insuffisantes');
          return throwError(() => erreur);
        }

        return throwError(() => erreur);
      })
    );
  }

  private ajouterJetonALaRequete(requete: HttpRequest<any>, jeton: string): HttpRequest<any> {
    return requete.clone({
      setHeaders: {
        Authorization: `Bearer ${jeton}`
      }
    });
  }

  private estPointEntreeAuthentification(url: string): boolean {
    // Accepte URLs absolues et relatives.
    return (
      url.includes('/api/auth/login') ||
      url.includes('/api/v1/authentification/login') ||
      url.includes('/auth/login') ||
      url.includes('/authentification/connexion') ||
      url.includes('/authentification/inscription')
    );
  }
}

