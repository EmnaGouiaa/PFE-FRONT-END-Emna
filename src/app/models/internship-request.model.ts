export enum InternshipStatus {
  PENDING = 'PENDING',
  ADMIN_APPROVED = 'ADMIN_APPROVED',
  SUPERVISOR_APPROVED = 'SUPERVISOR_APPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ACADEMICALLY_APPROVED = 'ACADEMICALLY_APPROVED',
  OFFICIAL = 'OFFICIAL',
  ADMIN_REJECTED = 'ADMIN_REJECTED'
}

export enum ValidationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
}

export interface InternshipRequest {
  id: number;
  student: User;
  companyName: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  supervisorName: string;
  supervisorEmail: string;
  supervisorPhone?: string;
  supervisorPosition?: string;
  internshipSubject: string;
  internshipDescription?: string;
  startDate?: string;
  endDate?: string;
  status: InternshipStatus;
  
  // Validation fields
  adminValidationStatus: ValidationStatus;
  supervisorValidationStatus: ValidationStatus;
  academicValidationStatus: ValidationStatus;
  
  adminValidationDate?: string;
  supervisorValidationDate?: string;
  academicValidationDate?: string;
  
  adminComment?: string;
  adminValidatedAt?: string;
  adminAgent?: User;
  
  academicComments?: string;
  validatedByAcademicSupervisor?: User;
  
  createdAt: string;
  updatedAt?: string;
}
