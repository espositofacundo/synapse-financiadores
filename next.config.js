/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizaciones para producción
  output: 'standalone',
  // Asegurar que las imágenes se optimicen
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Forzar que las rutas API sean dinámicas (no estáticas)
  experimental: {
    dynamicIO: true,
  },
}

module.exports = nextConfig
