import Link from "next/link";
import { ArrowRight, Building2, School, Smartphone } from "lucide-react";

import { Card } from "@/components/ui/card";

const experiences = [
  {
    id: "superadmin",
    title: "Platform owner dashboard",
    description: "Run the SaaS business, monitor tenant health, and manage infrastructure from a Stripe-style control plane.",
    href: "/superadmin",
    icon: Building2,
  },
  {
    id: "school",
    title: "School dashboard",
    description: "A calm, trustworthy workspace for principals, bursars, teachers, and school admins.",
    href: "/school/principal",
    icon: School,
  },
  {
    id: "portal",
    title: "Parent & student portal",
    description: "Mobile-first family access for fees, attendance, academics, downloads, and messages.",
    href: "/portal/parent",
    icon: Smartphone,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-8">
        <Card className="p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Multi-tenant School ERP
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-foreground">
            One premium platform. Three distinct products.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            ShuleHub separates platform operations, school management, and family access into clear experiences built on one design system and one multi-tenant architecture.
          </p>
        </Card>

        <section className="grid gap-6 lg:grid-cols-3">
          {experiences.map((experience) => {
            const Icon = experience.icon;

            return (
              <Link key={experience.id} href={experience.href}>
                <Card className="h-full p-6 transition duration-150 hover:-translate-y-0.5 hover:bg-surface-muted">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-2xl font-semibold text-foreground">
                    {experience.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {experience.description}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    Open experience
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
