import type { TrustContentPage } from '~/utils/trust-page-content'

/** Official GDPR privacy policy (SK) — `/ochrana-osobnych-udajov`. */
export const TRUST_PRIVACY_PAGE: TrustContentPage = {
  title: 'Zásady ochrany osobných údajov',
  intro:
    'Oficiálne zásady ochrany osobných údajov platformy Jobbie (GDPR). Správcom osobných údajov je CoCreate s. r. o.',
  updatedAt: '2026-02-25',
  dateLabel: 'effective',
  sections: [
    {
      id: 'rozsah',
      title: 'Čoho sa tieto informácie týkajú a pre koho sú určené?',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Tu sa dozviete informácie o tom, aké osobné údaje spracovávame, na aké účely, akými prostriedkami a aké práva Vám v súvislosti so spracovaním Vašich osobných údajov patria. Vaše osobné údaje môžeme spracovávať pokiaľ užívate platformu či aplikáciu Jobbie („platforma“), najmä ak sa registrujete ako užívatelia, vytvárate a zverejňujete inzeráty, alebo komunikujete s nami či ostatnými užívateľmi. Ďalej môžeme Vaše osobné údaje spracovávať ak nám udelíte k tomu súhlas napríklad v rámci marketingu, či s nami inak komunikujete.',
        },
      ],
    },
    {
      id: 'spravca',
      title: 'Kto je správcom osobných údajov?',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Správcom osobných údajov je spoločnosť CoCreate s. r. o., IČO: 56273975, so sídlom Martina Rázusa 1132/9, 010 01 Žilina, zapísaná v OR Os Žilina v odd. Sro vl. č. 85095/L („my“, „nás“, „naše“ alebo „správca“).',
        },
        {
          kind: 'paragraph',
          text: 'Správca určuje účely a prostriedky spracovania osobných údajov a zodpovedá za súlad spracovania so zákonom. Správca sa zaväzuje spracovávať Vaše osobné údaje v súlade s Nariadením Európskeho parlamentu a Rady (EÚ) 2016/679 z 27. apríla 2016 o ochrane fyzických osôb v súvislosti so spracovaním osobných údajov a o voľnom pohybe týchto údajov a o zrušení smernice 95/46/ES (všeobecné nariadenie o ochrane osobných údajov) (ďalej len „GDPR“) a ďalšími príslušnými právnymi predpismi.',
        },
        {
          kind: 'paragraph',
          text: 'Kontaktovať nás môžete zaslaním e-mailu na adresu ahoj@jobbie.sk.',
        },
      ],
    },
    {
      id: 'ucely-pravny-zaklad',
      title: 'Aké osobné údaje spracovávame, na aké účely a na akom právnom základe?',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Osobné údaje sú akékoľvek informácie o Vás, pokiaľ ich možno priamo alebo nepriamo spojiť s Vašou osobou, napríklad odkazom na identifikátor, ako je meno, údaj o polohe, bydlisko alebo sieťový identifikátor.',
        },
        {
          kind: 'paragraph',
          text: 'Správca môže spracovávať Vaše údaje na nasledujúce účely a v uvedenom rozsahu. Jedná sa predovšetkým o osobné údaje, ktoré nám sami poskytnete, osobné údaje súvisiace s Vaším používaním platformy, prípadne informácie získané od tretích strán, s ktorými spolupracujeme.',
        },
      ],
    },
    {
      id: 'pouzivanie-platformy',
      title: 'Používanie platformy',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak ste užívateľom platformy, môžeme o Vás spracovávať najmä nasledujúce osobné údaje:',
        },
        {
          kind: 'bullets',
          items: [
            'údaje užívateľského účtu (najmä meno, e-mail, mobilné číslo, adresa, rola pri používaní platformy);',
            'fotografie používateľského účtu, ak sa rozhodnete ju nahrať;',
            'prístupové heslo užívateľského účtu;',
            'údaje o projektoch, ktoré na platforme zdieľate, vrátane nahraných fotografií a ďalšieho obsahu;',
            'správy, ktoré posielate alebo prijímate v chate;',
            'platobné a fakturačné údaje (najmä údaje platobného prostriedku);',
            'údaje o nákupoch na platforme (najmä obstarané služby a predplatné);',
            'údaje o interakciách s platformou a užívateľmi (najmä metadáta o zobrazení obsahu, vyhľadávania a interakciách s platformou, obsahom a užívateľmi).',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Účelom spracovania Vašich osobných údajov je najmä:',
        },
        {
          kind: 'bullets',
          items: [
            'poskytovanie platformy a služieb, vrátane všetkých funkcií, ktoré využijete;',
            'uzavretie a plnenie zmluvy s Vami, vrátane vybavenia Vašej objednávky služieb a prijatia platby;',
            'analýza správania užívateľov pri využívaní platformy za účelom hodnotenia, optimalizácie, zlepšovania kvality a bezpečnosti našich služieb a obchodných procesov;',
            'komunikácia s Vami (napr. zaslanie zmluvnej dokumentácie, reakcia na Vaše telefonické otázky alebo otázky zaslané na e-mail);',
            'dôsledné uplatňovanie Zmluvných podmienok platformy vrátane kontroly dodržiavania pravidiel zakázaného obsahu;',
            'prevádzkové a administratívne účely (najmä organizácie nášho podnikania a obchodných procesov, fakturácia, vedenie účtovníctva, prijímanie a zasielanie platieb);',
            'ochrana a uplatňovanie našich právnych nárokov;',
            'plnenie našich zákonných povinností (najmä stanovených daňovými a účtovnými predpismi).',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Právnym dôvodom spracovania je predovšetkým plnenie zmluvy s Vami – toto spracovanie je nevyhnutné, aby sme Vám mohli poskytovať služby. Právnym dôvodom spracovania môže byť ďalej plnenie našich povinností stanovených právnymi predpismi a náš oprávnený záujem na realizácii našich podnikateľských aktivít, podpore a rozširovaní nášho podnikania a zabezpečovaní spokojnosti užívateľov.',
        },
        {
          kind: 'paragraph',
          text: 'Ak je spracovanie založené na Vašom súhlase, pred poskytnutím súhlasu Vám poskytneme nevyhnutné informácie, vrátane účelu, na ktorý súhlas udeľujete. Udelený súhlas môžete kedykoľvek odvolať.',
        },
      ],
    },
    {
      id: 'verejne-zdielanie',
      title: 'Verejné zdieľanie obsahu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Informácie, ktoré uvediete v rámci Vášho užívateľského účtu (vrátane fotografie), a všetky údaje o Vami vytvorených projektoch (vrátane nahraného obsahu a odkazov mimo platformy) sú verejné a prístupné prostredníctvom internetu aj neregistrovaným užívateľom. Tieto informácie môžu byť v niektorých prípadoch dostupné aj mimo platformy (napr. v rámci výsledkov vyhľadávania internetového vyhľadávača). Dobre si preto rozmyslite, aké informácie na platforme zverejníte. Najmä neodporúčame na platforme zdieľať akékoľvek citlivé osobné údaje, obsah predstavujúci Vaše duševné, alebo informácie súkromnej povahy, ktoré by tretia osoba mohla zneužiť vo Váš neprospech.',
        },
        {
          kind: 'paragraph',
          text: 'Informácie o Vašich kontaktných údajoch sú viditeľné iba pre registrovaných platiacich užívateľov platformy.',
        },
        {
          kind: 'paragraph',
          text: 'V prípade, že v rámci zdieľaného obsahu uvediete akékoľvek citlivé osobné údaje (tzv. zvláštne kategórie osobných údajov zahŕňajúce napr. údaje o rasovom či etnickom pôvode, politických názoroch, zdravotnom stave či sexuálnom živote), výslovne tým súhlasíte s ich zverejnením.',
        },
      ],
    },
    {
      id: 'chat',
      title: 'Používanie chatu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Chat v rámci platformy je poskytovaný iba na účely komunikácie medzi užívateľmi v súvislosti s inzerovanými projektmi a neslúži ako univerzálna komunikačná služba (tzv. interpersonálna komunikačná služba). Správy zasielané v rámci chatu nie sú chránené koncovým šifrovaním a správca k nim môže pristupovať, okrem iného za účelom kontroly dodržiavania Zmluvných podmienok platformy. V rámci chatu preto všeobecne nezdieľajte súkromné informácie.',
        },
      ],
    },
    {
      id: 'overenie-uctu',
      title: 'Overenie užívateľského účtu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'V prípade, že sa rozhodnete využiť službu plateného overenia účtu, vyžiadame si od Vás kópiu Vášho platného dokladu totožnosti. Využitím služby nám poskytujete súhlas na to, aby sme údaje z Vášho dokladu totožnosti využili na overenie autenticity Vašich užívateľských informácií. Údaje z dokladu totožnosti využijeme iba v rozsahu nevyhnutnom a po dobu nevyhnutnú na vykonanie overenia. Po overení Vášho užívateľského účtu kópiu dokladu totožnosti bezodkladne zmažeme.',
        },
      ],
    },
    {
      id: 'zariadenie',
      title: 'Vaše zariadenie',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Keď využívate platformu, zhromažďujeme údaje o čase vašej návštevy, adresu URL webu, z ktorého ste prišli alebo na ktorý ste prešli a vykonávame technické spracovanie informácií o vašej sieti a zariadení (napr. IP adresa, proxy server, operačný systém, webový prehliadač, identifikátor a funkcie zariadenia, ID súborov cookie a poskytovateľa internetu alebo mobilných služieb). Pokiaľ sa nejedná iba o technické spracovanie alebo spracovanie nevyhnutné pre poskytovanie platformy či služieb, spracovanie môžeme vykonávať iba s Vaším súhlasom.',
        },
      ],
    },
    {
      id: 'marketing',
      title: 'Priamy marketing',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Pokiaľ nám udelíte Vy alebo osoba, ktorú zastupujete, súhlas so zasielaním obchodných oznámení, budeme Vás informovať o službách, akciách, zľavách, novinkách či iných našich ponukách.',
        },
        {
          kind: 'paragraph',
          text: 'Ak ste už našim zákazníkom a takéto spracovanie ste neodmietli, môžeme Vám zasielať marketingové oznámenia týkajúce sa našich služieb obdobných tým, ktoré ste od nás už predtým dostali, a to aj bez Vášho predchádzajúceho súhlasu so zasielaním obchodných oznámení. Právnym dôvodom spracovania je tiež náš oprávnený záujem na šírení obchodných oznámení a podpore našej obchodnej činnosti.',
        },
        {
          kind: 'paragraph',
          text: 'Zasielanie obchodných oznámení môžete vždy kedykoľvek jednoduchým spôsobom odmietnuť v každej jednotlivej správe, ktorú Vám zašleme.',
        },
      ],
    },
    {
      id: 'komunikacia-verejnost',
      title: 'Komunikácia s verejnosťou',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše osobné údaje spracovávame na zabezpečenie komunikácie s Vami, respektíve osobou, ktorú zastupujete. Deje sa tak napríklad, keď sa na nás obrátite telefonicky, zašlete nám e-mail, napíšete nám v zákazníckom chate alebo na našich účtoch na sociálnych sieťach.',
        },
        {
          kind: 'paragraph',
          text: 'Právnym dôvodom tohto spracovania je náš oprávnený záujem na zabezpečení našej komunikácie s verejnosťou, či plnenie zmluvy s Vami alebo obchodným partnerom alebo plnenie Vašich požiadaviek. Nie je Vašou zákonnou ani zmluvnou povinnosťou údaje poskytnúť, avšak bez ich poskytnutia nebudeme môcť plniť zmluvu s Vami, komunikovať s Vami alebo efektívne riešiť Vaše požiadavky, návrhy a sťažnosti.',
        },
      ],
    },
    {
      id: 'skupina',
      title: 'Zabezpečenie jednotného riadenia procesov v rámci skupiny',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak sa správca stane súčasťou podnikateľskej skupiny, môže medzi jednotlivými spoločnosťami zo skupiny v budúcnosti dôjsť k odovzdávaniu Vašich osobných údajov za účelom jednotného riadenia vnútropodnikových obchodných a administratívnych procesov za účelom efektívnej organizácie a výkonu činností spoločností zo skupiny, a to na základe nášho oprávneného záujmu na zjednodušení a jednotnom riadení procesov v rámci skupiny.',
        },
      ],
    },
    {
      id: 'pravne-naroky',
      title: 'Uplatňovanie právnych nárokov a spolupráca s orgánmi verejnej moci',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše osobné údaje môžeme v nevyhnutnom rozsahu spracovávať aj na účely určenia, uplatňovania a vymáhania právnych nárokov voči Vám, osobe, ktorú zastupujete, alebo tretej osobe a na účely plnenia povinností uložených orgánmi verejnej moci v prípadoch ustanovených zákonom. Právnym dôvodom tohto spracovania je náš oprávnený záujem na uplatňovaní našich právnych nárokov a plnení povinností, ktoré sa na nás vzťahujú.',
        },
      ],
    },
    {
      id: 'predaj-spolocnosti',
      title: 'Poskytnutie údajov v súvislosti s predajom spoločnosti či obchodného závodu',
      headingLevel: 3,
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše osobné údaje sme oprávnení oznámiť subjektu (vrátane zástupcov takého subjektu), s ktorým by sme rokovali o predaji, prevzatí našej spoločnosti, jej závodu či akejkoľvek jej časti či časti jej činností a aktivít, napríklad v rámci procesu transakčného due diligence. Toto spracovanie sa zakladá na našom oprávnenom záujme na uskutočňovaní našej obchodnej a investičnej stratégie.',
        },
      ],
    },
    {
      id: 'zdielanie',
      title: 'Ako a s kým môžeme Vaše osobné údaje zdieľať?',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše osobné údaje môžeme sprístupniť tretím osobám, pokiaľ to vyžadujú príslušné právne predpisy alebo pokiaľ je to nevyhnutné na účely, na ktoré tieto osobné údaje spracovávame.',
        },
        {
          kind: 'paragraph',
          text: 'Osobné údaje poskytujeme povereným spracovateľom na účely spracovania osobných údajov pre správcu na základe našich pokynov. Spracovateľmi sú tretie strany, ktoré nám pomáhajú poskytovať naše služby (napr. dodávatelia, ktorí nám poskytujú analýzy, audity, marketing, platobné, bezpečnostné, technické, právne, IT a servisné služby). Títo partneri musia udržiavať vysokú úroveň ochrany osobných údajov v súlade so zmluvami, ktoré sme s nimi uzavreli.',
        },
        {
          kind: 'paragraph',
          text: 'Popri nami poverených spracovateľoch môžu byť osobné údaje v súlade s jednotlivými účelmi ich spracovania, a za predpokladu zavedenia vhodných záruk, sprístupnené aj týmto ďalším stranám:',
        },
        {
          kind: 'bullets',
          items: [
            'iným spoločnostiam zo skupiny správcu pre zabezpečenie jednotnej správy procesov v rámci skupiny;',
            'používateľom platformy v rozsahu, v akom to umožňujú funkcie platformy;',
            'dodávateľom a iným obchodným partnerom správcu v rámci uzatvárania a realizácie právnych vzťahov s týmito osobami alebo v rámci podpory a rozvoja našich služieb;',
            'našim partnerom v postavení samostatných správcov, napr. audítori, právni a iní konzultanti;',
            'orgánom štátnej správy či miestnej samosprávy v zákonom stanovených prípadoch alebo v prípade, že si osobné údaje vyžiadajú na základe zákonného splnomocnenia;',
            'prípadne ďalším subjektom, pokiaľ k tomu dáte Váš súhlas.',
          ],
        },
      ],
    },
    {
      id: 'mimo-eu',
      title: 'Môžeme Vaše osobné údaje zasielať mimo EÚ?',
      blocks: [
        {
          kind: 'paragraph',
          text: 'V prípade, že by bolo potrebné Vaše osobné údaje odovzdávať mimo Európskeho hospodárskeho priestoru, využijeme na to vhodné záruky na zasielanie osobných údajov zakotvené článkom 46 GDPR. Ak máte záujem o získanie informácií o uplatňovaných zárukách, kontaktujte nás na e-maile uvedenom vyššie.',
        },
      ],
    },
    {
      id: 'uchovavanie',
      title: 'Ako dlho osobné údaje uchovávame?',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Vaše osobné údaje uchovávame po rôzne dlhú dobu v závislosti od účelu spracovania. Najmä sme povinní rešpektovať lehoty stanovené právnymi predpismi pre uchovávanie niektorých dokumentov obsahujúcich aj Vaše osobné údaje. Osobné údaje tak uchovávame po dobu, počas ktorej (i) sú nevyhnutné na účely, na ktoré boli zhromaždené; (ii) sú nevyhnutné na účely plnenia povinností z nášho zmluvného vzťahu s Vami, respektíve obchodným partnerom; (iii) je platný Váš súhlas; (iv) máme oprávnený záujem na uchovávaní týchto údajov, pokiaľ tým nie je neprimerane zasiahnuté do Vašich záujmov alebo základných práv a slobôd; alebo (v) to vyžadujú príslušné právne predpisy.',
        },
        {
          kind: 'paragraph',
          text: 'Ak ďalšie oprávnené uchovávanie údajov nie je nevyhnutné na iné účely:',
        },
        {
          kind: 'bullets',
          items: [
            'Osobné údaje spracovávané v súvislosti s plnením zmluvy uzavretej s Vami (najmä informácie o registrácii účtu a poskytnutých službách) uchovávame po dobu trvania zmluvného vzťahu a následne po dobu maximálne 4 rokov od jeho ukončenia.',
            'Správy zaslané prostredníctvom funkcie chatu a záznamy o iných interakciách medzi užívateľmi uchovávame do zrušenia užívateľského účtu posledného užívateľa, ktorého sa týkajú, a následne tieto informácie archivujeme po dobu maximálne 4 rokov.',
            'Neanonymné údaje užívateľov pre účely hodnotenia, optimalizácie, zlepšovania kvality a bezpečnosti našich služieb a obchodných procesov spracovávame po dobu maximálne 3 rokov od zhromaždenia týchto údajov.',
            'Údaje získané v rámci komunikácie s Vami mimo platformu uchovávame po dobu maximálne 3 mesiacov od vybavenia Vašej otázky, žiadosti alebo sťažnosti, ak nejde o údaje nevyhnutné na plnenie iných účelov.',
            'Daňové a účtovné doklady a údaje v nich obsiahnuté uchovávame po dobu 10 rokov od konca zdaňovacieho alebo účtovného obdobia, na ktoré sa vzťahujú.',
          ],
        },
      ],
    },
    {
      id: 'prava',
      title: 'Aké máte v súvislosti so spracovaním Vašich osobných údajov práva?',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ako subjektu osobných údajov Vám patria tieto práva:',
        },
        {
          kind: 'bullets',
          items: [
            'právo na prístup – máte právo od nás požadovať potvrdenie o tom, či spracovávame Vaše osobné údaje, a ak je to tak, získať kópiu týchto údajov a informácie o ich spracovaní;',
            'právo na opravu – Vaše užívateľské údaje môžete zmeniť najmä v nastavení svojho užívateľského účtu. Ak to nie je možné, máte právo požadovať opravu či doplnenie nepresných či neúplných osobných údajov;',
            'právo na výmaz – za určitých podmienok máte právo požiadať o výmaz Vašich osobných údajov;',
            'právo na obmedzenie spracovania – za určitých podmienok máte právo požadovať obmedzenie spracovania Vašich osobných údajov (napr. ak sú vaše osobné údaje neoprávnene uchovávané);',
            'právo na prenositeľnosť – v niektorých prípadoch môžete požadovať, aby Vaše osobné údaje boli predpísaným spôsobom odovzdané Vám alebo tretej osobe;',
            'právo vzniesť námietku proti spracovaniu – námietku môžete podať najmä, ak je spracovanie založené na našom oprávnenom záujme;',
            'právo odvolať súhlas – ak je spracovanie Vašich osobných údajov založené na Vašom súhlase, máte právo tento súhlas kedykoľvek odvolať; odvolanie súhlasu nemá vplyv na zákonnosť spracovania vykonaného pred jeho odvolaním;',
            'právo nebyť predmetom rozhodnutia založeného výhradne na automatizovanom spracovaní, vrátane profilovania.',
          ],
        },
        {
          kind: 'paragraph',
          text: 'Pokiaľ máte akékoľvek otázky ohľadom Vašich práv v súvislosti so spracovaním Vašich osobných údajov alebo si prajete uplatniť niektoré z Vašich práv, obráťte sa na nás prostredníctvom vyššie uvedeného kontaktu. Budeme sa Vám snažiť odpovedať čo najskôr, vždy Vám však odpovieme nanajvýš do jedného mesiaca od obdržania Vašej žiadosti.',
        },
        {
          kind: 'paragraph',
          text: 'Ak sa domnievate, že zo strany prevádzkovateľa nedochádza k riadnemu nakladaniu s Vašimi osobnými údajmi, máte možnosť podať podnet alebo sťažnosť na Úrad na ochranu osobných údajov Slovenskej republiky, so sídlom Galvaniho Business Centrum II, Galvaniho 7/B, 821 04 Bratislava, Slovenská republika, viac informácií nájdete na www.dataprotection.gov.sk.',
        },
      ],
    },
    {
      id: 'zmeny',
      title: 'Zmeny tohto dokumentu',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Znenie tohto dokumentu sme oprávnení meniť či akokoľvek dopĺňať, najmä za účelom zapracovania legislatívnych zmien, či zmien účelov a prostriedkov spracovávania. Vaše práva vyplývajúce z tohto dokumentu alebo príslušných právnych predpisov však neobmedzíme. V prípade, že dôjde k zmenám tohto dokumentu spôsobilým ovplyvniť Vaše práva, vhodným spôsobom Vás na to s dostatočným predstihom upozorníme.',
        },
        {
          kind: 'paragraph',
          text: 'Popri tomto dokumente Vás môžeme o niektorých dodatočných spôsoboch a zásadách spracovania Vašich osobných údajov informovať aj prostredníctvom samostatných informácií, oznámení či súhlasov.',
        },
      ],
    },
  ],
}
