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
        'Zaregistruj firemný účet, vytvor inzerát s popisom, lokalitou a mzdou a zverejni ho. Brigádnici sa môžu prihlásiť priamo v aplikácii.',
    },
    {
      question: 'Koľko ma to bude stáť?',
      answer:
        'Jobbie ponúka aj bezplatné možnosti pre firmy; prémiové plány rozširujú zobrazenia a nástroje. Presný cenník nájdeš v sekcii plány po prihlásení.',
    },
    {
      question: 'Ako vyberiem vhodného brigádnika?',
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
        'Jobbie funguje v prehliadači aj ako nainštalovateľná PWA — pridaj si stránku na plochu telefónu pre rýchly prístup k ponukám a správam.',
    },
  ],
  brigadnik: [
    {
      question: 'Ako sa zaregistrujem na Jobbie?',
      answer:
        'Klikni na Registrovať sa, vyplň údaje a si pripravený hľadať brigády. Registrácia je rýchla a pre brigádnikov bezplatná.',
    },
    {
      question: 'Je používanie Jobbie pre mňa zadarmo?',
      answer:
        'Áno — hľadanie brigád, profil a prihlášky sú pre brigádnikov bezplatné. Platíš až keď reálne nastúpiš na dohodnutú prácu u zamestnávateľa.',
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
    {
      question: 'Môžem používať Jobbie v mobile?',
      answer:
        'Áno. Jobbie funguje v mobile v prehliadači aj ako PWA — pridaj si stránku na plochu pre notifikácie a rýchly prístup.',
    },
  ],
  poskytovatel: [
    {
      question: 'Ako začnem ako poskytovateľ služieb?',
      answer:
        'Zaregistruj sa s rolou poskytovateľa, vyplň profil so zručnosťami a referenciami. Zákazníci ťa nájdu cez vyhľadávanie.',
    },
    {
      question: 'Ako ma zákazníci objavia?',
      answer:
        'Tvoj profil je viditeľný v Jobbie podľa kategórie a lokality. Môžeš doplniť fotky a popis služieb pre lepšiu viditeľnosť.',
    },
    {
      question: 'Je platforma pre poskytovateľov spoplatnená?',
      answer:
        'Základné zobrazenie profilu a komunikácia sú nastavené v rámci plánov Jobbie; detaily podľa typu účtu nájdeš po prihlásení v plánoch.',
    },
    {
      question: 'Ako komunikujem so zákazníkom?',
      answer:
        'Priamo v aplikácii cez chat — dohodnete termín, rozsah práce a cenu bez obchádzania platformy.',
    },
    {
      question: 'Existuje mobilná aplikácia?',
      answer:
        'Jobbie je webová aplikácia s podporou PWA — na telefóne si ju pridáš na plochu a používaš ako skratku.',
    },
  ],
}
