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
          // Hide everything until CSS is loaded to prevent FOUC
          innerHTML: `
            html { background: #111827; }
            html:not(.ready) body { opacity: 0; }
            html.ready body { opacity: 1; transition: opacity 0.1s; }
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
