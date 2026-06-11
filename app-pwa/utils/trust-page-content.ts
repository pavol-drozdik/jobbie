/** User-facing trust / legal copy (SK). Not a substitute for formal legal review. */

export type TrustContentSection = {
  readonly id: string
  readonly title: string
  readonly paragraphs: readonly string[]
}

export type TrustContentPage = {
  readonly title: string
  readonly intro: string
  readonly updatedAt: string
  readonly sections: readonly TrustContentSection[]
}

export const TRUST_SECURITY_PAGE: TrustContentPage = {
  title: 'Bezpečnosť',
  intro:
    'Bezpečnosť účtov, platieb a osobných údajov berieme vážne. Nižšie je prehľad hlavných opatrení platformy JOBBIE.',
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

export const TRUST_PRIVACY_PAGE: TrustContentPage = {
  title: 'Ochrana osobných údajov',
  intro:
    'Oficiálne zásady ochrany osobných údajov platformy Jobbie. Správcom osobných údajov je CoCreate s. r. o. Kontakt: ahoj@jobbie.sk.',
  updatedAt: '2026-02-25',
  sections: [],
}

export const TRUST_TERMS_PAGE: TrustContentPage = {
  title: 'Všeobecné podmienky',
  intro:
    'Používaním platformy JOBBIE súhlasíte s týmito všeobecnými podmienkami. Ak s nimi nesúhlasíte, službu nepoužívajte.',
  updatedAt: '2026-06-01',
  sections: [
    {
      id: 'sluzba',
      title: 'Charakter služby',
      paragraphs: [
        'JOBBIE je online platforma na zverejňovanie ponúk, vyhľadávanie brigád a komunikáciu medzi používateľmi. Nie sme zamestnávateľom uchádzačov ani sprostredkovateľom výplaty mzdy medzi vami a protistranou.',
      ],
    },
    {
      id: 'ucet',
      title: 'Účet a obsah',
      paragraphs: [
        'Za pravdivosť údajov v ponukách, profiloch a životopisoch zodpovedá používateľ, ktorý ich zverejnil. Zakázaný je nezákonný, zavádzajúci alebo škodlivý obsah.',
        'Účet môžeme obmedziť alebo ukončiť pri porušení podmienok alebo z dôvodu bezpečnosti.',
      ],
    },
    {
      id: 'platby',
      title: 'Platby a kredity',
      paragraphs: [
        'Platené funkcie (kredity, predplatné, doplnkové služby) sú popísané na stránke Cenník. Ceny a rozsah plánov sa riadia aktuálnym cenníkom v aplikácii.',
      ],
    },
    {
      id: 'zodpovednost',
      title: 'Obmedzenie zodpovednosti',
      paragraphs: [
        'Platformu poskytujeme v rozsahu „tak ako je“. Nenesieme zodpovednosť za dohody medzi zamestnávateľom a uchádzačom mimo rozsahu našej služby.',
      ],
    },
    {
      id: 'zmeny',
      title: 'Zmeny podmienok',
      paragraphs: [
        'Podmienky môžeme aktualizovať. Dátum poslednej úpravy je uvedený na tejto stránke. Pokračovaním v používaní po zmene vyjadrujete súhlas s novým znením.',
      ],
    },
  ],
}
