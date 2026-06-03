export type HomeFaqRole = 'employer' | 'worker' | 'provider'

export interface HomeFaqItem {
  readonly question: string
  readonly answer: string
}

export const HOME_FAQ_BY_ROLE: Readonly<Record<HomeFaqRole, readonly HomeFaqItem[]>> = {
  employer: [
    {
      question: 'Čo je Jobbie a na čo slúži?',
      answer:
        'Jobbie je platforma na rýchle spojenie zamestnávateľov s brigádnikmi. Zverejníte ponuku, uchádzači sa prihlásia a komunikujete priamo v aplikácii.',
    },
    {
      question: 'Ako zverejním brigádu?',
      answer:
        'Po prihlásení choďte na „Pridať ponuku“, vyplňte popis, miesto, odmenu a čas. Ponuka sa zobrazí v prehľade a brigádnici sa môžu prihlásiť.',
    },
    {
      question: 'Koľko to stojí a ako zvýšim viditeľnosť?',
      answer:
        'Cenník a predplatné nájdete v sekcii Plány. Zvýraznenie a kredity vám pomôžu dostať ponuku vyššie v výsledkoch a osloviť viac ľudí.',
    },
    {
      question: 'Ako prebieha komunikácia s brigádnikmi?',
      answer:
        'Po prihlásení uchádzača môžete písať v správach v aplikácii. Dohodnite detail priamo tam, kým sa nestretnete na mieste.',
    },
    {
      question: 'Môžem mať viac ponúk naraz?',
      answer:
        'Áno. Vytvorte toľko inzerátov, koľko potrebujete — podľa vašich limitov a predplatného.',
    },
    {
      question: 'Rieši Jobbie zmluvy a platby?',
      answer:
        'Jobbie vám pomáha nájsť kontakt a dohodnúť podmienky. Zmluvy a platby medzi vami a brigádnikom si dohadujete vy; platforma nesprostredkováva výplatu mzdy.',
    },
    {
      question: 'Ako kontaktujem podporu?',
      answer:
        'Napíšte nám na e-mail uvedený v pätičke stránky. Radi pomôžeme s účtom, ponukami a fakturáciou predplatného.',
    },
  ],
  worker: [
    {
      question: 'Čo je Jobbie a na čo slúži?',
      answer:
        'Jobbie zobrazuje brigády a dočasné práce vo vašom okolí. Nájdete ponuku, prihlásite sa a spojíte sa so zamestnávateľom cez chat.',
    },
    {
      question: 'Ako nájdem brigádu v okolí?',
      answer:
        'V sekcii „Ponuky“ filtrujte podľa miesta, kategórie a platových očakávaní. Uložte si hľadanie a prezerajte nové inzeráty priebežne.',
    },
    {
      question: 'Ako sa prihlásim na ponuku?',
      answer:
        'Otvorte detail brigády a kliknite na prihlásenie. Zamestnávateľ uvidí váš profil a môže vás osloviť v správach.',
    },
    {
      question: 'Musím platiť za registráciu?',
      answer:
        'Registrácia pre brigádnika je zadarmo. Platíte len vtedy, ak si sami zvolíte platené funkcie uvedené v cenníku (ak sú k dispozícii).',
    },
    {
      question: 'Ako funguje chat so zamestnávateľom?',
      answer:
        'Po vzájomnom záujme píšete v aplikácii v správach. Odporúčame dohodnúť čas, miesto a odmenu pred začatím práce.',
    },
    {
      question: 'Čo ak ma zamestnávateľ neosloví?',
      answer:
        'Skúste upraviť profil, prihlásiť sa na ďalšie ponuky alebo napísať zamestnávateľovi krátky dotaz v správach, ak to platforma umožňuje.',
    },
    {
      question: 'Ako kontaktujem podporu?',
      answer:
        'Použite kontakt v pätičke. Pomôžeme s prihlásením, notifikáciami a základnými otázkami k účtu.',
    },
  ],
  provider: [
    {
      question: 'Čo je Jobbie a na čo slúži?',
      answer:
        'Pre poskytovateľov služieb Jobbie ponúka sekciu Firmy, kde môžete predstaviť živnosť alebo firmu a osloviť klientov, ktorí hľadajú služby vo vašom segmente.',
    },
    {
      question: 'Ako pridám firmu do katalógu?',
      answer:
        'V časti Firmy vytvorte profil s popisom, lokalitou a kontaktom. Po schválení alebo uložení sa zobrazí v zozname firiem.',
    },
    {
      question: 'Čo je platené zvýraznenie?',
      answer:
        'Plány a kredity môžu zvýšiť viditeľnosť vášho profilu alebo reklamy vo výsledkoch. Presné možnosti nájdete na stránke Plány.',
    },
    {
      question: 'Ako získam klientov cez Jobbie?',
      answer:
        'Udržujte aktuálny profil, jasný popis služieb a odpovedajte na správy rýchlo. Kombinujte organické zobrazenie s plateným zvýraznením podľa potreby.',
    },
    {
      question: 'Môžem inzerovať viac služieb naraz?',
      answer:
        'Áno, v profile môžete popísať viacero služieb alebo vytvoriť samostatné záznamy podľa pravidiel platformy.',
    },
    {
      question: 'Ako upravím profil firmy?',
      answer:
        'V nastaveniach profilu alebo v sekcii Firmy otvorte úpravu a uložte zmeny — logo, text, kontakt a kategórie.',
    },
    {
      question: 'Ako kontaktujem podporu?',
      answer:
        'Kontakt v pätičke stránky. Pri technických problémoch uveďte e-mail účtu a stručný popis.',
    },
  ],
}
