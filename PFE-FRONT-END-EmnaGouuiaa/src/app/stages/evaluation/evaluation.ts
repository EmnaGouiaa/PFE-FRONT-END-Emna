import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from '../../services/api.config';

@Component({
  selector: 'app-evaluation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './evaluation.html',
  styleUrls: ['./evaluation.css', '../../company/company-shared.css'],
})
export class Evaluation implements OnInit {
  stageId: number | null = null;
  evaluation: any | null = null;
  chargement = true;
  messageErreur = '';
  telechargementEnCours = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.params['id']);
    this.stageId = Number.isFinite(id) && id > 0 ? id : null;

    if (!this.stageId) {
      this.messageErreur = 'Identifiant de stage invalide.';
      this.chargement = false;
      return;
    }

    this.chargerEvaluation();
  }

  recharger(): void {
    this.chargerEvaluation();
  }

  telechargerPdf(): void {
    if (!this.stageId || this.telechargementEnCours) return;

    this.telechargementEnCours = true;

    this.http
      .get(`${API_BASE_URL}/fiches-evaluation/stage/${this.stageId}/pdf`, {
        responseType: 'blob',
      })
      .pipe(
        catchError(() => {
          this.telechargementEnCours = false;
          return of(null);
        })
      )
      .subscribe((blob) => {
        this.telechargementEnCours = false;
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fiche-evaluation-stage-${this.stageId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  private chargerEvaluation(): void {
    if (!this.stageId) return;

    this.chargement = true;
    this.messageErreur = '';
    this.evaluation = null;

    this.http.get<any>(`${API_BASE_URL}/fiches-evaluation/stage/${this.stageId}`).pipe(
      catchError((error) => {
        if (error?.status === 400) {
          return of(null);
        }
        this.messageErreur = error?.error?.message ?? "Impossible de charger la fiche d'évaluation.";
        return of(null);
      })
    ).subscribe((evaluation) => {
      this.evaluation = evaluation;
      this.chargement = false;
    });
  }

  formatDateTime(value: any): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('fr-FR');
  }

  formatDate(value: any): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('fr-FR');
  }
}
