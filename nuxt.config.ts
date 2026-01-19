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
      script: [
        {
          innerHTML: `
            (function() {
              var saved = localStorage.getItem('colorMode');
              if (saved === 'light') {
                return;
              }
              if (saved === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return;
              }
              document.documentElement.classList.add('dark');
            })();
          `,
          type: 'text/javascript',
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
