import type { TrustContentPage } from '~/utils/trust-page-content'
import { ROUTES } from '~/utils/app-routes'

/** Official general terms and conditions (SK) — `/vseobecne-podmienky`. */
export const TRUST_TERMS_PAGE: TrustContentPage = {
  title: 'Všeobecné obchodné podmienky',
  intro:
    'Tieto obchodné podmienky upravujú Vaše práva a povinnosti pri používaní platformy Jobbie. Podmienky sú pre používateľov záväzné a ich prijatie je podmienkou používania platformy.',
  updatedAt: '2026-07-10',
  dateLabel: 'effective',
  sections: [
    {
      id: 'uvod',
      title: '1. ÚVOD',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Tu sa dozviete základné informácie o platforme a prevádzkovateľovi.',
            'Tu nájdete naše kontaktné informácie.',
            'Platformu môžete používať len ak máte aspoň 16 rokov.',
          ],
        },
      ],
    },
    {
      id: 'obchodne-podmienky',
      title: '1.1. Obchodné podmienky',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Tieto obchodné podmienky („podmienky platformy") upravujú Vaše práva a povinnosti pri používaní platformy či aplikácie Jobbie („platforma") voči nám, ako prevádzkovateľovi platformy, a ostatným používateľom platformy. Podmienky platformy sú pre používateľov záväzné a ich prijatie je podmienkou používania platformy. Vzťahujú sa na Vás bez ohľadu na to, či máte zriadený používateľský účet.',
        },
      ],
    },
    {
      id: 'platforma',
      title: '1.2. Platforma',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platforma Jobbie slúži na prepojenie jednotlivcov, podnikateľov, firiem, neziskových subjektov a ďalších záujemcov prostredníctvom inzercie a nadväzovania kontaktov v rámci nasledujúcich kategórií:',
        },
        {
          kind: 'bullets',
          items: [
            'PRÁCA – inzercia pracovných miest za účelom hľadania zamestnancov.',
            'BRIGÁDY – krátkodobé, sezónne alebo flexibilné pracovné príležitosti vhodné najmä pre študentov, absolventov či záujemcov o privyrábanie.',
            'SLUŽBY – ponuky služieb pre vyhľadávanie klientov alebo zákazníkov.',
            'PROJEKTY – podnikateľské zámery, nápady či už existujúce projekty hľadajúce investorov alebo obchodných partnerov.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Platforma funguje ako digitálny priestor pre zverejnenie týchto ponúk a ich sprístupnenie ostatným používateľom. Nezúčastňujeme sa priameho dojednávania podmienok ani transakcií medzi používateľmi.',
        },
        {
          kind: 'paragraph',
          text: 'Záujemcovia si môžu prezerať ponuky a reagovať na ne úplne zadarmo po registrácii. Inzerenti platia poplatok podľa zvoleného typu inzercie a doby zobrazenia.',
        },
      ],
    },
    {
      id: 'prevadzkovatel',
      title: '1.3. Prevádzkovateľ',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Prevádzkovateľom platformy je spoločnosť CoCreate s. r. o., IČO: 56273975, so sídlom Martina Rázusa 1132/9, 010 01 Žilina Slovensko, zapísaná v OR Os Žilina v odd. Sro vl. č. 85095/L (ďalej len „my", „nás", „naše" alebo „prevádzkovateľ").',
        },
      ],
    },
    {
      id: 'kontakt',
      title: '1.4. Kontakt',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Máte akékoľvek otázky alebo si želáte uplatniť Vaše práva, kontaktujte nás e-mailom na info@jobbie.sk, telefonicky na čísle +421 908 281 451 alebo poštou na vyššie uvedenej adrese.',
        },
      ],
    },
    {
      id: 'minimalny-vek',
      title: '1.5. Minimálny vek',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platforma je určená výhradne osobám starším 16 rokov.',
        },
      ],
    },
    {
      id: 'podnikatel-spotrebitel',
      title: '1.6. Podnikateľ a spotrebiteľ',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platformu môžu využívať podnikatelia aj spotrebitelia. Ak ju využívate mimo súvislosti s vlastnou podnikateľskou činnosťou, dôkladne si preštudujte sekciu PRÁVA SPOTREBITEĽA.',
        },
      ],
    },
    {
      id: 'vyklad',
      title: '1.7. Výklad',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Zhrnutie jednotlivých sekcií slúži pre prehľadnosť a nemá vplyv na právny výklad podmienok.',
        },
      ],
    },
    {
      id: 'rozhodne-pravo-uvod',
      title: '1.8. Rozhodné právo',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Tieto podmienky sa riadia právom Slovenskej republiky.',
        },
      ],
    },
    {
      id: 'pouzivatelsky-ucet',
      title: '2. POUŽÍVATEĽSKÝ ÚČET',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Pri registrácii a v používateľskom účte uvádzajte len pravdivé informácie.',
            'Chráňte svoje prístupové heslo. V prípade odcudzenia účtu nás ihneď informujte.',
            'Svoju dôveryhodnosť pre ostatných zvýšite overením účtu.',
            'Používateľský účet môžete vytvoriť aj v mene spoločnosti, ak ste jej zástupcom.',
            'Zrušenie účtu je nevratné.',
          ],
        },
      ],
    },
    {
      id: 'pouzivanie-vlastne-ucely',
      title: '2.1. Používanie pre vlastné účely',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Používateľský účet je určený výhradne pre Vašu osobnú alebo firemnú potrebu. Bez nášho súhlasu ho nemožno postúpiť, previesť, prenajať ani inak sprístupniť inej osobe. Ak na platforme zverejňujete inzerát, zodpovedáte ako zadávateľ aj spracovateľ reklamy podľa platných právnych predpisov.',
        },
      ],
    },
    {
      id: 'udaje-pouzivatela',
      title: '2.2. Údaje používateľa',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Pri registrácii aj neskôr ste povinní uvádzať úplné, aktuálne a pravdivé informácie.',
        },
      ],
    },
    {
      id: 'aktualizacia-udajov',
      title: '2.3. Aktualizácia údajov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'V prípade zmeny údajov je potrebné ich bezodkladne aktualizovať v nastavení účtu alebo na našu výzvu.',
        },
      ],
    },
    {
      id: 'bezpecnost-uctu',
      title: '2.4. Bezpečnosť účtu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Zvoľte si silné heslo a uchovávajte ho v tajnosti. Za zneužitie účtu v dôsledku vlastnej nedbalosti zodpovedáte sami. Ak dôjde k narušeniu zabezpečenia, kontaktujte nás bezodkladne.',
        },
      ],
    },
    {
      id: 'overenie-uctu',
      title: '2.5. Overenie účtu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ponúkame voliteľné overenie účtu. Vykoná sa po predložení dokladu totožnosti. Overené účty majú na platforme označenie, ktoré zvyšuje dôveryhodnosť.',
        },
      ],
    },
    {
      id: 'ucet-spolocnosti',
      title: '2.6. Účet spoločnosti',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak zakladáte účet v mene spoločnosti alebo inej právnickej osoby, prehlasujete, že na to máte oprávnenie.',
        },
      ],
    },
    {
      id: 'konanie-za-spolocnost',
      title: '2.7. Konanie za spoločnosť',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Všetky povinnosti z týchto podmienok sa vzťahujú tak na Vás, ako aj na zastupovanú spoločnosť.',
        },
      ],
    },
    {
      id: 'doplnenie-udajov',
      title: '2.8. Doplnenie údajov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Na požiadanie ste povinní poskytnúť údaje k inzerátu, jeho zadávateľovi či spracovateľovi.',
        },
      ],
    },
    {
      id: 'ziadost-odstranenie-uctu',
      title: '2.9. Žiadosť o odstránenie účtu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Účet môžete kedykoľvek zrušiť pomocou funkcie v nastavení alebo kontaktovaním našej podpory.',
        },
      ],
    },
    {
      id: 'odstranenie-uctu',
      title: '2.10. Odstránenie účtu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'V prípade zrušenia účtu dôjde k nevratnému vymazaniu všetkých dát a nevyužitých služieb, bez nároku na náhradu ceny.',
        },
      ],
    },
    {
      id: 'objednavka-platba',
      title: '3. OBJEDNÁVKA SLUŽIEB A PLATBA',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Objednávka platených služieb je záväzná po kliknutí na „Objednať a zaplatiť".',
            'Služba je aktívna až po uhradení ceny.',
            'Záujemcovia neplatia nič – prístup k platforme je pre nich zadarmo.',
            'Inzerenti môžu platiť aj pomocou Jobbie kreditov (bod 3.11.).',
          ],
        },
      ],
    },
    {
      id: 'objednavka',
      title: '3.1. Objednávka',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Zverejnenie inzerátu na platforme môže byť spoplatnené. Objednávku platenej služby (napr. zverejnenie na určitú dobu alebo zvýhodnené radenie) vykonáte výberom príslušnej možnosti a kliknutím na tlačidlo „Objednať a zaplatiť". Tým dochádza k uzavretiu zmluvy a objednávka je záväzná.',
        },
        {
          kind: 'paragraph',
          text: 'Záujemcovia, ktorí chcú odpovedať na inzeráty, služby neobjednávajú ani neplatia – prístup k platforme je pre nich úplne zadarmo, za predpokladu registrácie.',
        },
      ],
    },
    {
      id: 'potvrdenie-objednavky',
      title: '3.2. Potvrdenie objednávky',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Po objednaní obdržíte e-mail s potvrdením a zhrnutím vybraných služieb.',
        },
      ],
    },
    {
      id: 'cena',
      title: '3.3. Cena',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Zobrazovaná cena je konečná a zahŕňa DPH. Nezahŕňa prípadné poplatky od Vašej banky, poskytovateľa platieb alebo pripojenia.',
        },
      ],
    },
    {
      id: 'okamzita-platba',
      title: '3.4. Okamžitá platba',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak sa nejedná o predplatné, platba zo zvolenej platobnej metódy bude vykonaná ihneď po potvrdení objednávky. Objednaná služba Vám bude sprístupnená až po tom, čo obdržíme kompletnú platbu ceny za službu alebo, v prípade opakovanej platby, platbu ceny za prvé obdobie predplatného.',
        },
      ],
    },
    {
      id: 'platobna-metoda',
      title: '3.5. Platobná metóda',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Na spracovanie platieb platforma využíva platobnú bránu poskytovateľa Stripe. Podporované sú len platobné metódy ponúkané platobnou bránou pri vykonaní platby.',
        },
      ],
    },
    {
      id: 'faktura',
      title: '3.6. Faktúra',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak to vyžadujú príslušné právne predpisy, vystavíme Vám potvrdenie objednávky v zákonom stanovenej forme daňového dokladu (faktúry). Vystavené faktúry sú dostupné na stiahnutie priamo v sekcii „Moje inzeráty" v používateľskom účte.',
        },
      ],
    },
    {
      id: 'vyhrada-nemoznosti-plnenia',
      title: '3.7. Výhrada nemožnosti plnenia',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Služby platformy sú ponúkané s výhradou nemožnosti plniť z dôvodu nedostatku prevádzkových kapacít, technickej chyby alebo iného obdobného dôvodu. V takom prípade objednávku zrušíme a informujeme Vás o tom.',
        },
      ],
    },
    {
      id: 'zjavne-chyby',
      title: '3.8. Zjavné chyby',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Objednávka služieb na platforme je neplatná, ak obsahuje zjavne nesprávne údaje, ktoré ste uviedli (napr. neexistujúce platobné údaje) alebo ktoré ste mohli bez problémov rozpoznať (napr. zjavná chyba v cene služieb). V takom prípade objednávku zrušíme a informujeme Vás o tom.',
        },
      ],
    },
    {
      id: 'zrusena-objednavka',
      title: '3.9. Zrušená objednávka',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak zrušíme Vašu objednávku z dôvodov uvedených v predchádzajúcich ustanoveniach, bez zbytočného odkladu Vám vrátime už uhradenú cenu.',
        },
      ],
    },
    {
      id: 'nevratna-objednavka',
      title: '3.10. Nevratná objednávka',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'S výnimkou práv spotrebiteľa uvedených nižšie sú objednávka služieb a všetky uhradené platby nevratné. Odoslaním objednávky beriete na vedomie, že poskytovanie služby zahájime bezodkladne po zaplatení ceny.',
        },
      ],
    },
    {
      id: 'jobbie-kredity',
      title: '3.11. Jobbie kredity',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Na využívanie spoplatnených služieb platformy možno použiť interný kreditový systém Jobbie kredity. Tieto kredity si môžete zakúpiť priamo na platforme.',
        },
        {
          kind: 'bullets',
          items: [
            'Hodnota coinov je vopred určená a uvedená pri každej transakcii.',
            'Platba prebieha štandardnými metódami prostredníctvom platobnej brány Stripe.',
            'Výber určitého balíčka coinov môže byť zvýhodnený cenovo (napr. množstevná zľava).',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Zakúpené kredity sú pripísané na Váš používateľský účet a možno ich čerpať na úhradu jednotlivých služieb podľa potreby. Kredity nie sú zameniteľné za peniaze ani nepodliehajú preplateniu, s výnimkou prípadov stanovených zákonom.',
        },
      ],
    },
    {
      id: 'opakovane-platby-topovanie',
      title: '3.12. Opakované platby za topovanie inzerátu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Topovanie inzerátu môže byť poskytované ako služba s automatickým opakovaním platby. Používateľ je o tom zreteľne informovaný pred dokončením objednávky. Objednaním tejto služby používateľ súhlasí s tým, že cena topovania bude automaticky strhnutá z jeho platobnej karty na začiatku každého platobného obdobia, a to po dobu, kým používateľ službu nezruší. Opakovanú platbu možno kedykoľvek zrušiť v nastavení používateľského účtu.',
        },
      ],
    },
    {
      id: 'clenstvo-predplatne',
      title: '3.13. Členstvo a predplatné (Štart, Plus, Pro)',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platforma ponúka platené členstvá formou predplatného, Štart, Plus, Pro. Členstvo je dojednávané na zvolené obdobie (napr. 1 mesiac) a je hradené vopred. Členstvo je digitálnym produktom a jeho poskytovanie je zahájené okamžite po prijatí platby. Zakúpením členstva používateľ výslovne súhlasí so zahájením plnenia pred uplynutím 14-dňovej lehoty na odstúpenie od zmluvy.',
        },
      ],
    },
    {
      id: 'digitalne-produkty',
      title: '3.14. Digitálne produkty a nevratnosť platieb',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Členstvo, zvýhodnené radenie (topovanie), prístupy k funkciám platformy a všetky ďalšie služby poskytované prostredníctvom platformy sú digitálnymi produktmi alebo digitálnymi službami poskytovanými online. Po aktivácii a zahájení čerpania nevzniká nárok na vrátenie uhradenej sumy.',
        },
      ],
    },
    {
      id: 'dopytova-nastenka',
      title: '3.15. Dopytová nástenka',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Dopytová nástenka je súčasťou členstva na platforme. Prístup do dopytovej nástenky nie je automatický – vyhradzujeme si právo rozhodnúť o tom, ktorým používateľom bude prístup udelený.',
        },
      ],
    },
    {
      id: 'poskytovanie-sluzieb',
      title: '4. POSKYTOVANIE SLUŽIEB',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Inzerenti hradia služby podľa zvolenej dĺžky a typu inzercie.',
            'Záujemcom sú služby poskytované zadarmo po registrácii.',
            'Služby sa poskytujú v presne vymedzenom období.',
          ],
        },
      ],
    },
    {
      id: 'pocitanie-casu',
      title: '4.1. Počítanie času',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Doba poskytovania služby začína dňom jej aktivácie a beží v kalendárnych dňoch, bez ohľadu na víkendy či sviatky. Mesačné obdobie trvá 30 kalendárnych dní.',
        },
      ],
    },
    {
      id: 'sluzby-inzerenti',
      title: '4.2. Služby pre inzerentov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Inzerentom poskytujeme služby po úhrade ceny alebo odpočítaní príslušného počtu Jobbie kreditov. Ide najmä o: zverejnenie inzerátu na vybranú dobu, zvýhodnené radenie (topovanie), overenie účtu. Po uplynutí dohodnutej doby je služba automaticky ukončená.',
        },
      ],
    },
    {
      id: 'sluzby-zaujemcovia',
      title: '4.3. Služby pre záujemcov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Záujemcom sú služby platformy poskytované úplne zadarmo po registrácii. Záujemca môže prezerať inzeráty, kontaktovať inzerentov prostredníctvom chatu a využívať ďalšie základné funkcie.',
        },
      ],
    },
    {
      id: 'bezpecnostne-upozornenie',
      title: '5. BEZPEČNOSTNÉ UPOZORNENIE',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Na platforme prichádzate do kontaktu s cudzími ľuďmi – dbajte zvýšenej opatrnosti.',
            'Obsah zdieľaný používateľmi nekontrolujeme, nenesieme zodpovednosť za jeho pravdivosť.',
            'Dobre si premyslite, aké informácie na platforme zverejníte.',
            'Podozrivé správanie či obsah môžete ľahko nahlásiť.',
          ],
        },
      ],
    },
    {
      id: 'obozretnost-pouzivatela',
      title: '5.1. Obozretnosť používateľa',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platforma slúži ako inzertný priestor na prepojenie medzi ľuďmi a firmami, s ktorými nemáme priamy zmluvný vzťah. Nepreberáme zodpovednosť za žiadny obsah zdieľaný používateľmi ani za ich konanie na platforme alebo mimo nej.',
        },
      ],
    },
    {
      id: 'obozretnost-chat',
      title: '5.2. Obozretnosť v chate',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Jobbie neoveruje automaticky totožnosť všetkých používateľov. Komunikujte preto vždy s opatrnosťou, najmä pri prvom kontakte.',
        },
      ],
    },
    {
      id: 'obmedzene-vyuzitie-chatu',
      title: '5.3. Obmedzené využitie chatu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Chat slúži výhradne na dohodovanie spolupráce, práce, vzdelávania alebo iných interakcií súvisiacich s inzerátmi. Nezdieľajte v ňom citlivé osobné údaje ani prihlasovacie údaje.',
        },
      ],
    },
    {
      id: 'verejne-informacie',
      title: '5.4. Verejné informácie',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Informácie zverejnené v rámci inzerátov sú verejne prístupné prostredníctvom internetu. Uvádzajte len také informácie, ktoré chcete sprístupniť ostatným.',
        },
      ],
    },
    {
      id: 'odkazy-mimo-platformy',
      title: '5.5. Odkazy mimo platformy',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platforma môže obsahovať odkazy na iné weby. Ich obsah nekontrolujeme a nenesieme zaň zodpovednosť.',
        },
      ],
    },
    {
      id: 'hlasenie-nelegalneho-obsahu',
      title: '5.6. Hlásenie nelegálneho obsahu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Každý používateľ má právo nahlásiť obsah, ktorý považuje za nelegálny alebo v rozpore s týmito podmienkami. Kontaktujte nás na podpora@jobbie.sk a uveďte dôvody, odkaz na obsah a Vaše meno. Anonymné hlásenia neprijímame.',
        },
      ],
    },
    {
      id: 'preverenie-oznamenia',
      title: '5.7. Preverenie oznámenia',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše oznámenie vyhodnotíme bez zbytočného odkladu. Môžeme si vyžiadať doplňujúce informácie. O výsledku Vás budeme informovať.',
        },
      ],
    },
    {
      id: 'zasady-pouzivania',
      title: '6. ZÁSADY POUŽÍVANIA PLATFORMY',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Platformu využívajte slušne a zodpovedne.',
            'Neporušujte zákony ani pravidlá platformy.',
            'Nezverejňujte nevhodný, podvodný alebo zavádzajúci obsah.',
          ],
        },
      ],
    },
    {
      id: 'pripustnost-obsahu',
      title: '6.1. Prípustnosť a kvalita obsahu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Používateľ je oprávnený vkladať len také inzeráty a obsah, ktoré sú v súlade s dobrými mravmi, sú písané slušným jazykom a plne zodpovedajú účelu platformy a danej kategórii.',
        },
      ],
    },
    {
      id: 'slusnost-respekt',
      title: '6.2. Slušnosť a rešpekt',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platforma Jobbie je miestom na nadväzovanie spolupráce, pracovných a podnikateľských vzťahov. Používatelia sú povinní správať sa slušne, korektne a s rešpektom voči ostatným.',
        },
      ],
    },
    {
      id: 'zodpovednost-obsah',
      title: '6.3. Zodpovednosť za obsah',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Za všetok obsah, ktorý na platformu vkladáte, nesiete plnú zodpovednosť. Obsah nesmie porušovať práva tretích osôb, autorské práva ani platné právne predpisy.',
        },
      ],
    },
    {
      id: 'zakaz-zakazaneho-obsahu',
      title: '6.4. Zákaz zakázaného obsahu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Na platforme je zakázané zverejňovať najmä nasledovné: nepravdivé, klamlivé alebo zavádzajúce informácie; obsah, ktorý je hanlivý, vulgárny, diskriminačný alebo inak nevhodný; nelegálne ponuky alebo výzvy k nelegálnemu konaniu; erotický, násilný alebo inak nevhodný materiál; pokusy o phishing, podvody alebo zber osobných údajov.',
        },
      ],
    },
    {
      id: 'zakaz-obchadzania',
      title: '6.5. Zákaz obchádzania pravidiel',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Je zakázané akýmkoľvek spôsobom obchádzať podmienky platformy alebo zasahovať do technického fungovania webu.',
        },
      ],
    },
    {
      id: 'priame-ponuky-mimo',
      title: '6.6. Priame ponuky mimo platformy',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Nie je dovolené zneužívať prístup k platforme za účelom preberania používateľov na iné služby, weby alebo platformy.',
        },
      ],
    },
    {
      id: 'priebezna-kontrola',
      title: '6.7. Priebežná kontrola',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vyhradzujeme si právo vykonávať namátkovú alebo automatizovanú kontrolu obsahu a v prípade porušenia pravidiel podniknúť príslušné kroky.',
        },
      ],
    },
    {
      id: 'odstranenie-obsahu',
      title: '6.8. Odstránenie obsahu a obmedzenie účtu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vyhradzujeme si právo bez predchádzajúceho upozornenia odstrániť inzerát alebo pozastaviť či zrušiť používateľský účet, ak je zverejnený obsah zjavne v rozpore s podmienkami platformy.',
        },
      ],
    },
    {
      id: 'zakaz-scraping',
      title: '6.9. Zákaz automatizovaného získavania dát (Scraping)',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Je prísne zakázané používať akékoľvek automatizované systémy na monitorovanie, kopírovanie alebo získavanie obsahu a dát z platformy bez výslovného písomného súhlasu prevádzkovateľa.',
        },
      ],
    },
    {
      id: 'licencia-obsahu',
      title: '7. LICENCIA K OBSAHU',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Obsah, ktorý na platformu vložíte, zostáva Vaším majetkom.',
            'Dávate nám však oprávnenie ho zverejniť a zobraziť ostatným.',
          ],
        },
      ],
    },
    {
      id: 'prava-k-obsahu',
      title: '7.1. Práva k obsahu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Všetok obsah, ktorý vložíte na platformu (napr. texty, logá, prílohy, fotografie, videá, prezentácie a pod.), zostáva Vaším duševným vlastníctvom.',
        },
      ],
    },
    {
      id: 'udelenie-licencie',
      title: '7.2. Udelenie licencie',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Zverejnením obsahu na platforme nám poskytujete nevýhradnú, bezodplatnú, časovo a územne neobmedzenú licenciu na zobrazovanie, zverejňovanie a technické spracovanie tohto obsahu za účelom správneho fungovania platformy.',
        },
      ],
    },
    {
      id: 'zaruka-vlastnika',
      title: '7.3. Záruka vlastníka',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Prehlasujete, že ste autorom obsahu alebo máte všetky potrebné práva k jeho zverejneniu.',
        },
      ],
    },
    {
      id: 'ochrana-prav-prevadzkovatela',
      title: '8. OCHRANA PRÁV PREVÁDZKOVATEĽA',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Jobbie je naša značka – jej zneužitie je zakázané.',
            'Platformu nemožno kopírovať ani napodobovať.',
          ],
        },
      ],
    },
    {
      id: 'ochranne-znamky',
      title: '8.1. Ochranné známky a vzhľad',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Názov „Jobbie", logo, design, farebná schéma, layout platformy a všetky ďalšie prvky nášho vizuálneho štýlu sú chránené autorským právom alebo ako ochranné známky.',
        },
      ],
    },
    {
      id: 'softver-databazy',
      title: '8.2. Softvér a databázy',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Platforma, jej softvér, systém Jobbie kredity, databáza používateľov a všetky technické riešenia sú naším duševným vlastníctvom.',
        },
      ],
    },
    {
      id: 'ochrana-pred-zneuzitim',
      title: '8.3. Ochrana pred zneužitím',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vyhradzujeme si právo chrániť náš systém a podnikanie pred zneužitím – právnou cestou, blokáciou prístupu alebo inými vhodnými prostriedkami.',
        },
      ],
    },
    {
      id: 'porusenie-podmienok',
      title: '9. PORUŠENIE PODMIENOK',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Ak porušíte podmienky, môžeme Váš obsah odstrániť alebo Váš účet zablokovať.',
            'Závažné alebo opakované porušenie môže viesť k trvalému zrušeniu účtu.',
          ],
        },
      ],
    },
    {
      id: 'porusenie-povinnosti',
      title: '9.1. Porušenie povinností',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak porušíte tieto podmienky, môžeme pristúpiť k nasledujúcim opatreniam: upozornenie a výzva k náprave; dočasné pozastavenie funkcie účtu alebo inzerátu; odstránenie obsahu bez náhrady; trvalé zrušenie účtu bez náhrady zaplatenej ceny; zamedzenie ďalšieho prístupu na platformu.',
        },
      ],
    },
    {
      id: 'vylucenie-sluzby',
      title: '9.2. Vylúčenie zo služby',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Závažné alebo opakované porušenie môže viesť k trvalému zákazu využívania platformy.',
        },
      ],
    },
    {
      id: 'nahrada-skody',
      title: '9.3. Náhrada škody',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'V prípade, že nám porušením pravidiel spôsobíte škodu, vyhradzujeme si právo uplatniť voči Vám náhradu v plnom rozsahu.',
        },
      ],
    },
    {
      id: 'obmedzenie-zodpovednosti',
      title: '10. OBMEDZENIE ZODPOVEDNOSTI',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Nezodpovedáme za obsah vložený používateľmi, konanie tretích strán ani za výsledok dohodnutej spolupráce.',
            'Nezaručujeme, že platforma bude vždy fungovať bezchybne.',
          ],
        },
      ],
    },
    {
      id: 'rola-sprostredkovatela',
      title: '10.1. Rola sprostredkovateľa',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Jobbie slúži ako digitálne prostredie pre zverejňovanie a vyhľadávanie inzerátov. Nie sme zmluvnou stranou žiadneho vzťahu medzi inzerentom a záujemcom.',
        },
      ],
    },
    {
      id: 'nezodpovednost-obsah',
      title: '10.2. Nezodpovednosť za obsah používateľov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Nenesieme zodpovednosť za žiadne informácie, texty, súbory, odkazy či iný obsah vložený používateľmi.',
        },
      ],
    },
    {
      id: 'technicke-vypadky',
      title: '10.3. Technické výpadky',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Nezaručujeme nepretržitú dostupnosť platformy. Môže dôjsť k dočasným obmedzeniam z dôvodu údržby, technických problémov alebo zásahu vyššej moci.',
        },
      ],
    },
    {
      id: 'maximalny-rozsah',
      title: '10.4. Maximálny rozsah zodpovednosti',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Naša zodpovednosť za škodu je obmedzená do výšky ceny Vami objednanej služby.',
        },
      ],
    },
    {
      id: 'zodpovednost-transakcie',
      title: '10.5. Zodpovednosť za finančné transakcie medzi používateľmi',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Prevádzkovateľ nie je zodpovedný za žiadne finančné transakcie, platby ani plnenia, ktoré si používatelia dojednajú medzi sebou mimo platobného rozhrania platformy.',
        },
      ],
    },
    {
      id: 'prava-spotrebitela',
      title: '11. PRÁVA SPOTREBITEĽA',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Táto sekcia platí len pre používateľov, ktorí sú spotrebiteľmi a zároveň objednávajú platené služby (inzerenti).',
            'Spotrebiteľ má právo na odstúpenie od zmluvy, ak služba ešte nebola poskytnutá.',
            'Pri problémoch sa môžete obrátiť na Slovenskú obchodnú inšpekciu.',
          ],
        },
      ],
    },
    {
      id: 'spotrebitel-platene-sluzby',
      title: '11.1. Spotrebiteľ a platené služby',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak ste fyzickou osobou, ktorá koná mimo rámca svojho podnikania alebo povolania, a objednávate platené služby na platforme, máte ako spotrebiteľ osobitné zákonné práva.',
        },
      ],
    },
    {
      id: 'odstupenie-zmluvy',
      title: '11.2. Odstúpenie od zmluvy',
      headingLevel: 3,
      blocks: [
        {
          kind: 'rich',
          parts: [
            { type: 'text', text: 'Informácie nájdete v ' },
            {
              type: 'link',
              to: ROUTES.withdrawalRightsNotice,
              label: 'Poučení o práve na odstúpenie od zmluvy',
            },
            { type: 'text', text: '.' },
          ],
        },
      ],
    },
    {
      id: 'vynimka-odstupenie',
      title: '11.3. Výnimka z práva na odstúpenie',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak ste pri objednávaní výslovne súhlasili so zahájením poskytovania služby pred uplynutím lehoty na odstúpenie, nemôžete od zmluvy odstúpiť.',
        },
      ],
    },
    {
      id: 'uplatnenie-prava',
      title: '11.4. Uplatnenie práva na odstúpenie od zmluvy',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Spotrebiteľ môže uplatniť právo na odstúpenie od zmluvy:',
        },
        {
          kind: 'rich',
          parts: [
            { type: 'text', text: '• prostredníctvom ' },
            {
              type: 'link',
              to: ROUTES.contractWithdrawal,
              label: 'online formulára na odstúpenie od zmluvy',
            },
            {
              type: 'text',
              text: ' dostupného v päte webovej stránky Jobbie v sekcii „Odstúpenie od zmluvy“, alebo',
            },
          ],
        },
        {
          kind: 'rich',
          parts: [
            {
              type: 'text',
              text: '• zaslaním jednoznačného vyhlásenia na e-mailovú adresu ',
            },
            {
              type: 'mailto',
              email: 'podpora@jobbie.sk',
              label: 'podpora@jobbie.sk',
            },
            { type: 'text', text: '.' },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Online formulár umožňuje spotrebiteľovi elektronicky oznámiť odstúpenie od zmluvy. Po odoslaní formulára prevádzkovateľ bez zbytočného odkladu potvrdí prijatie odstúpenia na e-mailovú adresu uvedenú vo formulári.',
        },
      ],
    },
    {
      id: 'mimosudne-spory',
      title: '11.5. Mimosúdne riešenie sporov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak ste spotrebiteľom a domnievate sa, že sme porušili Vaše práva, môžete sa obrátiť na Slovenskú obchodnú inšpekciu (www.soi.sk) so žiadosťou o mimosúdne riešenie sporu.',
        },
      ],
    },
    {
      id: 'vseobecne-ustanovenia',
      title: '12. VŠEOBECNÉ USTANOVENIA',
      blocks: [
        {
          kind: 'bullets',
          items: [
            'Tieto podmienky môžeme v budúcnosti meniť.',
            'Ak dôjde k zmene, budete o tom včas informovaní.',
            'Máte akúkoľvek otázku napíšte nám.',
          ],
        },
      ],
    },
    {
      id: 'zmena-podmienok',
      title: '12.1. Zmena podmienok',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vyhradzujeme si právo tieto podmienky kedykoľvek upraviť, najmä z dôvodu zmeny právnych predpisov, prevádzkových potrieb platformy alebo nových funkcionalít. V prípade zmeny Vás o tom vhodným spôsobom informujeme.',
        },
      ],
    },
    {
      id: 'ucinnost-zmien',
      title: '12.2. Účinnosť zmien',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Zmenené podmienky nadobúdajú účinnosť okamžikom ich zverejnenia na platforme, ak nie je výslovne uvedené inak.',
        },
      ],
    },
    {
      id: 'dolozka-oddelitelnosti',
      title: '12.3. Doložka oddeliteľnosti',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak by niektoré ustanovenie týchto podmienok bolo alebo sa stalo neplatným či neúčinným, nemá to vplyv na platnosť ostatných ustanovení.',
        },
      ],
    },
    {
      id: 'archivacia-jazyk',
      title: '12.4. Archivácia a jazyk',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Tieto podmienky sú uzatvárané v slovenskom jazyku a uchovávané v elektronickej podobe.',
        },
      ],
    },
    {
      id: 'rozhodne-pravo-sudna-prislusnost',
      title: '12.5. Rozhodné právo a súdna príslušnosť',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Právne vzťahy vzniknuté na základe týchto podmienok sa riadia právom Slovenskej republiky. Prípadné spory budú riešené vecne a miestne príslušnými súdmi v Slovenskej republike.',
        },
      ],
    },
    {
      id: 'prorogacia',
      title: '12.6. Prorogácia (Súdna príslušnosť pre podnikateľov)',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak je používateľ podnikateľom, dohodli sa zmluvné strany, že pre všetky spory vyplývajúce z týchto podmienok alebo používania platformy je miestne príslušným súdom súd v sídle prevádzkovateľa.',
        },
      ],
    },
    {
      id: 'ochrana-osobnych-udajov',
      title: '13. OCHRANA OSOBNÝCH ÚDAJOV',
    },
    {
      id: 'spravca-udajov',
      title: '13.1. Správca údajov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Správcom osobných údajov je prevádzkovateľ platformy – spoločnosť CoCreate s. r. o. Úplné informácie o spracovaní osobných údajov, vrátane práv dotknutých osôb, sú obsiahnuté v samostatnom dokumente Zásady ochrany osobných údajov, ktorý je dostupný na webových stránkach platformy.',
        },
      ],
    },
    {
      id: 'rozsah-spracovania',
      title: '13.2. Rozsah spracovávaných údajov',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Spracovávame najmä údaje, ktoré nám poskytnete pri registrácii a používaní platformy – meno, e-mail, telefón, prípadne IČO a overovacie dokumenty.',
        },
      ],
    },
    {
      id: 'ucel-spracovania',
      title: '13.3. Účel spracovania',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše údaje spracovávame za účelom poskytovania služieb, správy účtu, komunikácie s Vami, plnenia zákonných povinností a prípadne zasielania obchodných oznámení.',
        },
      ],
    },
    {
      id: 'pravny-zaklad-spracovania',
      title: '13.4. Právny základ spracovania',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Spracovanie prebieha na základe plnenia zmluvy, oprávneného záujmu prevádzkovateľa a prípadne Vášho súhlasu.',
        },
      ],
    },
    {
      id: 'vase-prava',
      title: '13.5. Vaše práva',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Máte právo na prístup k svojim údajom, ich opravu, výmaz, obmedzenie spracovania, prenosnosť, vznesenie námietky či podanie sťažnosti u Úradu na ochranu osobných údajov Slovenskej republiky (UOOU SR).',
        },
      ],
    },
    {
      id: 'doba-uchovavania',
      title: '13.6. Doba uchovávania',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše údaje uchovávame po dobu trvania Vášho účtu a potom len po dobu nevyhnutnú na ochranu našich právnych nárokov alebo splnenie povinností podľa zákona.',
        },
      ],
    },
  ],
}
