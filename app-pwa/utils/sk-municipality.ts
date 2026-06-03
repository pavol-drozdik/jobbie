/** Row from GET /api/locations/sk-municipalities (matches Nest SkMunicipalityResponseDto). */
export interface SkMunicipalityRow {
  id: number
  name: string
  kraj: string
  okres: string
}
