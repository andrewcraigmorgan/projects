// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  css: [
    '~/assets/css/main.css',
  ],

  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      title: 'Projects',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=2' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=2' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
      ],
      style: [
        {
          // Hide everything until CSS is loaded to prevent FOUC
          // Also respect prefers-reduced-motion for users who prefer minimal animations
          innerHTML: `
            html { background: #111827; }
            html:not(.ready) body { opacity: 0; }
            html.ready body { opacity: 1; transition: opacity 0.1s; }

            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
                scroll-behavior: auto !important;
              }
            }
          `,
        },
      ],
      script: [
        {
          innerHTML: `
            (function() {
              var saved = localStorage.getItem('colorMode');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var isDark = saved === 'dark' || (!saved && prefersDark) || (saved === 'system' && prefersDark);

              if (isDark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.style.background = '#f9fafb';
              }
            })();
          `,
          type: 'text/javascript',
          tagPosition: 'head',
        },
      ],
    },
  },

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/projects',
    public: {
      appName: 'Projects',
    },
  },

})
