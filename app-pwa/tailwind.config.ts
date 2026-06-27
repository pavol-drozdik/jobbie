import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      fontFamily: {
        dmSans: ['DM Sans Variable', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      screens: {
        marketing: '900px',
        marketingXl: '1200px',
      },
      colors: {
        marketing: {
          mint: '#f2faf4',
          green: '#22c55e',
          /** A/B homepage hero accent from Claude design export */
          abGreen: '#179a2c',
          abBright: '#2ecc40',
          abInk: '#1a1a1a',
          abMuted: '#52635a',
          abLink: '#41514a',
          abBottom: '#7e8b82',
          abChipBg: '#e8f0eb',
          surface: '#f9fcfa',
          soft: '#fafcfb',
          panel: '#cff0db',
          muted: '#8e8e8e',
        },
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0px 3px 6px 1px rgba(0, 0, 0, 0.12)',
        dropdown: '0 12px 28px rgba(0, 0, 0, 0.12)',
        hero: '0 8px 40px rgba(0, 0, 0, 0.13)',
      },
    },
  },
} satisfies Config
