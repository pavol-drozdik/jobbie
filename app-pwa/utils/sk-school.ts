/** Row from GET /api/locations/sk-schools. */
export type SkSchoolLevel = 'secondary' | 'university'

export interface SkSchoolRow {
  id: number
  name: string
  level: SkSchoolLevel
  country: 'SK' | 'CZ'
  municipality: string | null
}
