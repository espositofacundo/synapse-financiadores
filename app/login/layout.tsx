// Forzar que la ruta /login sea dinámica (no estática)
// Evita errores de prerender por useSearchParams y datos de sesión
export const dynamic = 'force-dynamic'

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
