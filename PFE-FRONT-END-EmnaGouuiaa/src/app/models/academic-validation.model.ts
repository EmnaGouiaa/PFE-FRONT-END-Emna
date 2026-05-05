export interface AcademicValidationRequest {
  id: number;
  studentName: string;
  studentEmail: string;
  internshipSubject: string;
  companyName: string;
  startDate: string;
  endDate: string;
  submittedDate: string;
  academicValidationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  academicComments: string;
  academicValidationDate: string;
  validatedByAcademicSupervisor: string;
}

export interface AcademicValidationDTO {
  comment?: string;
}

