/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones para producción
  output: 'standalone',
  // Asegurar que las imágenes se optimicen
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig
