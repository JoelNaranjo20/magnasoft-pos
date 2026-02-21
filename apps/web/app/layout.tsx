import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UIProvider } from "./context/UIContext";
import { AuthProvider } from "./context/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "MagnaSoft - Portal de Gestión",
  description: "Plataforma multisoftware para gestión de negocios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <UIProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </UIProvider>
      </body>
    </html>
  );
}
