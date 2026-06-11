export type PricingFaqItem = {
  readonly question: string
  readonly answer: string
}

export const PRICING_FAQ_ITEMS: readonly PricingFaqItem[] = [
  {
    question: 'Čo sú kredity na Jobbie?',
    answer:
      'Kredity sú jednotky na platené akcie v platforme — napríklad zverejnenie alebo zvýraznenie ponuky. Balíky kreditov kúpite jednorazovo na stránke Cenník; spotrebované kredity sa odpočítajú pri konkrétnej akcii.',
  },
  {
    question: 'Aký je rozdiel medzi kreditmi a mesačným plánom?',
    answer:
      'Mesačný plán obsahuje pravidelné benefity (napr. mesačné kredity, limity databázy životopisov) podľa zvoleného tieru. Jednorazové kredity sú vhodné, ak platené funkcie potrebujete občas bez predplatného.',
  },
  {
    question: 'Kto môže nakupovať plány a kredity?',
    answer:
      'Platené funkcie pre firmy a zamestnávateľov sú určené firemným účtom. Uchádzači majú registráciu zvyčajne bezplatnú; platené doplnky pre uchádzačov sú uvedené v cenníku, ak sú k dispozícii.',
  },
  {
    question: 'Ako prebieha platba?',
    answer:
      'Platbu kartou spracuje Stripe na zabezpečenej stránke. Kredity alebo predplatné sa aktivujú až po úspešnom potvrdení platby na serveri — nie podľa samotného návratu z platobnej brány.',
  },
  {
    question: 'Môžem porovnať plány?',
    answer:
      'Áno. Na záložke Mesačné plány nájdete tabuľku porovnania limitov databázy životopisov, kreditov a ďalších funkcií podľa jednotlivých plánov.',
  },
  {
    question: 'Potrebujem individuálnu ponuku?',
    answer:
      'Pre doplnkové marketingové služby použite formulár Kontaktujte nás na stránke Cenník alebo napíšte na ahoj@jobbie.sk.',
  },
]
