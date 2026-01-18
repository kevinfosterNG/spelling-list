import type { Metadata } from "next";
import { Geist, Geist_Mono, Luckiest_Guy } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const funHeading = Luckiest_Guy({
  variable: "--font-fun-heading",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Spelling Sort Helper",
  description: "Drag, listen, and spell weekly word lists.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${funHeading.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
