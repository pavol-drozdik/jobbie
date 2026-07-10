import { ROUTES } from '~/utils/app-routes'
import type { TrustContentPage } from '~/utils/trust-page-content'

const SUPPORT_EMAIL = 'podpora@jobbie.sk'

/** Consumer withdrawal rights notice — `/poucenie-odstupenie-od-zmluvy`. */
export const WITHDRAWAL_RIGHTS_NOTICE_PAGE: TrustContentPage = {
  title: 'Poučenie o práve spotrebiteľa na odstúpenie od zmluvy',
  intro:
    'Informácie o práve spotrebiteľa odstúpiť od zmluvy uzatvorenej na diaľku pri nákupe digitálnych služieb na platforme Jobbie.',
  updatedAt: '2026-07-10',
  dateLabel: 'effective',
  sections: [
    {
      id: 'pravo-odstupenie',
      title: '1. Právo na odstúpenie od zmluvy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak ste spotrebiteľ, máte právo odstúpiť od zmluvy uzatvorenej na diaľku bez uvedenia dôvodu v lehote 14 dní odo dňa uzatvorenia zmluvy, pokiaľ právne predpisy alebo povaha poskytovanej služby neustanovujú inak.',
        },
      ],
    },
    {
      id: 'uplatnenie',
      title: '2. Uplatnenie práva na odstúpenie',
      blocks: [
        {
          kind: 'rich',
          parts: [
            {
              type: 'text',
              text: 'Právo na odstúpenie od zmluvy môžete uplatniť prostredníctvom ',
            },
            {
              type: 'link',
              to: ROUTES.contractWithdrawal,
              label: 'online formulára na odstúpenie od zmluvy',
            },
            {
              type: 'text',
              text: ', ktorý je dostupný v päte webovej stránky Jobbie, alebo zaslaním jednoznačného vyhlásenia na e-mailovú adresu ',
            },
            {
              type: 'mailto',
              email: SUPPORT_EMAIL,
              label: SUPPORT_EMAIL,
            },
            { type: 'text', text: '.' },
          ],
        },
        {
          kind: 'paragraph',
          text: 'Na uplatnenie práva na odstúpenie od zmluvy nie ste povinný uvádzať dôvod.',
        },
        {
          kind: 'paragraph',
          text: 'Po prijatí odstúpenia od zmluvy vám bez zbytočného odkladu zašleme potvrdenie o jeho prijatí na e-mailovú adresu uvedenú vo formulári na odstúpenie od zmluvy.',
        },
      ],
    },
    {
      id: 'dosledky',
      title: '3. Dôsledky odstúpenia od zmluvy',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Ak platne odstúpite od zmluvy, vrátime vám všetky prijaté platby alebo ich príslušnú časť v súlade s platnými právnymi predpismi.',
        },
        {
          kind: 'paragraph',
          text: 'Platba bude vrátená rovnakým spôsobom, akým bola prijatá, pokiaľ sa výslovne nedohodneme inak.',
        },
      ],
    },
    {
      id: 'digitalne-sluzby',
      title: '4. Digitálne služby',
      blocks: [
        {
          kind: 'paragraph',
          text: 'Služby poskytované prostredníctvom platformy Jobbie predstavujú digitálne služby.',
        },
        {
          kind: 'paragraph',
          text: 'Ak ste pred uzavretím zmluvy výslovne požiadali o začatie poskytovania digitálnej služby pred uplynutím lehoty na odstúpenie od zmluvy a boli ste riadne poučení o dôsledkoch takéhoto súhlasu, vaše právo na odstúpenie od zmluvy sa môže obmedziť alebo zaniknúť v rozsahu ustanovenom príslušnými právnymi predpismi.',
        },
      ],
    },
    {
      id: 'kontakt',
      title: '5. Kontakt',
      blocks: [
        {
          kind: 'rich',
          parts: [
            {
              type: 'text',
              text: 'V prípade otázok týkajúcich sa odstúpenia od zmluvy nás môžete kontaktovať na e-mailovej adrese ',
            },
            {
              type: 'mailto',
              email: SUPPORT_EMAIL,
              label: SUPPORT_EMAIL,
            },
            { type: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
}
