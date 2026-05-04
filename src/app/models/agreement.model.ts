import { InternshipRequest } from './internship-request.model';

export enum AgreementStatus {
  GENERATED = 'GENERATED',
  PARTIALLY_SIGNED = 'PARTIALLY_SIGNED',
  FULLY_SIGNED = 'FULLY_SIGNED'
}

export enum SignatoryRole {
  STUDENT = 'STUDENT',
  PRO_SUPERVISOR = 'PRO_SUPERVISOR',
  ACADEMIC_SUPERVISOR = 'ACADEMIC_SUPERVISOR',
  INTERNSHIP_AGENT = 'INTERNSHIP_AGENT',
  COMPANY = 'COMPANY'
}

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
}

export interface AgreementSignature {
  id: number;
  signatoryRole: SignatoryRole;
  signatoryUser: User;
  signedAt?: string;
  signed: boolean;
  signatureToken?: string;
}

export interface InternshipAgreement {
  id: number;
  internshipRequest: InternshipRequest;
  pdfPath: string;
  generatedAt: string;
  status: AgreementStatus;
  signatures: AgreementSignature[];
}
