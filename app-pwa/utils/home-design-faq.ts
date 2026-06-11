import type { HomeDesignCarouselRole } from './home-design-carousel'

export type HomeDesignFaqItem = {
  question: string
  answer: string
}

/** FAQs per marketing role; keys match {@link HOME_DESIGN_CAROUSEL} / homepage role switcher. */
export const HOME_DESIGN_FAQ_BY_ROLE: Record<
  HomeDesignCarouselRole,
  readonly HomeDesignFaqItem[]
> = {
  zamestnavatel: [
    {
      question: 'Ako zverejním brigádu ako firma?',
      answer:
        'Zaregistruj firemný účet, vytvor inzerát s popisom, lokalitou a mzdou a zverejni ho. Uchádzači sa môžu prihlásiť priamo v aplikácii.',
    },
    {
      question: 'Koľko ma to bude stáť?',
      answer:
        'Jobbie ponúka aj bezplatné možnosti pre firmy, ako aj platené mesačné plány, kredity a doplnkové služby, ktoré nájdeš v sekcii cenník.',
    },
    {
      question: 'Ako vyberiem vhodného uchádzača?',
      answer:
        'Prezeraj profily, hodnotenia a správy od uchádzačov. Všetko máš na jednom mieste — bez zbytočnej byrokracie.',
    },
    {
      question: 'Môžem spravovať viac ponúk naraz?',
      answer:
        'Áno. V dashboarde vidíš všetky svoje inzeráty, môžeš ich upravovať, pozastaviť alebo duplikovať podľa potreby.',
    },
    {
      question: 'Je k dispozícii mobilná aplikácia?',
      answer:
        'Na vývoji aplikácií momentálne pracujeme a bude dostupná pre iOS a Android.',
    },
  ],
  brigadnik: [
    {
      question: 'Ako sa zaregistrujem na Jobbie?',
      answer:
        'Klikni na Registrovať sa, vyplň údaje a si pripravený hľadať brigády. Registrácia je rýchla a pre brigádnikov bezplatná. V prípade potreby je k dispozícii aj detailný návod.',
    },
    {
      question: 'Je používanie Jobbie pre mňa zadarmo?',
      answer: 'Áno — hľadanie brigád alebo pracovných ponúk je bezplatné.',
    },
    {
      question: 'Ako rýchlo nájdem brigádu?',
      answer:
        'Použi filtre podľa mesta, kategórie a mzdy a pravidelne kontroluj nové ponuky alebo si zapni e-mailové upozornenia.',
    },
    {
      question: 'Ako sa prihlásim na konkrétnu brigádu?',
      answer:
        'Otvor detail ponuky a odošli prihlášku jedným kliknutím. Zamestnávateľ ťa môže kontaktovať cez chat v aplikácii.',
    },
  ],
  profesional: [
    {
      question: 'Ako začnem ako profesionál?',
      answer:
        'Zaregistruj sa s rolou profesionála, vyplň profil so zručnosťami a referenciami. Zákazníci ťa nájdu cez vyhľadávanie.',
    },
    {
      question: 'Ako ma zákazníci nájdu?',
      answer:
        'Tvoj profil je viditeľný v Jobbie podľa kategórie a lokality. Môžeš doplniť fotky a popis služieb pre lepšiu viditeľnosť.',
    },
    {
      question: 'Je platforma pre profesionálov spoplatnená?',
      answer:
        'Základné zobrazenie profilu a komunikácia sú nastavené v rámci plánov Jobbie; detaily podľa typu účtu nájdeš po prihlásení v plánoch.',
    },
    {
      question: 'Ako komunikujem so zákazníkom?',
      answer:
        'Priamo v aplikácii cez chat — dohodnete termín, rozsah práce a cenu bez obchádzania platformy.',
    },
  ],
}
