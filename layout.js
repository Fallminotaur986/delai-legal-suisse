import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Calculateur de délais légaux suisses',
  description: 'Calculateur de délais pour les procédures juridiques en Suisse',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <main className="min-h-screen bg-background p-4 md:p-8">
          {children}
        </main>
      </body>
    </html>
  )
}
