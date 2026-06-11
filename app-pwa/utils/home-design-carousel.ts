export type HomeDesignCarouselRole = 'zamestnavatel' | 'brigadnik' | 'profesional'

export type HomeDesignCarouselSlide = {
  title: string
  text: string
}

export const HOME_DESIGN_CAROUSEL: Record<HomeDesignCarouselRole, HomeDesignCarouselSlide[]> = {
  zamestnavatel: [
    {
      title: '1. Vytvor inzerát',
      text: 'Zaregistruj sa a zverejni pracovnú ponuku za pár minút. Nastav požiadavky, lokalitu a hodinovú mzdu.',
    },
    {
      title: '2. Prezeraj prihlášky',
      text: 'Prechádzaj profily overených uchádzačov, čítaj hodnotenia a vyber toho, kto sa hodí najlepšie.',
    },
    {
      title: '3. Začni spoluprácu',
      text: 'Dohodni podmienky priamo v aplikácii a obsaď svoju pozíciu do 48 hodín.',
    },
  ],
  brigadnik: [
    {
      title: '1. Nájdi brigádu',
      text: 'Prezri stovky brigád podľa tvojich preferencií – podľa mesta, odvetvia alebo hodinovej mzdy.',
    },
    {
      title: '2. Prihlás sa',
      text: 'Odošli prihlášku jedným kliknutím. Žiadny životopis, žiadna byrokracia.',
    },
    {
      title: '3. Začni zarábať',
      text: 'Nastúp na brigádu a začni zarábať hneď na druhý deň.',
    },
  ],
  profesional: [
    {
      title: '1. Vytvor profil',
      text: 'Zaregistruj sa ako profesionál a pridaj svoje odborné zručnosti a referencie.',
    },
    {
      title: '2. Získaj zákazníkov',
      text: 'Nechaj zákazníkov, aby ťa našli cez vyhľadávanie. Daj o sebe vedieť tisíckam ľudí.',
    },
    {
      title: '3. Spravuj zákazky',
      text: 'Komunikuj so zákazníkmi priamo v aplikácii a dohodni podmienky spolupráce.',
    },
  ],
}
