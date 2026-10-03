import type { Metadata, Viewport } from "next";
import "./globals.css";

/* ─── Site-wide constants ─────────────────────────────────────────────── */
const SITE_URL = "https://ridemywork.com";
const SITE_NAME = "RideMyWork";
const TAGLINE = "Verified Carpooling in Lagos";
const DESCRIPTION =
  "RideMyWork connects verified people travelling in the same direction across Lagos. Join an existing journey, share the cost, and ride with someone you can trust.";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

/* ─── Viewport ────────────────────────────────────────────────────────── */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#07120f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/* ─── Metadata ────────────────────────────────────────────────────────── */
export const metadata: Metadata = {
  /* Core */
  title: {
    default: `${SITE_NAME} | ${TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  authors: [{ name: "RideMyWork Team", url: SITE_URL }],
  creator: "RideMyWork",
  publisher: "RideMyWork",

  /* Keywords */
  keywords: [
    "carpooling Lagos",
    "carpool Lagos Nigeria",
    "Lagos ride sharing",
    "verified carpooling Nigeria",
    "cost sharing commute Lagos",
    "Lekki Victoria Island carpool",
    "Ajah Lekki commute",
    "Ikeja Lekki carpool",
    "Yaba Victoria Island commute",
    "RideMyWork",
    "trip host Lagos",
    "shared rides Lagos",
    "affordable transport Lagos",
    "commuting Nigeria",
  ],

  /* Canonical */
  alternates: {
    canonical: SITE_URL,
    languages: { "en-NG": SITE_URL },
  },

  /* Favicons & icons */
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon.svg", color: "#07120f" },
    ],
  },

  /* Web manifest */
  manifest: "/site.webmanifest",

  /* Open Graph */
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "RideMyWork — Verified Carpooling in Lagos",
        type: "image/jpeg",
      },
    ],
  },

  /* Twitter / X */
  twitter: {
    card: "summary_large_image",
    site: "@ridemywork",
    creator: "@ridemywork",
    title: `${SITE_NAME} — ${TAGLINE}`,
    description: DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        alt: "RideMyWork — Verified Carpooling in Lagos",
      },
    ],
  },

  /* App specific */
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
    startupImage: ["/apple-touch-icon.png"],
  },

  /* Format detection */
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },

  /* Robots */
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  /* Category */
  category: "transportation",
};

/* ─── Structured data (JSON-LD) ───────────────────────────────────────── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: DESCRIPTION,
      inLanguage: "en-NG",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.jpg`,
        width: 512,
        height: 512,
      },
      description: DESCRIPTION,
      foundingLocation: {
        "@type": "Place",
        name: "Lagos, Nigeria",
      },
      areaServed: {
        "@type": "City",
        name: "Lagos",
        addressCountry: "NG",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: `${SITE_NAME} | ${TAGLINE}`,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#organization` },
      description: DESCRIPTION,
      inLanguage: "en-NG",
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            item: { "@id": SITE_URL, name: "Home" },
          },
        ],
      },
    },
    {
      "@type": "Service",
      "@id": `${SITE_URL}/#service`,
      name: "RideMyWork Carpooling",
      serviceType: "Carpooling",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: { "@type": "City", name: "Lagos", addressCountry: "NG" },
      description:
        "Verified peer-to-peer carpooling service connecting Lagos commuters travelling in the same direction.",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is RideMyWork a ride-hailing service?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. RideMyWork connects passengers to existing journeys. A Trip Host must already have a genuine reason to make the trip.",
          },
        },
        {
          "@type": "Question",
          name: "What is a Trip Host?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A Trip Host is someone already making a journey who has available seats in their vehicle. They are not driving because a passenger requested a ride.",
          },
        },
        {
          "@type": "Question",
          name: "Can workplaces create communities?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Workplaces, universities, estates, organizations and events can become verified communities that add trust and better matching.",
          },
        },
      ],
    },
  ],
};

/* ─── Root layout ─────────────────────────────────────────────────────── */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" dir="ltr">
      <head>
        {/* Preconnect to external origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />

        {/* DNS prefetch */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />

        {/* Favicon fallbacks */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />

        {/* Web App Manifest */}
        <link rel="manifest" href="/site.webmanifest" />

        {/* Microsoft tile */}
        <meta name="msapplication-TileColor" content="#07120f" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
