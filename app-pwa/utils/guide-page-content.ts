import type { TrustContentPage } from '~/utils/trust-page-content'
import { ROUTES } from '~/utils/app-routes'

export type GuidePageDef = TrustContentPage & {
  readonly path: string
}

export const GUIDE_PAGES: readonly GuidePageDef[] = [
  {
    path: ROUTES.guideHowItWorks,
    title: 'Ako to funguje',
    intro:
      'Jobbie spája brigádnikov, zamestnávateľov a profesionálov ponúkajúcich služby na jednej platforme.',
    updatedAt: '2026-06-02',
    sections: [
      {
        id: 'seekers',
        title: 'Pre uchádzačov',
        paragraphs: [
          'Prehliadajte pracovné ponuky, prihláste sa jedným klikom a komunikujte so zamestnávateľom v chate.',
          'Môžete si vytvoriť životopis a zapnúť e-mailové upozornenia na nové ponuky.',
        ],
      },
      {
        id: 'employers',
        title: 'Pre zamestnávateľov',
        paragraphs: [
          'Zverejnite ponuku, spravujte prihlášky a oslovujte kandidátov z databázy životopisov podľa plánu.',
          'Platené funkcie (zverejnenie, topovanie) fungujú cez kredity — podrobnosti nájdete na stránke Cenník.',
        ],
      },
      {
        id: 'professionals',
        title: 'Pre profesionálov so službou',
        paragraphs: [
          'V sekcii Profesionáli môžete zverejniť reklamu na svoju firmu alebo službu a osloviť zákazníkov v regióne.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideRegister,
    title: 'Ako sa registrovať',
    intro: 'Vytvorenie účtu na Jobbie trvá niekoľko minút. Potrebujete platný e-mail a heslo.',
    updatedAt: '2026-06-02',
    sections: [
      {
        id: 'start',
        title: '1. Začnite registráciu',
        paragraphs: [
          'Kliknite na Zaregistrovať sa a vyberte, či zakladáte účet ako fyzická osoba alebo firma.',
          'Vyplňte kontaktné údaje a vytvorte heslo podľa bezpečnostných požiadaviek.',
        ],
      },
      {
        id: 'confirm',
        title: '2. Potvrďte e-mail',
        paragraphs: [
          'Na uvedenú adresu príde overovací odkaz. Bez potvrdenia e-mailu sa neprihlásite.',
        ],
      },
      {
        id: 'profile',
        title: '3. Doplňte profil',
        paragraphs: [
          'Po prihlásení doplníte profil a podľa typu účtu môžete vytvárať ponuky, životopisy alebo službu medzi profesionálmi.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideCreateService,
    title: 'Ako vytvoriť službu',
    intro:
      'Službu medzi profesionálmi zverejníte ako reklamu firmy — zákazníci vás nájdu v katalógu Profesionáli.',
    updatedAt: '2026-06-02',
    sections: [
      {
        id: 'access',
        title: '1. Prihlásenie a firma',
        paragraphs: [
          'Prihláste sa pod firemným alebo živnostenským účtom a v nastaveniach doplňte údaje o firme.',
        ],
      },
      {
        id: 'create',
        title: '2. Nová reklama',
        paragraphs: [
          'Choďte na Moje reklamy → Pridať službu. Vyplňte názov, popis, kategóriu, lokalitu a kontakt.',
          'Nahrajte fotografie podľa pokynov v sprievodcovi — obrázky prejdú kontrolou pred zverejnením.',
        ],
      },
      {
        id: 'publish',
        title: '3. Zverejnenie',
        paragraphs: [
          'Reklamu uložíte ako koncept alebo ju aktivujete. Aktivácia môže spotrebovať kredity podľa cenníka.',
          'Po schválení sa služba zobrazí v katalógu Profesionáli.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideCreateProfile,
    title: 'Ako si vytvoriť profil',
    intro: 'Kompletný profil zvyšuje dôveryhodnosť pri prihláškach, v chate aj medzi profesionálmi.',
    updatedAt: '2026-06-02',
    sections: [
      {
        id: 'basics',
        title: 'Základné údaje',
        paragraphs: [
          'V sekcii Profil doplňte meno, fotografiu a krátky popis. Firemný účet vyplní aj údaje o spoločnosti.',
        ],
      },
      {
        id: 'public',
        title: 'Verejný profil',
        paragraphs: [
          'V nastaveniach môžete zapnúť verejný profil a zvoliť, čo sa zobrazí ostatným (adresa, telefón, e-mail).',
          'Uchádzači môžu mať aj životopis viditeľný pre zamestnávateľov — nastavíte to pri úprave CV.',
        ],
      },
      {
        id: 'privacy',
        title: 'Súkromie',
        paragraphs: [
          'Kontaktné údaje sa zobrazujú len podľa vašich volieb a pravidiel platformy (napr. odomknutie kontaktu v databáze CV).',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideTopService,
    title: 'Ako topovať službu',
    intro:
      'Topovanie zvýrazní vašu reklamu v katalógu Profesionáli — zákazníci ju uvidia skôr ako bežné inzeráty.',
    updatedAt: '2026-06-02',
    sections: [
      {
        id: 'when',
        title: 'Kedy topovať',
        paragraphs: [
          'Topovanie zvolíte pri vytváraní alebo predĺžení reklamy v sprievodcovi Moje reklamy.',
          'Zapnutím možnosti Top sa k cene pridá suma kreditov podľa dĺžky zverejnenia — aktuálne sumy sú na Cenníku.',
        ],
      },
      {
        id: 'badge',
        title: 'Označenie TOP',
        paragraphs: [
          'Aktívna topovaná služba má v zozname označenie TOP, čo zvyšuje pozornosť návštevníkov.',
        ],
      },
      {
        id: 'credits',
        title: 'Kredity',
        paragraphs: [
          'Ak nemáte dostatok kreditov, dokúpite balík alebo mesačný plán na stránke Cenník pred aktiváciou.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideAddVoucher,
    title: 'Ako pridať voucher',
    intro:
      'Voucher (zľavový kupón) môžete pridať k službe, aby zákazníci videli akciu priamo v inzeráte.',
    updatedAt: '2026-06-02',
    sections: [
      {
        id: 'edit',
        title: '1. Upravte reklamu',
        paragraphs: [
          'V Moje reklamy otvorte existujúcu službu alebo vytvorte novú. V sprievodcovi nájdete sekciu pre voucher / zľavu.',
        ],
      },
      {
        id: 'fields',
        title: '2. Vyplňte údaje',
        paragraphs: [
          'Zadajte text ponuky (napr. percentuálnu zľavu alebo fixnú sumu), platnosť a podmienky uplatnenia.',
          'Uistite sa, že popis zodpovedá skutočným podmienkam vašej firmy.',
        ],
      },
      {
        id: 'save',
        title: '3. Uložte a zverejnite',
        paragraphs: [
          'Po uložení sa voucher zobrazí na detaile služby v katalógu Profesionáli. Zmeny po aktivácii môžu vyžadovať opätovné uloženie reklamy.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideApply,
    title: 'Ako sa prihlásiť na brigádu',
    intro:
      'Krátky návod pre brigádnikov: nájdite ponuku, odošlite prihlášku a komunikujte so zamestnávateľom v Jobbie.',
    updatedAt: '2026-06-01',
    sections: [
      {
        id: 'find',
        title: '1. Nájdite ponuku',
        paragraphs: [
          'Prejdite do katalógu Pracovné ponuky a filtrujte podľa mesta, kategórie alebo odmeny.',
          'Uložte si hľadanie alebo si zapnite e-mailové upozornenia na nové ponuky.',
        ],
      },
      {
        id: 'apply',
        title: '2. Prihláste sa',
        paragraphs: [
          'Otvorte detail ponuky a odošlite prihlášku. Zamestnávateľ uvidí váš profil a môže vás osloviť v správach.',
        ],
      },
      {
        id: 'chat',
        title: '3. Dohodnite podmienky',
        paragraphs: [
          'Po vzájomnom záujme píšete v chat-e v aplikácii. Dohodnite čas, miesto a odmenu pred začatím práce.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideCreateJob,
    title: 'Ako vytvoriť pracovnú ponuku',
    intro:
      'Návod pre zamestnávateľov: vytvorte inzerát, zverejnite ho a spravujte prihlášky v Jobbie.',
    updatedAt: '2026-06-01',
    sections: [
      {
        id: 'account',
        title: '1. Firemný účet',
        paragraphs: [
          'Registrujte sa ako zamestnávateľ a doplnite firemný profil v nastaveniach.',
        ],
      },
      {
        id: 'draft',
        title: '2. Vytvorte ponuku',
        paragraphs: [
          'Choďte na Pridať ponuku, vyplňte popis, lokalitu, typ práce a odmenu. Uložte koncept alebo zverejnite ponuku.',
          'Zverejnenie môže spotrebovať kredity podľa cenníka — presné sumy nájdete na stránke Cenník.',
        ],
      },
      {
        id: 'manage',
        title: '3. Spravujte uchádzačov',
        paragraphs: [
          'Prihlášky a správy spravujete v dashboarde a v sekcii Správca uchádzačov.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideCredits,
    title: 'Ako fungujú kredity',
    intro:
      'Kredity sú jednotky na platené akcie v platforme (zverejnenie, zvýraznenie ponuky a pod.). Mesačné plány môžu obsahovať pravidelné benefity.',
    updatedAt: '2026-06-01',
    sections: [
      {
        id: 'what',
        title: 'Čo sú kredity',
        paragraphs: [
          'Kredity kúpite jednorazovo na stránke Cenník alebo získate v rámci mesačného plánu.',
          'Pri konkrétnej akcii (napr. aktivácia ponuky) sa kredity odpočítajú automaticky po úspešnom potvrdení na serveri.',
        ],
      },
      {
        id: 'plans',
        title: 'Plány vs. balíky',
        paragraphs: [
          'Mesačný plán obsahuje pravidelné benefity podľa tieru. Jednorazové balíky sú vhodné, ak platené funkcie potrebujete občas.',
        ],
      },
      {
        id: 'payment',
        title: 'Platba',
        paragraphs: [
          'Platbu kartou spracuje Stripe. Kredity sa pripíšu až po úspešnom potvrdení platby — nie podľa samotného návratu z platobnej brány.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideCvDb,
    title: 'Databáza životopisov',
    intro:
      'Prehľad pre zamestnávateľov: ako funguje vyhľadávanie v databáze životopisov a kontaktné údaje uchádzačov.',
    updatedAt: '2026-06-01',
    sections: [
      {
        id: 'access',
        title: 'Prístup',
        paragraphs: [
          'Databáza životopisov je dostupná zamestnávateľom s plateným plánom podľa limitov v cenníku.',
        ],
      },
      {
        id: 'visibility',
        title: 'Viditeľnosť CV',
        paragraphs: [
          'Uchádzač musí mať životopis viditeľný pre zamestnávateľov a súhlasiť so zobrazením v databáze.',
          'Kontaktné údaje sa zobrazia podľa nastavení uchádzača a pravidiel odomknutia kontaktu.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideEmailAlerts,
    title: 'Ponuky na e-mail',
    intro:
      'Ako si nastaviť e-mailové upozornenia na nové pracovné ponuky podľa vašich preferencií.',
    updatedAt: '2026-06-01',
    sections: [
      {
        id: 'create',
        title: '1. Vytvorte upozornenie',
        paragraphs: [
          'Po prihlásení choďte na Ponuky na e-mail a vytvorte nové upozornenie s filtrom lokality a kategórie.',
        ],
      },
      {
        id: 'manage',
        title: '2. Spravujte upozornenia',
        paragraphs: [
          'Upozornenie môžete pozastaviť, upraviť alebo vymazať. V e-maili nájdete odkaz na pozastavenie alebo odhlásenie.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideDeleteAccount,
    title: 'Vymazanie účtu',
    intro:
      'Ako trvalo vymazať účet Jobbie a čo sa stane s vašimi údajmi.',
    updatedAt: '2026-06-01',
    sections: [
      {
        id: 'steps',
        title: 'Postup',
        paragraphs: [
          'V Nastaveniach → Nebezpečná zóna vyberte vymazanie účtu a potvrďte bezpečnostnú frázu.',
          'Profil sa vymaže, CV sa skryjú, upozornenia sa deaktivujú a prihlásenie sa zablokuje.',
        ],
      },
      {
        id: 'before',
        title: 'Pred vymazaním',
        paragraphs: [
          'Odporúčame si stiahnuť export údajov (GDPR) v Nastaveniach → Export údajov.',
        ],
      },
    ],
  },
  {
    path: ROUTES.guideDataExport,
    title: 'Export údajov (GDPR)',
    intro:
      'Ako si stiahnete kópiu osobných údajov uložených v Jobbie.',
    updatedAt: '2026-06-01',
    sections: [
      {
        id: 'download',
        title: 'Stiahnutie exportu',
        paragraphs: [
          'V Nastaveniach → Export údajov spustite export. Stiahnete ZIP so súborom data.json obsahujúcim vaše údaje.',
        ],
      },
      {
        id: 'scope',
        title: 'Rozsah',
        paragraphs: [
          'Export obsahuje profil, nastavenia, životopisy a ďalšie údaje uložené v platforme v čase exportu.',
        ],
      },
    ],
  },
]

export function getGuidePageByPath(path: string): GuidePageDef | undefined {
  const normalized = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
  return GUIDE_PAGES.find((page) => page.path === normalized)
}
