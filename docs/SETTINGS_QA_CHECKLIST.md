# Nastavenia účtu – QA checklist

## Navigácia
- [ ] `/nastavenia` zobrazuje 9 kariet (firma disabled pre ne-firemné účty)
- [ ] Každá karta vedie na správnu podstránku
- [ ] `/app/profile/settings` presmeruje na `/nastavenia`
- [ ] `/app/plans` presmeruje na `/cennik?tab=plans`
- [ ] Dashboard **Zobraziť plány** otvorí `/cennik?tab=plans`

## Profil
- [ ] Uloženie osobného profilu (meno, bio, fotka) funguje
- [ ] Zmena rolí vyžaduje aspoň jednu rolu

## Firma (company)
- [ ] Firemné polia sa uložia samostatne

## Notifikácie
- [ ] Matica sa uloží a po reload zostane
- [ ] SMS stĺpec disabled bez overeného telefónu
- [ ] Push tlačidlo funguje alebo zobrazí správnu chybu

## Bezpečnosť
- [ ] Zmena hesla s validáciou
- [ ] Zmena e-mailu
- [ ] TOTP zapnutie/vypnutie
- [ ] Passkeys pridanie/odstránenie
- [ ] SMS overenie telefónu

## Zariadenia
- [ ] Čitateľný názov zariadenia (nie len raw UA)
- [ ] Badge aktuálneho zariadenia
- [ ] Odhlásenie relácie / ostatných relácií

## Fakturácia a kredity
- [ ] Zobrazenie plánu z `/api/billing/account`
- [ ] Faktúry alebo prázdny stav
- [ ] Kreditný zostatok a história s filtrami

## Súkromie
- [ ] Toggles sa uložia
- [ ] Verejný profil rešpektuje `public_profile_enabled`

## Vymazať účet
- [ ] Zmazanie účtu vyžaduje potvrdenie DELETE

## Autorizácia
- [ ] Neprihlásený používateľ je presmerovaný na login
