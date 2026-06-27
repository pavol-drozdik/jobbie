/** User-facing trust / legal copy (SK). Not a substitute for formal legal review. */

export type TrustContentBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'bullets'; readonly items: readonly string[] }

export type TrustContentSection = {
  readonly id: string
  readonly title: string
  /** @deprecated Prefer `blocks` for mixed paragraphs and lists. */
  readonly paragraphs?: readonly string[]
  readonly blocks?: readonly TrustContentBlock[]
  /** Subsection heading level (default 2). */
  readonly headingLevel?: 2 | 3
}

export type TrustContentPage = {
  readonly title: string
  readonly intro: string
  readonly updatedAt: string
  /** `effective` → „Platné od“, `updated` → „Aktualizované:“ (default). */
  readonly dateLabel?: 'effective' | 'updated'
  readonly sections: readonly TrustContentSection[]
}

export function trustSectionBlocks(section: TrustContentSection): readonly TrustContentBlock[] {
  if (section.blocks?.length) return section.blocks
  return (section.paragraphs ?? []).map((text) => ({ kind: 'paragraph' as const, text }))
}

export const TRUST_SECURITY_PAGE: TrustContentPage = {
  title: 'Bezpečnosť',
  intro:
    'Bezpečnosť účtov, platieb a osobných údajov na Jobbie berieme vážne. Prehľad opatrení pre prihlásenie, platby cez Stripe, ochranu údajov a nahlasovanie obsahu.',
  updatedAt: '2026-06-01',
  sections: [
    {
      id: 'auth',
      title: 'Prihlásenie a účet',
      paragraphs: [
        'Prihlásenie prebieha cez zabezpečené služby Supabase Auth. Citlivé operácie (platby, vymazanie účtu, správa passkeys) môžu vyžadovať opätovné overenie prihlásenia.',
        'Relácia prehliadača k API používa HttpOnly cookies a CSRF ochranu pri mutáciách.',
      ],
    },
    {
      id: 'platby',
      title: 'Platby',
      paragraphs: [
        'Platby kartou spracúva Stripe. Čísla kariet sa na našich serveroch neukladajú. Kredity a predplatné sa pripisujú až po overení platby na strane servera.',
      ],
    },
    {
      id: 'udaje',
      title: 'Osobné údaje a CV',
      paragraphs: [
        'Kontaktné údaje v životopisoch a profiloch sa zamestnávateľom zobrazujú len podľa nastavení viditeľnosti a pravidiel odomknutia kontaktu.',
        'Údaje môžete exportovať alebo požiadať o vymazanie účtu v nastaveniach.',
      ],
    },
    {
      id: 'nahlasovanie',
      title: 'Nahlásenie obsahu',
      paragraphs: [
        'Pri podozrivom alebo nevhodnom obsahu otvorte menu (⋮) na detaile ponuky alebo inzerátu profesionála a zvoľte Nahlásiť.',
      ],
    },
  ],
}

