import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { UpdateManager } from "@/components/update-manager";
import { APP_NAME } from "@/lib/releases";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  applicationName: APP_NAME,
  description:
    "Turn a leather pattern into 3D-printable stencil plates. The outside wall is the cut line.",
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b2416",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <UpdateManager />
      </body>
    </html>
  );
}
