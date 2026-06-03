/**
 * Reference data for Worki-style job email alerts and `/vytvorit-ponuku` job posting form.
 * IDs are stable and shared with the backend (`job_email_alerts.*_levels`, `job_offers.benefits`, etc.).
 */

export type IdLabel<TId extends number = number> = { id: TId; label: string }
export type LevelOption = { value: string; label: string }

export const EDUCATION_LEVELS: ReadonlyArray<IdLabel> = [
  { id: 1, label: 'Základné vzdelanie' },
  { id: 2, label: 'Nižšie stredné odborné vzdelanie' },
  { id: 3, label: 'Stredné odborné vzdelanie' },
  { id: 4, label: 'Úplné stredné odborné vzdelanie' },
  { id: 5, label: 'Úplné stredné všeobecné vzdelanie (gymnázium)' },
  { id: 6, label: 'Vyššie odborné vzdelanie' },
  { id: 7, label: 'Vysokoškolské vzdelanie prvého stupňa' },
  { id: 8, label: 'Vysokoškolské vzdelanie druhého stupňa' },
  { id: 9, label: 'Vysokoškolské vzdelanie tretieho stupňa' },
]

export const SUITABLE_FOR: ReadonlyArray<IdLabel> = [
  { id: 1, label: 'Ukrajincov/Ukrajinky' },
  { id: 2, label: 'Absolventa' },
  { id: 3, label: 'Študenta' },
  { id: 4, label: 'Mladistvého' },
  { id: 5, label: 'Zdravotne postihnutého' },
  { id: 6, label: 'Dôchodcu' },
  { id: 7, label: 'Rodiča na rodičovskej dovolenke' },
  { id: 8, label: 'Uchádzača bez odbornej praxe' },
]

export const BENEFITS: ReadonlyArray<IdLabel> = [
  { id: 1, label: 'príspevok na ubytovanie' },
  { id: 2, label: 'zabezpečené ubytovanie' },
  { id: 3, label: 'zabezpečená doprava do práce' },
  { id: 4, label: '13. plat' },
  { id: 5, label: '14. plat' },
  { id: 6, label: 'finančné pôžičky' },
  { id: 7, label: 'firemné vozidlo aj na súkromné účely' },
  { id: 8, label: 'mimoriadne odmeny za pracovné výkony' },
  { id: 9, label: 'náborový príspevok' },
  { id: 10, label: 'odmeny pri pracovných a životných jubileách' },
  { id: 11, label: 'predaj firemných výrobkov alebo služieb so zľavou' },
  { id: 12, label: 'príspevok na cestovanie do práce' },
  { id: 13, label: 'príspevok na doplnkové dôchodkové sporenie' },
  { id: 14, label: 'príspevok pri narodení dieťaťa' },
  { id: 15, label: 'využívanie zariadení (notebook, telefón) aj na súkromné účely' },
  { id: 16, label: 'domáce alebo zahraničné pracovné cesty' },
  { id: 17, label: 'flexibilný pracovný čas' },
  { id: 18, label: 'štvordňový pracovný týždeň' },
  { id: 19, label: 'firemná škôlka' },
  { id: 20, label: 'firemné spoločenské alebo športové akcie, teambuildingy' },
  { id: 21, label: 'kid-friendly office' },
  { id: 22, label: 'oddychová, relaxačná miestnosť alebo zóna' },
  { id: 23, label: 'pet-friendly office' },
  { id: 24, label: 'vzdelávacie kurzy a školenia' },
  { id: 25, label: 'občerstvenie na pracovisku' },
  { id: 26, label: 'závodné stravovanie' },
  { id: 27, label: 'zvýhodnené príspevky na stravovanie' },
  { id: 28, label: 'dovolenka nad rámec Zákonníka práce' },
  { id: 29, label: 'lekárske prehliadky nad rámec zákona' },
  { id: 30, label: 'narodeninové voľno' },
  { id: 31, label: 'príspevok na šport, kultúru alebo voľný čas' },
  { id: 32, label: 'rekreačný poukaz, príspevok na dovolenku' },
  { id: 33, label: 'sick days' },
]

export const DRIVER_LICENSES: ReadonlyArray<IdLabel> = [
  { id: 1, label: 'Skupina A' },
  { id: 2, label: 'Podskupina A1' },
  { id: 3, label: 'Podskupina A2' },
  { id: 4, label: 'Skupina AM' },
  { id: 5, label: 'Skupina B' },
  { id: 6, label: 'Podskupina B1' },
  { id: 7, label: 'Skupina C' },
  { id: 8, label: 'Podskupina C1' },
  { id: 9, label: 'Skupina D' },
  { id: 10, label: 'Podskupina D1' },
  { id: 11, label: 'Skupina B + E' },
  { id: 12, label: 'Skupina C + E' },
  { id: 13, label: 'Skupina D + E' },
  { id: 14, label: 'Podskupina C1 + E' },
  { id: 15, label: 'Podskupina D1 + E' },
  { id: 16, label: 'Skupina T' },
  { id: 17, label: 'Skupina E' },
]

export const WORK_SHIFT_MODES: ReadonlyArray<IdLabel> = [
  { id: 1, label: 'Jednozmenný pracovný režim' },
  { id: 2, label: 'Dvojzmenný pracovný režim' },
  { id: 3, label: 'Trojzmenný pracovný režim' },
  { id: 4, label: 'Štvorzmenný pracovný režim' },
  { id: 5, label: 'Nepretržitý pracovný režim' },
  { id: 6, label: 'Turnusová práca' },
  { id: 7, label: 'Pružný pracovný čas' },
  { id: 8, label: 'Delené zmeny' },
]

export const LANGUAGES: ReadonlyArray<IdLabel> = [
  { id: 2, label: 'Anglický' },
  { id: 30, label: 'Nemecký' },
  { id: 1, label: 'Albánsky' },
  { id: 3, label: 'Arabský' },
  { id: 4, label: 'Azerbajdžanský' },
  { id: 5, label: 'Bulharský' },
  { id: 6, label: 'Český' },
  { id: 19, label: 'Chorvátsky' },
  { id: 7, label: 'Čínsky (mandarínčina)' },
  { id: 8, label: 'Dánsky' },
  { id: 9, label: 'Esperanto' },
  { id: 10, label: 'Estónsky' },
  { id: 11, label: 'Filipínsky' },
  { id: 12, label: 'Fínsky' },
  { id: 13, label: 'Francúzsky' },
  { id: 14, label: 'Grécky' },
  { id: 15, label: 'Gruzínsky' },
  { id: 16, label: 'Hebrejský' },
  { id: 17, label: 'Hindský' },
  { id: 18, label: 'Holandský' },
  { id: 20, label: 'Írsky' },
  { id: 21, label: 'Islandský' },
  { id: 22, label: 'Japonský' },
  { id: 23, label: 'Kórejský' },
  { id: 24, label: 'Latinský' },
  { id: 25, label: 'Litovský' },
  { id: 26, label: 'Lotyšský' },
  { id: 27, label: 'Macedónsky' },
  { id: 28, label: 'Maďarský' },
  { id: 29, label: 'Maltský' },
  { id: 31, label: 'Nórsky' },
  { id: 32, label: 'Poľský' },
  { id: 33, label: 'Portugalský' },
  { id: 34, label: 'Rómsky' },
  { id: 35, label: 'Rumunský' },
  { id: 36, label: 'Ruský' },
  { id: 37, label: 'Slovenský' },
  { id: 38, label: 'Slovinský' },
  { id: 39, label: 'Srbský' },
  { id: 40, label: 'Španielsky' },
  { id: 41, label: 'Švédsky' },
  { id: 42, label: 'Taliansky' },
  { id: 43, label: 'Thajský' },
  { id: 44, label: 'Turecký' },
  { id: 45, label: 'Ukrajinský' },
  { id: 46, label: 'Vietnamský' },
]

export const LANGUAGE_LEVELS: ReadonlyArray<LevelOption> = [
  { value: 'undefined', label: 'Nezáleží' },
  { value: 'elementary', label: 'Elementárna: A1 a A2' },
  { value: 'intermediate', label: 'Pokročilá: B1 a B2' },
  { value: 'master', label: 'Vysoká: C1 a C2' },
]

export const PC_SKILL_LEVELS: ReadonlyArray<LevelOption> = [
  { value: 'undefined', label: 'Nezáleží' },
  { value: 'elementary', label: 'Elementárna' },
  { value: 'intermediate', label: 'Pokročilá' },
  { value: 'master', label: 'Vysoká' },
]

export type PcSkillGroup = { label: string; skills: IdLabel[] }

export const PC_SKILLS_GROUPED: ReadonlyArray<PcSkillGroup> = [
  {
    label: 'Kancelárske balíky',
    skills: [
      { id: 104, label: 'Adobe Acrobat DC' },
      { id: 105, label: 'Google Docs' },
      { id: 106, label: 'Google Forms' },
      { id: 1, label: 'Internet' },
      { id: 107, label: 'LibreOffice Base' },
      { id: 108, label: 'LibreOffice Calc' },
      { id: 109, label: 'LibreOffice Draw' },
      { id: 110, label: 'LibreOffice Impress' },
      { id: 111, label: 'LibreOffice Writer' },
      { id: 2, label: 'Lotus Notes' },
      { id: 80, label: 'Mailchimp' },
      { id: 3, label: 'Microsoft Excel' },
      { id: 112, label: 'Microsoft OneNote' },
      { id: 4, label: 'Microsoft Outlook' },
      { id: 5, label: 'Microsoft PowerPoint' },
      { id: 79, label: 'Microsoft SharePoint' },
      { id: 76, label: 'Microsoft Teams' },
      { id: 6, label: 'Microsoft Word' },
      { id: 7, label: 'Open Office' },
      { id: 81, label: 'Power BI' },
      { id: 77, label: 'Skype' },
      { id: 78, label: 'Zoom' },
    ],
  },
  {
    label: 'Grafické nástroje',
    skills: [
      { id: 99, label: 'Adobe After Effects' },
      { id: 8, label: 'Adobe Illustrator' },
      { id: 9, label: 'Adobe InDesign' },
      { id: 10, label: 'Adobe Lightroom' },
      { id: 11, label: 'Adobe Photoshop' },
      { id: 82, label: 'Adobe Premiere Pro' },
      { id: 100, label: 'Blender' },
      { id: 101, label: 'Canva' },
      { id: 12, label: 'Corel Draw' },
      { id: 13, label: 'Corel Photopaint' },
      { id: 14, label: 'DTP' },
      { id: 15, label: 'Gimp' },
      { id: 102, label: 'Inkscape' },
      { id: 103, label: 'Procreate' },
    ],
  },
  {
    label: 'Správa systémov',
    skills: [
      { id: 113, label: 'Amazon EC2' },
      { id: 84, label: 'Google AdSense' },
      { id: 85, label: 'Google AdWords' },
      { id: 83, label: 'Google Analytics' },
      { id: 114, label: 'IBM Cloud' },
      { id: 17, label: 'IBM i' },
      { id: 86, label: 'Jira' },
      { id: 18, label: 'Linux' },
      { id: 19, label: 'MAC OS X' },
      { id: 16, label: 'Microsoft Active Directory' },
      { id: 115, label: 'Microsoft Azure' },
      { id: 20, label: 'Microsoft Windows' },
      { id: 21, label: 'Microsoft Windows Server' },
      { id: 22, label: 'MSSQL' },
      { id: 23, label: 'ORACLE SQL' },
      { id: 116, label: 'Slack' },
      { id: 24, label: 'Sun Solaris' },
      { id: 117, label: 'Trello' },
      { id: 25, label: 'Unix' },
      { id: 118, label: 'Zabbix' },
    ],
  },
  {
    label: 'Tvorba webu',
    skills: [
      { id: 27, label: 'AJAX' },
      { id: 122, label: 'Cypress' },
      { id: 28, label: 'HTML' },
      { id: 29, label: 'Javascript' },
      { id: 119, label: 'Joomla' },
      { id: 30, label: 'PHP' },
      { id: 31, label: 'SEO' },
      { id: 123, label: 'SoapUI' },
      { id: 120, label: 'Squarespace' },
      { id: 121, label: 'Wix' },
      { id: 26, label: 'WordPress' },
      { id: 32, label: 'XHTML' },
      { id: 33, label: 'XML' },
      { id: 124, label: 'Zephyr' },
    ],
  },
  {
    label: 'Programovanie',
    skills: [
      { id: 34, label: '.NET' },
      { id: 125, label: 'Appium' },
      { id: 35, label: 'C, C++' },
      { id: 36, label: 'C#' },
      { id: 126, label: 'Cucumber' },
      { id: 37, label: 'Delphi' },
      { id: 38, label: 'Java' },
      { id: 127, label: 'Postman' },
      { id: 39, label: 'Python' },
      { id: 128, label: 'QASE' },
      { id: 40, label: 'SAP' },
      { id: 41, label: 'SQL' },
      { id: 42, label: 'Visual Basic' },
      { id: 129, label: 'Visual Studio Code' },
    ],
  },
  {
    label: 'Databázy',
    skills: [
      { id: 43, label: 'IBM DB2' },
      { id: 44, label: 'Microsoft Access' },
      { id: 45, label: 'MSSQL' },
      { id: 46, label: 'MySQL' },
      { id: 47, label: 'PostgreSQL' },
    ],
  },
  {
    label: 'CAD',
    skills: [
      { id: 48, label: 'AutoCAD' },
      { id: 49, label: 'Autodesk Inventor' },
      { id: 50, label: 'CATIA' },
      { id: 51, label: 'Google Sketchup' },
      { id: 52, label: 'SolidWorks' },
    ],
  },
  {
    label: 'Ekonomické programy',
    skills: [
      { id: 53, label: 'ALFA' },
      { id: 96, label: 'Asseco SPIN' },
      { id: 54, label: 'CENKROS plus' },
      { id: 97, label: 'Humanet' },
      { id: 55, label: 'MRP' },
      { id: 98, label: 'Olymp' },
      { id: 56, label: 'OMEGA' },
      { id: 57, label: 'POHODA' },
      { id: 58, label: 'PROLUC' },
      { id: 59, label: 'SAP' },
      { id: 60, label: 'SOFTIP' },
    ],
  },
  {
    label: 'Marketing',
    skills: [
      { id: 88, label: 'Buffer' },
      { id: 89, label: 'Hootsuite' },
      { id: 90, label: 'HubSpot' },
      { id: 93, label: 'Meta Business Manager' },
      { id: 91, label: 'Sprout Social' },
      { id: 92, label: 'ZoomSphere' },
    ],
  },
  {
    label: 'Softvérové testovanie',
    skills: [{ id: 95, label: 'Selenium' }],
  },
]

/** Flattened PC skills list for label lookups. */
export const PC_SKILLS_FLAT: ReadonlyArray<IdLabel> = PC_SKILLS_GROUPED.flatMap(
  (g) => g.skills,
)

const educationById = new Map(EDUCATION_LEVELS.map((o) => [o.id, o.label]))
const benefitById = new Map(BENEFITS.map((o) => [o.id, o.label]))
const suitableById = new Map(SUITABLE_FOR.map((o) => [o.id, o.label]))
const driverById = new Map(DRIVER_LICENSES.map((o) => [o.id, o.label]))
const shiftById = new Map(WORK_SHIFT_MODES.map((o) => [o.id, o.label]))
const languageById = new Map(LANGUAGES.map((o) => [o.id, o.label]))
const pcSkillById = new Map(PC_SKILLS_FLAT.map((o) => [o.id, o.label]))

export function educationLevelLabel(id: number): string {
  return educationById.get(id) ?? `#${id}`
}
export function benefitLabel(id: number): string {
  return benefitById.get(id) ?? `#${id}`
}
export function suitableForLabel(id: number): string {
  return suitableById.get(id) ?? `#${id}`
}
export function driverLicenseLabel(id: number): string {
  return driverById.get(id) ?? `#${id}`
}
export function workShiftModeLabel(id: number): string {
  return shiftById.get(id) ?? `#${id}`
}
export function languageLabel(id: number): string {
  return languageById.get(id) ?? `#${id}`
}
export function pcSkillLabel(id: number): string {
  return pcSkillById.get(id) ?? `#${id}`
}
export function languageLevelLabel(value: string): string {
  return LANGUAGE_LEVELS.find((l) => l.value === value)?.label ?? value
}
export function pcSkillLevelLabel(value: string): string {
  return PC_SKILL_LEVELS.find((l) => l.value === value)?.label ?? value
}
