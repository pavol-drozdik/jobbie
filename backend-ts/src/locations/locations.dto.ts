export interface SkMunicipalityResponseDto {
  id: number;
  name: string;
  kraj: string;
  okres: string;
}

/** Company row from RPO (ORSR / živnostenský register via unified RPO API). */
export interface SkCompanyResponseDto {
  id: number;
  name: string;
  ico: string | null;
  municipality: string | null;
}

export type SkSchoolLevelDto = 'secondary' | 'university';

export interface SkSchoolResponseDto {
  id: number;
  name: string;
  level: SkSchoolLevelDto;
  country: 'SK' | 'CZ';
  municipality: string | null;
}

/** Skill/znalosť label from shared CV catalog (`sk_cv_skills`). */
export interface SkCvSkillResponseDto {
  id: number;
  name: string;
}
