<<<<<<< HEAD
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

  private chargerEvaluation(): void {
    if (!this.stageId) return;

    this.chargement = true;
    this.messageErreur = '';
    this.evaluation = null;

    this.http.get<any>(`${API_BASE_URL}/fiches-evaluation/stage/${this.stageId}`).pipe(
      catchError((error) => {
        // 400 = souvent "introuvable" côté backend
        if (error?.status === 400) {
          return of(null);
        }
        this.messageErreur = error?.error?.message ?? 'Impossible de charger la fiche d’évaluation.';
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
=======
import { Component } from '@angular/core';

@Component({
  selector: 'app-evaluation',
  imports: [],
  templateUrl: './evaluation.html',
  styleUrl: './evaluation.css',
})
export class Evaluation {

>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
}
