// Define types for each nested structure within CaseData

interface DoctorNotes {
    image: string;
    name: string;
    age: string;
    PMHX: string;
    medicationHistory: string;
    medicalNotes: string;
    results: string;
    caseDetails: string;
  }
  
  interface PatientNotes {
    background: string;
    name: string;
    age: string;
    caseBackground: string;
    presentingComplaint: string;
    openHistory: string;
    positiveSX: string;
    negativeSX: string;
    ideas: string;
    concerns: string;
    expectations: string;
    pastMedicalHistory: string;
    medications: string;
    socialHistory: string;
    familyHistory: string;
    behaviour: string;
  }
  
  interface Marking {
    positiveIndicatorsGathering: string;
    negativeIndicatorsGathering: string;
    positiveIndicatorsManagement: string;
    negativeIndicatorsManagement: string;
    positiveIndicatorsRelating: string;
    negativeIndicatorsRelating: string;
  }
  
  interface Management {
    managementOfCase: string;
    managementOfDisease: string;
    relation: string;
    adviceToPatients: string;
    safetyNet: string;
    furtherReading: string;
  }
  
  // Define the main CaseData interface
  export interface CaseData {
    caseId: string;
    category: string;
    tier: number;
    title: string;
    anonymousTitle: string;
    doctor: DoctorNotes;
    patient: PatientNotes;
    marking: Marking;
    // keyIssues: string;
    management: Management;
    createdAt: string;
  }