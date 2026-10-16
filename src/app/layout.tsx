import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LOCALES_META } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/provider";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInit = `(function(){try{var s=localStorage.getItem("uanglite-theme");var d=s?s==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const { meta } = await getDictionary();
  return {
    title: {
      default: "UangLite",
      template: "%s · UangLite",
    },
    description: meta.appDescription,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const dict = await getDictionary();

  return (
    <html
      lang={LOCALES_META[locale].bcp47}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
