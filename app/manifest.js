const manifest = {
  name: 'luma — your circle, closer',
  short_name: 'luma',
  description: 'A calmer social space for the people who matter.',
  start_url: '/app',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#09090b',
  theme_color: '#09090b',
  lang: 'en',
  categories: ['social', 'lifestyle'],
  icons: [
    {
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    },
    {
      src: '/icon-dark-32x32.png',
      sizes: '32x32',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/apple-icon.png',
      sizes: '180x180',
      type: 'image/png',
      purpose: 'any',
    },
  ],
}

export default manifest
