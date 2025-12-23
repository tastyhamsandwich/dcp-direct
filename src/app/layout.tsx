import type { Metadata } from "next";
import NavBarClient from '@comps/nav/NavBarClient';
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import "react-image-crop/dist/ReactCrop.css";
import { AuthProvider } from '@contexts/authContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DCP Direct",
  description: "Dealer's Choice Poker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NavBarClient />
          <div className="main-content">{children}</div>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
