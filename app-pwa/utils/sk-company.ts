/** Row from GET /api/locations/sk-companies (RPO / ORSR + živnostenský register). */
export interface SkCompanyRow {
  id: number
  name: string
  ico: string | null
  municipality: string | null
}
