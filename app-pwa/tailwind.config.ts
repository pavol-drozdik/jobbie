import type { Config } from 'tailwindcss'

/**
 * Jobbie — "Limetková energia" theme.
 * The `marketing.*` keys are kept so existing class names keep working;
 * only their values changed. `jobbie.*` holds the raw brand palette.
 */
export default {
  theme: {
    extend: {
      fontFamily: {
        dmSans: ['DM Sans Variable', 'DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque Variable', 'DM Sans Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      screens: {
        marketing: '900px',
        marketingXl: '1200px',
      },
      colors: {
        jobbie: {
          ink: '#10231A',
          lime: '#C8F03C',
          pink: '#FF9ED2',
          pinkSoft: '#FFE3F1',
          sun: '#FFF0C2',
          cream: '#FFFBEF',
          muted: '#3D4A42',
        },
        marketing: {
          /** Light page background (was mint) */
          mint: '#FFFBEF',
          /** Primary action / accent text / borders — dark forest ink (was green) */
          green: '#10231A',
          abGreen: '#10231A',
          abBright: '#C8F03C',
          abInk: '#10231A',
          abMuted: '#3D4A42',
          abLink: '#10231A',
          abBottom: '#5C6A61',
          abChipBg: '#FF9ED2',
          surface: '#FFFFFF',
          soft: '#FFF8E6',
          /** Highlight panels (was light green) — lime */
          panel: '#C8F03C',
          muted: '#5C6A61',
        },
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 0 0 2px #10231A, 4px 4px 0 2px #10231A',
        dropdown: '0 0 0 2px #10231A, 4px 4px 0 2px #10231A',
        hero: '0 0 0 2px #10231A, 6px 6px 0 2px #10231A',
        brutal: '0 0 0 2px #10231A, 4px 4px 0 2px #10231A',
        'brutal-lg': '0 0 0 2px #10231A, 7px 7px 0 2px #10231A',
      },
    },
  },
} satisfies Config
