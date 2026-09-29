import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import 'mapbox-gl/dist/mapbox-gl.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'SafeTerra | Disaster Decision Support',
  description: 'Government disaster decision support and hazard monitoring portal.',
  generator: 'SafeTerra Portal',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f7fa',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
