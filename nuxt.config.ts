// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
  ],

  app: {
    head: {
      title: 'Projects',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg?v=2' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico?v=2' },
      ],
      style: [
        {
          // Hide body until dark mode is resolved to prevent FOUC
          innerHTML: `
            html:not(.color-mode-resolved) body { visibility: hidden; }
          `,
        },
      ],
      script: [
        {
          innerHTML: `
            (function() {
              var saved = localStorage.getItem('colorMode');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

              if (saved === 'dark' || (!saved && prefersDark) || (saved === 'system' && prefersDark)) {
                document.documentElement.classList.add('dark');
              }
              document.documentElement.classList.add('color-mode-resolved');
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
