import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpenCheck,
  ClipboardList,
  HeartPulse,
  Library,
  LineChart,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import {
  absoluteUrl,
  SEO_KEYWORDS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "School ERP Software for Kenyan CBC Schools",
  description: SITE_DESCRIPTION,
  keywords: SEO_KEYWORDS,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "My Shule school ERP dashboard for Kenyan CBC schools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/opengraph-image")],
  },
};

const modules = [
  {
    title: "M-PESA fee payments",
    description: "Track invoices, receipts, balances, and payment confirmations across school accounts.",
    icon: Banknote,
  },
  {
    title: "CBC report cards",
    description: "Prepare exam mark sheets, grading workflows, report cards, and academic summaries.",
    icon: BookOpenCheck,
  },
  {
    title: "Admissions and students",
    description: "Manage applications, student profiles, classes, guardians, and document records.",
    icon: ClipboardList,
  },
  {
    title: "Parent and student portal",
    description: "Give families secure access to fees, academics, notices, and school updates.",
    icon: UsersRound,
  },
  {
    title: "Inventory and library",
    description: "Monitor stock issues, receipts, book borrowing, returns, and barcode workflows.",
    icon: Library,
  },
  {
    title: "Clinic and discipline",
    description: "Keep student welfare, health visits, counselling, and discipline records in one system.",
    icon: HeartPulse,
  },
  {
    title: "Staff and operations",
    description: "Coordinate HR, timetables, attendance, labs, communications, and support tickets.",
    icon: MessageSquare,
  },
  {
    title: "Leadership reporting",
    description: "See finance, academics, admissions, and operations metrics from one school dashboard.",
    icon: LineChart,
  },
];

const proofPoints = [
  "Built for Kenyan school workflows and CBC academic reporting",
  "Secure multi-tenant access for admins, staff, parents, and students",
  "Production health checks for API, database, Redis, queues, storage, and malware scanning",
];

const faqs = [
  {
    question: "What is My Shule?",
    answer:
      "My Shule is a web-based school ERP for Kenyan schools that brings fees, academics, admissions, inventory, library, clinic, discipline, staff, reports, support, and parent portal workflows into one secure system.",
  },
  {
    question: "Does My Shule support M-PESA school fee payments?",
    answer:
      "Yes. My Shule includes school finance and M-PESA workflows for tracking invoices, fee balances, payment confirmations, and reconciliation-ready finance records.",
  },
  {
    question: "Can parents and students use My Shule online?",
    answer:
      "Yes. The parent and student portal gives families secure access to school updates, fee information, academic records, messages, and downloadable documents.",
  },
  {
    question: "Is My Shule built for CBC schools in Kenya?",
    answer:
      "Yes. The academic and exams workflows are written for Kenyan school operations, including CBC-aligned reporting, mark sheets, report cards, and learner progress tracking.",
  },
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-KE",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Kenyan schools, school administrators, teachers, parents, and students",
    },
    featureList: modules.map((module) => module.title),
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f6f8f7] text-[#111827]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative min-h-[78dvh] overflow-hidden bg-[#0f172a] text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-[0.28]"
          style={{ backgroundImage: "url('/opengraph-image')" }}
        />
        <div aria-hidden="true" className="absolute inset-0 bg-[#07111f]/[0.78]" />
        <div className="relative mx-auto flex min-h-[78dvh] w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3" aria-label="My Shule home">
              <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-white text-[#047857]">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold tracking-normal">{SITE_NAME}</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/support/status"
                className="hidden rounded-[8px] px-3 py-2 text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                Status
              </Link>
              <Link
                href="/login"
                className="rounded-[8px] border border-white/25 px-3 py-2 text-white transition hover:bg-white hover:text-[#0f172a]"
              >
                Sign in
              </Link>
            </nav>
          </header>

          <div className="flex flex-1 items-center py-12 sm:py-16">
            <div className="max-w-4xl">
              <p className="inline-flex rounded-[8px] border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white/90">
                Kenya-ready school management system
              </p>
              <h1 className="mt-7 max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl lg:text-6xl">
                School ERP software for Kenyan CBC schools
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">
                My Shule helps schools run fees, M-PESA payments, report cards,
                admissions, inventory, library, clinic, discipline, staff, support,
                and parent portal workflows from one secure web platform.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/school/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-white px-5 text-sm font-semibold text-[#0f172a] transition hover:bg-[#ecfdf5]"
                >
                  School login
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/portal/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-white/25 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Parent portal
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dbe5df] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-7 sm:px-8 md:grid-cols-3 lg:px-10">
          {proofPoints.map((point) => (
            <div key={point} className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" aria-hidden="true" />
              <p className="text-sm leading-6 text-[#334155]">{point}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-[72px]">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#047857]">
            Complete school operations
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-[#0f172a]">
            One platform for the daily work Kenyan schools already do
          </h2>
          <p className="mt-4 text-base leading-7 text-[#475569]">
            School leaders can see the modules, workflows, and operational coverage
            before signing in, with direct access to the latest production system and
            public platform status.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <article
                key={module.title}
                className="rounded-[8px] border border-[#dbe5df] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <Icon className="h-5 w-5 text-[#047857]" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold leading-6 text-[#0f172a]">
                  {module.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#64748b]">{module.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#10201a] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.85fr_1fr] lg:px-10 lg:py-[72px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a7f3d0]">
              Built for trust
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal">
              A clear operating layer for schools, families, and leadership teams
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Role-based access for school admins, teachers, parents, students, and support teams",
              "Public status checks for API, database, Redis, queues, storage, and scanner readiness",
              "Readable school records for finance, academics, admissions, welfare, and operations",
              "Secure production workflows on the current myshule.online domain",
            ].map((item) => (
              <div key={item} className="rounded-[8px] border border-white/20 bg-white/[0.08] p-5">
                <ShieldCheck className="h-5 w-5 text-[#a7f3d0]" aria-hidden="true" />
                <p className="mt-4 text-sm leading-6 text-white/80">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-8 lg:px-10 lg:py-[72px]">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#047857]">
          Frequently asked questions
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-[#0f172a]">
          My Shule school ERP questions
        </h2>
        <div className="mt-8 divide-y divide-[#dbe5df] rounded-[8px] border border-[#dbe5df] bg-white">
          {faqs.map((item) => (
            <article key={item.question} className="p-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-[#0f172a]">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-[#475569]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#dbe5df] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-[#0f172a]">
              Access the live My Shule system
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              Use the current production domain for the latest Vercel deployment and public status checks.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46]"
            >
              Sign in
            </Link>
            <Link
              href="/support/status"
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#cbd5e1] px-5 text-sm font-semibold text-[#0f172a] transition hover:border-[#94a3b8]"
            >
              System status
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
