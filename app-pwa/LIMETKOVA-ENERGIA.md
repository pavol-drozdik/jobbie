# Jobbie – dizajn „Limetková energia“

Zmeny sa týkajú iba frontendu (`app-pwa`). Backend (`backend-ts`, `supabase`) som nemenil.

## Ako zmeny nasadiť

**Možnosť A – patch (odporúčané, ak používate git):**
skopírujte `jobbie-limetkova-energia.patch` do priečinka `app-pwa` a spustite

    git apply jobbie-limetkova-energia.patch

**Možnosť B – súbory:** obsah priečinka `app-pwa/` z tohto zipu skopírujte cez váš `app-pwa/`
(prepíše 97 súborov a pridá 3 nové).

Potom `npm run dev` a skontrolujte web v prehliadači.

## Čo sa zmenilo

- **Farby:** `tailwind.config.ts` a CSS premenné v `assets/css/main.css`. Názvy tried
  (`marketing-green`, `marketing-panel`, `--g500` …) ostali rovnaké, zmenili sa len hodnoty:
  zelená → tmavá lesná `#10231A`, svetlé zelené plochy → krémová `#FFFBEF`,
  zvýraznené panely → limetková `#C8F03C`. Doplnená paleta `jobbie.*` (ink, lime, pink, sun, cream).
- **Tlačidlá:** tmavé pozadie s limetkovým textom (pravidlo v main.css, bez zásahu do komponentov).
- **Karty a panely:** jemné sivé tiene nahradené obrysom 2 px a posunutým tieňom
  (`shadow-[0_0_0_2px_#10231A,4px_4px_0_2px_#10231A]`, v configu aj `shadow-brutal`).
- **Písmo nadpisov:** Bricolage Grotesque (self-hosted v `public/fonts`, licencia SIL OFL),
  telo textu zostáva DM Sans.
- **Zvýraznené slová v nadpisoch** („Jeden web.“, „ponuky“) majú limetkový podčiarkovač.
- **Úvodná stránka:** limetkový hero, hľadanie s hrubým obrysom, kartičky „Pre uchádzačov / Pre firmy“,
  ružový kruh za obrázkom telefónu, kroky a karusel „Ako Jobbie funguje“ v novom štýle.
- Zelené prechody (prihlásenie, cenník, platba) sú teraz tmavé plochy s bielym textom.
- Farba PWA (theme color) je limetková.

## 3. kolo – kontrola na skutočnej aplikácii

Aplikáciu som spustil (`nuxt dev`) a prešiel stránky. Doplnil som, čo ostalo zelené:
banner s filtrami na zozname ponúk (teraz limetkový s tmavým textom), tlačidlo „Len urgentné“
(ružové), zelené prechody v profile, prehľade uchádzačov, cenníku a sprievodcovi reklamou,
svetlozelené plochy v cenníku, chate a stavoch uchádzačov.

Poznámka: frontend potrebuje pri spustení aj priečinok `backend-ts/src/cv/document` (alias `#cv-document`),
takže ho spúšťajte z celého repozitára JOBBIE, nie samostatne.

## 4. kolo – ružové akcenty

Ružová `#FF9ED2` je teraz druhá výrazná farba: podčiarkovač zvýraznených slov v nadpisoch,
ružový tieň pod hlavnými tlačidlami, štítok „Nové“ na ponukách, iniciály firiem na kartách,
tlačidlo „Registrovať“ v hlavičke, pás s aktuálnymi ponukami (`jobbie.pinkSoft`), štítok
„Aplikáciu pripravujeme“, newsletter a ikony sociálnych sietí v pätičke, karty ponúk
sa pri prejdení myšou zdvihnú na ružový tieň.

## 5. kolo – farebnosť úvodnej stránky na podstránkach

Tmavé panely, ktoré boli pôvodne zelené, sú teraz limetkové alebo ružové s tmavým textom
(trieda `jb-on-light` v main.css prefarbí biely text v nich na tmavý, tlačidlá ostanú):
prihlásenie a registrácia (limetkový panel s ružovými kruhmi), cenník (ružový úvod),
kontaktný panel v cenníku, blog (limetkový úvod s ružovými kruhmi), filtre v prehľade
uchádzačov, obálka profilu, panely Uložené (ružový), Hodnotenia a Predplatné (limetkové),
box s odmenou na detaile ponuky (svetloružový s ružovým tieňom), kredity v nastaveniach
a sprievodca pridaním ponuky.

## Na čo sa pozrieť po nasadení

- **Obrázky a logo** (`/img/*.webp`, logo) sú stále v pôvodnej zelenej – treba ich vymeniť zvlášť.
- Zmeny som nemohol spustiť v prehliadači (build tohto projektu potrebuje viac pamäte, než som mal).
  Tailwind CSS som skompiloval úspešne a patch som overil na čistej kópii, ale prejdite si hlavne:
  úvod, zoznam ponúk, detail ponuky, prihlásenie, cenník, platbu, chat a nastavenia.
- Odkazy farby `text-marketing-green` sú teraz tmavé – ak niekde splývajú s textom, pridajte `underline`.
- Priečinok `dist/` (starý build) som nemenil, pri ďalšom builde sa prepíše.
- Súbor `.env` s prístupmi som neotváral ani nemenil.
