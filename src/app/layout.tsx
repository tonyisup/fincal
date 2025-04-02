import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/components/providers/providers";
import { ModeToggle } from "@/components/mode-toggle";
export const metadata: Metadata = {
  title: "FinCal",
  description: "FinCal",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body>
        <Providers>          
          <ModeToggle />
          {children}
        </Providers>
      </body>
    </html>
  );
}
