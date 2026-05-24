import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ServiceDemandeStageService, DemandeStageDTO } from '../services/service-demande-stage.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { PhoneInputComponent } from './phone-input/phone-input.component';

@Component({
  selector: 'app-internship-request-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PhoneInputComponent
  ],
  templateUrl: './internship-request-form.component.html',
  styleUrls: ['./internship-request-form.component.css']
})
export class InternshipRequestFormComponent implements OnInit {
  
  infoEntreprise!: FormGroup;
  infoEncadrant!: FormGroup;
  detailsStage!: FormGroup;
  
  etapeActuelle = 1;
  totalEtapes = 4;
  soumissionEnCours = false;
  
  constructor(
    private fb: FormBuilder,
    private serviceDemandeStage: ServiceDemandeStageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initialiserFormulaires();
  }

  private initialiserFormulaires(): void {
    this.infoEntreprise = this.fb.group({
      nomEntreprise: ['', [Validators.required, Validators.maxLength(200)]],
      adresseEntreprise: ['', [Validators.required, Validators.maxLength(500)]],
      telephoneEntreprise: ['', [Validators.pattern('^[+]?[0-9]{8,15}$')]],
      emailEntreprise: ['', [Validators.email]]
    });

    this.infoEncadrant = this.fb.group({
      nomEncadrant: ['', [Validators.required, Validators.maxLength(100)]],
      emailEncadrant: ['', [Validators.required, Validators.email]],
      telephoneEncadrant: ['', [Validators.pattern('^[+]?[0-9]{8,15}$')]],
      posteEncadrant: ['', [Validators.maxLength(100)]]
    });

    this.detailsStage = this.fb.group({
      sujetStage: ['', [Validators.required, Validators.maxLength(200)]],
      descriptionStage: ['', [Validators.maxLength(2000)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required]
    });
  }

  nextStep(): void {
    if (this.etapeActuelle < this.totalEtapes) {
      this.etapeActuelle++;
    }
  }

  previousStep(): void {
    if (this.etapeActuelle > 1) {
      this.etapeActuelle--;
    }
  }

  onSubmit(): void {
    if (this.infoEntreprise.valid && this.infoEncadrant.valid && this.detailsStage.valid) {
      this.soumissionEnCours = true;
      
      const demande: DemandeStageDTO = {
        ...this.infoEntreprise.value,
        ...this.infoEncadrant.value,
        ...this.detailsStage.value
      };

      this.serviceDemandeStage.creerDemandeStage(demande).subscribe({
        next: () => {
          alert('Demande de stage soumise avec succès !');
          this.router.navigate(['/etudiant/tableau-de-bord']);
        },
        error: (err) => {
          alert('Erreur lors de la soumission : ' + (err.error?.message || err.message));
          this.soumissionEnCours = false;
        }
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/etudiant/tableau-de-bord']);
  }
}
