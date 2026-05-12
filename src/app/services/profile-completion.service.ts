import { Injectable } from '@angular/core';
import { RoleUtilisateur } from './authentification.service';
import { CompanyContext } from './company/company.models';
import { CurrentUserProfile } from './current-user-profile.service';
import { StudentProfile } from './student/student.models';

type FieldRule = {
  label: string;
  value: unknown;
};

@Injectable({ providedIn: 'root' })
export class ProfileCompletionService {
  readonly alertTitle = 'Compléter votre profil';
  readonly alertMessage =
    "Certaines informations obligatoires sont manquantes. Veuillez compléter votre profil afin d'utiliser toutes les fonctionnalités de la plateforme.";

  getMissingFieldsForCurrentProfile(profile: CurrentUserProfile | null | undefined): string[] {
    if (!profile) return [];

    return this.uniqueMissing([
      ...this.commonUserRules(profile),
      ...this.signatureRules(profile.role, profile.nomFichierSignature),
      ...this.roleRules(profile.role, profile)
    ]);
  }

  getMissingFieldsForStudent(profile: StudentProfile | null | undefined): string[] {
    if (!profile) return [];

    return this.uniqueMissing([
      ...this.commonUserRules(profile),
      ...this.signatureRules(RoleUtilisateur.STAGIAIRE, profile.nomFichierSignature),
      { label: 'Matricule', value: profile.matricule },
      { label: 'Spécialité / filière', value: profile.filiereId ?? profile.filiereNom },
      { label: 'Niveau', value: profile.niveau }
    ]);
  }

  getMissingFieldsForCompany(context: CompanyContext | null | undefined): string[] {
    if (!context) return [];

    const responsable = context.responsable;
    const entreprise = context.entreprise;

    return this.uniqueMissing([
      ...this.commonIdentityRules(responsable),
      { label: 'Numéro de téléphone', value: responsable.telephone },
      { label: 'Poste', value: responsable.poste },
      { label: 'Service', value: responsable.service },
      ...this.signatureRules(RoleUtilisateur.RESPONSABLE_ENTREPRISE, responsable.nomFichierSignature),
      { label: 'Entreprise associée', value: responsable.entrepriseId ?? entreprise?.id },
      { label: "Nom de l'entreprise", value: entreprise?.nomEntreprise ?? responsable.entrepriseNom },
      { label: "Email de l'entreprise", value: entreprise?.emailEntreprise },
      { label: "Téléphone de l'entreprise", value: entreprise?.telephoneEntreprise },
      { label: "Adresse de l'entreprise", value: entreprise?.adresseEntreprise },
      { label: "Secteur d'activité", value: entreprise?.secteurActivite }
    ]);
  }

  formatMissingFields(fields: string[]): string {
    return fields.join(', ');
  }

  requiresSignatureForRole(role: unknown): boolean {
    switch (this.normalizeRole(role)) {
      case RoleUtilisateur.STAGIAIRE:
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
      case RoleUtilisateur.RESPONSABLE_UNIVERSITAIRE_STAGES:
        return true;
      default:
        return false;
    }
  }

  private signatureRules(role: unknown, signature: unknown): FieldRule[] {
    return this.requiresSignatureForRole(role) ? [{ label: 'Signature', value: signature }] : [];
  }

  private roleRules(role: unknown, profile: CurrentUserProfile): FieldRule[] {
    switch (this.normalizeRole(role)) {
      case RoleUtilisateur.STAGIAIRE:
        return [
          { label: 'Matricule', value: profile.matricule },
          { label: 'Spécialité / filière', value: profile.filiereId ?? profile.filiereNom },
          { label: 'Niveau', value: profile.niveau }
        ];
      case RoleUtilisateur.ENCADRANT_ACADEMIQUE:
        return [
          { label: 'Spécialité', value: profile.specialite }
        ];
      case RoleUtilisateur.ENCADRANT_PROFESSIONNEL:
        return [
          { label: 'Poste', value: profile.poste },
          { label: 'Service', value: profile.service },
          { label: 'Entreprise associée', value: profile.entrepriseId ?? profile.entrepriseNom }
        ];
      case RoleUtilisateur.RESPONSABLE_ENTREPRISE:
        return [
          { label: 'Poste', value: profile.poste },
          { label: 'Service', value: profile.service },
          { label: 'Entreprise associée', value: profile.entrepriseId ?? profile.entrepriseNom }
        ];
      case RoleUtilisateur.RESPONSABLE_SERVICE_STAGES:
      case RoleUtilisateur.AGENT_STAGE:
        return [
          { label: 'Service', value: profile.service }
        ];
      default:
        return [];
    }
  }

  private commonUserRules(profile: Partial<CurrentUserProfile | StudentProfile>): FieldRule[] {
    return [
      ...this.commonIdentityRules(profile),
      { label: 'Numéro de téléphone', value: profile.telephone },
      { label: 'Adresse', value: profile.adresse }
    ];
  }

  private commonIdentityRules(profile: { nom?: unknown; prenom?: unknown; email?: unknown }): FieldRule[] {
    return [
      { label: 'Nom', value: profile.nom },
      { label: 'Prénom', value: profile.prenom },
      { label: 'Email', value: profile.email }
    ];
  }

  private uniqueMissing(rules: FieldRule[]): string[] {
    return Array.from(
      new Set(rules.filter((rule) => this.isMissing(rule.value)).map((rule) => rule.label))
    );
  }

  private isMissing(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (typeof value === 'number') return !Number.isFinite(value);
    return false;
  }

  private normalizeRole(value: unknown): RoleUtilisateur | string {
    if (typeof value === 'string') {
      const role = value.startsWith('ROLE_') ? value.slice('ROLE_'.length) : value;
      return role as RoleUtilisateur;
    }

    if (value && typeof value === 'object') {
      const role = (value as any).role ?? (value as any).name ?? (value as any).code ?? '';
      return this.normalizeRole(String(role));
    }

    return '';
  }
}
