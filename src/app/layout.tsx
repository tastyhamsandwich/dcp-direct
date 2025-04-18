import type { Metadata } from "next";
import NavBar from '@comps/nav/NavBar';
//import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@contexts/authContext';

/*const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});*/

export const metadata: Metadata = {
  title: "DCP Direct",
  description: "Digital Card Poker - Direct Play",
};
//className={`${geistSans.variable} ${geistMono.variable} antialiased`}
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        
      >
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
