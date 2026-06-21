export type HomeReviewEntry = {
  initials: string
  name: string
  quote: string
  rating: number
}

/** Placeholder testimonials — hidden on homepage until real reviews exist. */
export const HOME_MARKETING_REVIEWS_ENABLED = false

export const HOME_REVIEWS_ROW_A: readonly HomeReviewEntry[] = [
  {
    initials: 'MP',
    name: 'Martin P.',
    quote:
      'Páči sa mi, že vidím hodnotenia firiem. Mám istotu, že chodím robiť tam, kde je to seriózne a vyplatia mi to načas.',
    rating: 5,
  },
  {
    initials: 'JN',
    name: 'Jana N.',
    quote:
      'Brigádu som našla do hodiny. Jednoduchá registrácia, prehľadné ponuky. Odporúčam každému, kto hľadá prácu popri škole.',
    rating: 5,
  },
  {
    initials: 'TK',
    name: 'Tomáš K.',
    quote:
      'Super aplikácia! Notifikácie ma upozornili na novú ponuku skôr, ako som si stihol kávu. Nastúpil som na druhý deň.',
    rating: 5,
  },
  {
    initials: 'LH',
    name: 'Lucia H.',
    quote:
      'Konečne platforma, kde nemusím posielať životopis do prázdna. Firma ma kontaktovala priamo a dohodli sme sa rýchlo.',
    rating: 5,
  },
  {
    initials: 'PB',
    name: 'Peter B.',
    quote:
      'Jobbie mi pomohol nájsť sezónnu prácu počas leta. Výber bol obrovský a filtrovanie podľa mesta fungovalo perfektne.',
    rating: 4,
  },
]

export const HOME_REVIEWS_ROW_B: readonly HomeReviewEntry[] = [
  {
    initials: 'SK',
    name: 'Simona K.',
    quote:
      'Veľmi som ocenila možnosť vidieť, koľko ľudí sa už prihlásilo. Vedela som, kedy sa ponáhľať a kedy mám čas.',
    rating: 5,
  },
  {
    initials: 'RM',
    name: 'Rastislav M.',
    quote:
      'Chat priamo v aplikácii je skvelý. Dohodol som si pohovor bez toho, aby som musel posielať e-maily sem-tam.',
    rating: 5,
  },
  {
    initials: 'AV',
    name: 'Andrea V.',
    quote:
      'Jobbie je presne to, čo som hľadala. Rýchle, jednoduché a bez zbytočného papierovačiek. Odporúčam všetkým.',
    rating: 5,
  },
  {
    initials: 'MF',
    name: 'Marek F.',
    quote:
      'Ako zamestnávateľ som obsadil pozíciu za dva dni. Kvalitných uchádzačov bolo veľa a systém na správu prihlášok je intuitívny.',
    rating: 4,
  },
  {
    initials: 'ZP',
    name: 'Zuzana P.',
    quote:
      'Používam Jobbie každé prázdniny. Vždy nájdem niečo zaujímavé a blízko domu. Hodnotenia firiem mi pomáhajú vybrať si.',
    rating: 5,
  },
]
