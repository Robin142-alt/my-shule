import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BellRing,
  BookOpenCheck,
  CalendarCheck,
  LineChart,
  MessageSquare,
  PhoneCall,
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
  title: "Best School ERP in Kenya for Parents, Schools and Principals",
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
        alt: "My Shule parent portal and principal dashboard preview",
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

const contactPhone = "0769622589";

const painRelief = [
  {
    title: "Stops fee-balance phone calls",
    description:
      "Parents check balances, recent payments, and M-PESA guidance without calling the bursar or visiting the office.",
    icon: PhoneCall,
  },
  {
    title: "Ends lost payment screenshots",
    description:
      "M-PESA confirmations, receipts, pending matches, and statements stay in one finance workspace.",
    icon: Banknote,
  },
  {
    title: "Catches arrears before closing day",
    description:
      "Principals and bursars see arrears, classes at risk, and SMS reminder progress before pressure builds.",
    icon: BellRing,
  },
  {
    title: "Replaces scattered Excel reports",
    description:
      "Academics, discipline, clinic, admissions, library, inventory, staff, and finance roll into one view.",
    icon: LineChart,
  },
  {
    title: "Reduces parent anxiety",
    description:
      "A parent can see grades, discipline score, medical notes, notices, and downloads from the phone they already use.",
    icon: UsersRound,
  },
  {
    title: "Protects school decisions",
    description:
      "Role-based access keeps sensitive records with the people who need them, with a clearer trail for leadership.",
    icon: ShieldCheck,
  },
];

const quickLinks = [
  { label: "Parent Login", href: "/parent/login" },
  { label: "School Login", href: "/school/login" },
  { label: "My Shule Dashboard", href: "/login" },
];

const faqs = [
  {
    question: "What does My Shule save a school from?",
    answer:
      "My Shule saves schools from repeated fee-balance calls, manual payment tracing, scattered academic records, lost discipline notes, disconnected clinic records, and slow principal reporting.",
  },
  {
    question: "Can parents pay and follow fees without coming to school?",
    answer:
      "Yes. Parents can see the fee balance, recent payments, M-PESA payment context, notices, and reminders from the portal, so they do not need to keep calling or travelling for simple updates.",
  },
  {
    question: "Does My Shule support SMS fee reminders?",
    answer:
      "Yes. My Shule includes SMS fee reminder workflows so schools can nudge parents with clearer balance context instead of relying on manual calls and paper notes.",
  },
  {
    question: "What does a principal see after login?",
    answer:
      "A principal sees school-wide insights across fees, academics, discipline, clinic, admissions, staff, inventory, library, communication, support, and risk areas that need attention.",
  },
];

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    telephone: contactPhone,
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
      audienceType: "Kenyan schools, principals, bursars, teachers, parents, and students",
    },
    featureList: [
      "Parent login",
      "School login",
      "Principal dashboard",
      "M-PESA fee payments",
      "SMS fee reminders",
      "CBC report cards",
      "Discipline score tracking",
      "Clinic and medical history records",
      "Inventory, library, admissions, staff, and support workflows",
    ],
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

function MetricCard({
  label,
  value,
  helper,
  tone = "emerald",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "emerald" | "blue" | "amber" | "rose";
}) {
  const toneClass = {
    emerald: "bg-[#ecfdf5] text-[#047857]",
    blue: "bg-[#eff6ff] text-[#2563eb]",
    amber: "bg-[#fff7ed] text-[#c2410c]",
    rose: "bg-[#fff1f2] text-[#be123c]",
  }[tone];

  return (
    <div className="rounded-[8px] border border-[#dbe5df] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748b]">{label}</p>
      <p className={`mt-3 inline-flex rounded-[8px] px-2.5 py-1 text-xl font-semibold ${toneClass}`}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-[#475569]">{helper}</p>
    </div>
  );
}

function ParentPortalPreview() {
  return (
    <div className="rounded-[8px] border border-[#dbe5df] bg-white p-4 shadow-[0_20px_70px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
        <div>
          <p className="text-sm font-semibold text-[#0f172a]">Parent portal</p>
          <p className="mt-1 text-xs text-[#64748b]">Amina Otieno - Grade 6 Blue</p>
        </div>
        <span className="rounded-[8px] bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]">
          SMS ready
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricCard
          label="Fee balance"
          value="KES 12,450"
          helper="No trip to the office. Parent sees balance and payment route."
          tone="amber"
        />
        <MetricCard
          label="Latest grade"
          value="B+"
          helper="Exam progress is visible before report-card day."
          tone="blue"
        />
        <MetricCard
          label="Discipline score"
          value="92%"
          helper="Behaviour record is clear before small issues grow."
          tone="emerald"
        />
        <MetricCard
          label="Medical history"
          value="Updated"
          helper="Clinic notes and allergy context stay close to the learner."
          tone="rose"
        />
      </div>

      <div className="mt-4 rounded-[8px] border border-[#dbe5df] bg-[#f8fafc] p-4">
        <div className="flex items-start gap-3">
          <BellRing className="mt-1 h-5 w-5 text-[#047857]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0f172a]">Fee reminder SMS</p>
            <p className="mt-1 text-sm leading-6 text-[#475569]">
              Dear parent, Amina has a KES 12,450 balance. Use the school M-PESA paybill before Friday.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrincipalDashboardPreview() {
  const rows = [
    ["Fees collected today", "KES 184,300", "M-PESA matched"],
    ["Arrears risk", "37 learners", "SMS reminders queued"],
    ["CBC reports", "84% reviewed", "Teacher follow-up visible"],
    ["Discipline watch", "6 cases", "Deputy action needed"],
    ["Clinic notes", "3 updates", "Parent follow-up logged"],
  ];

  return (
    <div className="rounded-[8px] border border-[#dbe5df] bg-[#10201a] p-4 text-white shadow-[0_20px_70px_rgba(15,23,42,0.18)]">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-sm font-semibold">Principal dashboard</p>
          <p className="mt-1 text-xs text-white/65">Whole school view before assembly starts</p>
        </div>
        <span className="rounded-[8px] bg-white px-3 py-1 text-xs font-semibold text-[#047857]">
          Live insight
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        {rows.map(([label, value, helper]) => (
          <div key={label} className="grid grid-cols-[1fr_auto] gap-4 rounded-[8px] border border-white/10 bg-white/[0.08] p-4">
            <div>
              <p className="text-sm font-semibold text-white">{label}</p>
              <p className="mt-1 text-xs text-white/65">{helper}</p>
            </div>
            <p className="text-right text-sm font-semibold text-[#a7f3d0]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f8f6] text-[#10201a]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="bg-[#eef7f1]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3" aria-label="My Shule home">
              <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#047857] text-white">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold tracking-normal">{SITE_NAME}</span>
            </Link>
            <nav className="hidden items-center gap-2 text-sm font-semibold md:flex">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-[8px] px-3 py-2 text-[#334155] transition hover:bg-white hover:text-[#047857]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <a
              href={`tel:${contactPhone}`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[8px] bg-[#10201a] px-4 text-sm font-semibold text-white transition hover:bg-[#047857]"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              {contactPhone}
            </a>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.92fr_1.08fr]">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal text-[#10201a] sm:text-5xl lg:text-5xl">
                Best school ERP in Kenya for parents, schools and principals
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#475569]">
                My Shule saves schools from fee-balance calls, missing M-PESA confirmations,
                scattered records, and slow reports. Parents see what matters from home, while
                principals spot pressure points before they become problems.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/parent/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46]"
                >
                  Parent Login
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/school/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-[#94a3b8] bg-white px-5 text-sm font-semibold text-[#10201a] transition hover:border-[#047857]"
                >
                  School Login
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-[#dbe5df] px-5 text-sm font-semibold text-[#334155] transition hover:bg-white hover:text-[#047857]"
                >
                  My Shule Dashboard
                </Link>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ParentPortalPreview />
              <PrincipalDashboardPreview />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dbe5df] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-7 sm:px-8 md:grid-cols-3 lg:px-10">
          {[
            "Parent login appears first for quick family access",
            "School login is one step away for principals, bursars and teachers",
            `Call ${contactPhone} for My Shule setup and onboarding`,
          ].map((point) => (
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
            What the system saves you from
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-[#10201a]">
            Less chasing, fewer office queues, faster decisions
          </h2>
          <p className="mt-4 text-base leading-7 text-[#475569]">
            My Shule is not just a list of modules. It is a way to remove the daily friction
            that makes schools lose time, parents lose patience, and leaders make decisions late.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {painRelief.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-[8px] border border-[#dbe5df] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <Icon className="h-5 w-5 text-[#047857]" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold leading-6 text-[#10201a]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#64748b]">{item.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="bg-[#10201a] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[0.82fr_1fr] lg:px-10 lg:py-[72px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#a7f3d0]">
              SMS fee reminders included
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal">
              Remind parents before arrears become a confrontation
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Fee reminders connect finance records with parent communication. The school can send
              clearer nudges, parents get balance context, and the bursar avoids repeating the same
              phone call all week.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Before", "Manual calls, forgotten promises, unclear balances, and late queues at the office."],
              ["After", "Targeted SMS fee reminders, M-PESA context, receipt history, and visible parent follow-up."],
              ["For parents", "They know what is owed, why it matters, and how to pay from anywhere."],
              ["For schools", "The finance team spends more time reconciling and less time chasing."],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[8px] border border-white/15 bg-white/[0.08] p-5">
                <MessageSquare className="h-5 w-5 text-[#a7f3d0]" aria-hidden="true" />
                <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/75">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-[72px]">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#047857]">
              Login paths
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-[#10201a]">
              The right person lands in the right workspace
            </h2>
          </div>
          <div className="grid gap-4 lg:col-span-2">
            {[
              {
                title: "Parent Login",
                href: "/parent/login",
                icon: UsersRound,
                description:
                  "For families checking fee balance, grades, discipline score, medical history, notices, and payment guidance.",
              },
              {
                title: "School Login",
                href: "/school/login",
                icon: BookOpenCheck,
                description:
                  "For principals, bursars, teachers, secretaries, librarians, storekeepers, clinic staff, and school admins.",
              },
              {
                title: "My Shule Dashboard",
                href: "/login",
                icon: CalendarCheck,
                description:
                  "For existing My Shule users who need the main sign-in route to open their assigned dashboard quickly.",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group grid gap-4 rounded-[8px] border border-[#dbe5df] bg-white p-5 transition hover:border-[#047857] hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:grid-cols-[auto_1fr_auto] sm:items-center"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-[#ecfdf5] text-[#047857]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block text-lg font-semibold text-[#10201a]">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-[#64748b]">{item.description}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-[#94a3b8] transition group-hover:text-[#047857]" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 pb-14 sm:px-8 lg:px-10 lg:pb-[72px]">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#047857]">
          Frequently asked questions
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-normal text-[#10201a]">
          Why schools choose My Shule
        </h2>
        <div className="mt-8 divide-y divide-[#dbe5df] rounded-[8px] border border-[#dbe5df] bg-white">
          {faqs.map((item) => (
            <article key={item.question} className="p-5 sm:p-6">
              <h3 className="text-base font-semibold leading-6 text-[#10201a]">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-[#475569]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#dbe5df] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-[#10201a]">
              Ready to see My Shule working for your school?
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              Call {contactPhone} or use the login links above for the latest production system.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={`tel:${contactPhone}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-[#047857] px-5 text-sm font-semibold text-white transition hover:bg-[#065f46]"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              Call {contactPhone}
            </a>
            <Link
              href="/school/login"
              className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-[#cbd5e1] px-5 text-sm font-semibold text-[#10201a] transition hover:border-[#047857]"
            >
              School Login
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
