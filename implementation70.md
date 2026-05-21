# Implementation 70 MyShule SEO Sitelink Architecture and Visibility Narrative Frontend Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` when parallel implementation is available, or `superpowers:executing-plans` when executing sequentially. Steps use checkbox (`- [ ]`) syntax for progress tracking.

**Goal:** Build a production-grade, SEO-optimized MyShule frontend architecture that helps Google understand the most important public pages: Parent Portal, School Portal, and Dashboard. The frontend must tell a conversion-focused operational visibility story for Kenyan schools without becoming a feature dump.

**Architecture:** Next.js App Router public pages, shared SEO metadata registry, sitemap and robots generation, schema.org structured data, semantic public navigation, reusable Tailwind marketing components, tenant-aware route conventions, and responsive SaaS landing pages for public entry, parent access, school access, dashboard entry, and login.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components where possible, TailwindCSS, Metadata API, dynamic sitemap generation, JSON-LD structured data, Vercel production deployment.

**Primary Domain:** `https://myshule.online`

**Primary Contact:** `0769622589`

**Implementation Status:** Implemented and verified locally. The SEO route registry, public pages, crawl files, structured data helpers, tenant route helpers, access hub, and responsive marketing component system have been added.

---

## 1. Core SEO Objective

- [ ] Make Google understand that the most important MyShule pages are:
  - Parent Portal
  - School Portal
  - Dashboard
- [ ] Optimize for:
  - Google indexing
  - SEO trust
  - sitelinks generation signals
  - brand authority
  - fast crawling
  - scalable multi-tenant architecture
- [ ] Use a crawlable, stable public hierarchy:
  - `/`
  - `/parent-portal`
  - `/school-portal`
  - `/dashboard`
  - `/login`
- [ ] Ensure all public navigation and footer links reinforce the same hierarchy.
- [ ] Use consistent anchor text:
  - `Parent Portal`
  - `School Portal`
  - `Dashboard`
  - `Login`
  - `Login as Parent`
  - `Login to Dashboard`
  - `Request School Access`
  - `Request Demo`
- [ ] Acknowledge that Google sitelinks cannot be forced. The implementation must create strong signals for Google to eventually choose Parent Portal, School Portal, and Dashboard as sitelinks.

## 2. Conversion Objective

- [ ] Do not build a feature showcase.
- [ ] Build a narrative around operational visibility.
- [ ] Core message:
  - Schools do not lose control because they lack tools.
  - They lose control when reporting is delayed, records are fragmented, and accountability is hard to see.
- [ ] The UI should make school leaders feel:
  - `I cannot run a school with blind spots.`
  - `I need one system that shows everything clearly.`
  - `Without this, I lose control of operations.`
- [ ] Do not use direct fear language in visible copy.
- [ ] Prefer these terms:
  - `lack of visibility`
  - `delayed accountability`
  - `untracked processes`
  - `fragmented reporting`
  - `operational blind spots`
  - `structured visibility`
  - `institutional intelligence`
  - `centralized control`
  - `accountability`

## 3. Design System

- [ ] Use a modern SaaS, institutional trust visual system.
- [ ] Color system:
  - Primary: deep navy blue
  - Background: white and soft gray `#F8FAFC`
  - Accent: controlled orange or red only for highlights and CTAs
  - Secondary support: restrained slate and cool gray tones
- [ ] Typography:
  - Inter if already installed or available through existing font setup.
  - Otherwise use the app's existing system sans or Geist stack without adding unnecessary dependencies.
- [ ] Layout:
  - mobile-first
  - grid-based
  - generous whitespace
  - high clarity
  - large touch targets
  - no text overflow on mobile
- [ ] UI shape:
  - cards
  - subtle shadows
  - `rounded-xl` where consistent with the repo
  - strong visual hierarchy
  - clean hero sections
  - clear CTA groups
- [ ] Do not use decorative blobs, childish school graphics, generic ERP tables as marketing visuals, or a feature grid that reads like a module dump.

## 4. Target Public Routes

- [ ] `/` must become the public landing page.
  - Purpose: brand authority and entry point.
  - Primary concept: `The central nervous system of a modern school`.
  - Primary headline: `From manual school operations to structured institutional intelligence`
- [ ] `/parent-portal` must become the parent login landing page.
  - Purpose: create dependency on visibility into student life.
  - Primary headline: `Know what happens at school - beyond the classroom`
  - Primary CTA: `Login as Parent`
- [ ] `/school-portal` must become the school admin login landing page.
  - Purpose: create dependency on centralized control and structured reporting.
  - Primary headline: `Every decision in your school should be backed by structured data`
  - Primary CTA: `Login to Dashboard`
- [ ] `/dashboard` must become a public SEO dashboard page.
  - Purpose: explain the MyShule dashboard as the place where institutional intelligence becomes visible.
  - Must not break authenticated `/dashboard/[role]` routes.
- [ ] `/login` must remain the access hub.
  - Purpose: route users into parent, school, and dashboard login flows.

## 5. SEO Metadata Requirements

- [ ] Create or extend a single SEO route registry.
- [ ] Required page titles:
  - `/`: `MyShule - Smart School ERP Platform`
  - `/parent-portal`: `Parent Portal - MyShule`
  - `/school-portal`: `School Portal - MyShule`
  - `/dashboard`: `Dashboard - MyShule`
  - `/login`: `Login - MyShule`
- [ ] Required descriptions:
  - Parent Portal: `Access student results, attendance, communication, and academic information through the MyShule Parent Portal.`
  - School Portal: `Manage school operations, staff, students, and analytics using the MyShule School Portal.`
  - Dashboard: `View school insights, activity, reports, and operational data from the MyShule Dashboard.`
- [ ] Add a homepage description focused on visibility:
  - `MyShule gives Kenyan schools structured visibility across academic, financial, operational, welfare, communication, governance, security, and intelligence layers.`
- [ ] Ensure every public route has:
  - unique title
  - unique description
  - canonical URL
  - OpenGraph title and description
  - OpenGraph URL
  - Twitter card metadata
  - robots index and follow metadata
- [ ] Use `metadataBase` with `https://myshule.online`.
- [ ] Keep metadata server-rendered through the Next.js Metadata API.

## 6. Crawl Files

- [ ] Update `apps/web/src/app/sitemap.ts`.
- [ ] Include the highest-priority URLs:
  - `https://myshule.online/`
  - `https://myshule.online/parent-portal`
  - `https://myshule.online/school-portal`
  - `https://myshule.online/dashboard`
  - `https://myshule.online/login`
- [ ] Include compatibility login URLs if they remain public:
  - `https://myshule.online/parent/login`
  - `https://myshule.online/school/login`
- [ ] Give Parent Portal, School Portal, and Dashboard high priority.
- [ ] Update `apps/web/src/app/robots.ts`.
- [ ] Allow:
  - `/`
  - `/parent-portal`
  - `/school-portal`
  - `/dashboard`
  - `/login`
  - `/parent/login`
  - `/school/login`
- [ ] Disallow:
  - `/api/`
  - `/internal/`
  - private dashboard role paths that require session context
  - password reset and MFA routes where indexing adds no value
- [ ] Add sitemap reference:
  - `https://myshule.online/sitemap.xml`

## 7. Structured Data

- [ ] Add JSON-LD helpers under `apps/web/src/lib/seo/structured-data.ts`.
- [ ] Add a reusable renderer:
  - `apps/web/src/components/marketing/seo-json-ld.tsx`
- [ ] Add Organization schema:
  - name: `MyShule`
  - url: `https://myshule.online`
  - telephone: `0769622589`
- [ ] Add WebSite schema for the root domain.
- [ ] Add SiteNavigationElement schema with:
  - Parent Portal -> `/parent-portal`
  - School Portal -> `/school-portal`
  - Dashboard -> `/dashboard`
  - Login -> `/login`
- [ ] Add BreadcrumbList schema for:
  - Parent Portal
  - School Portal
  - Dashboard
  - Login
- [ ] Add SoftwareApplication schema only with accurate claims.
- [ ] Escape JSON safely before injecting into a script tag.

## 8. Multi-Tenant SEO Architecture

- [ ] Support both tenant access models:
  - `schoolname.myshule.online`
  - `myshule.online/school/schoolname`
- [ ] Use the existing routing constraints before adding new dynamic pages.
- [ ] If `/school/[role]` already exists for authenticated school role pages, do not create a conflicting `/school/[schoolSlug]` route.
- [ ] Instead, update the existing school dynamic route to distinguish:
  - reserved role slugs: principal, bursar, teacher, admin, secretary, librarian, storekeeper, admissions
  - tenant school slugs: verified school names that are not reserved
- [ ] Create tenant route helpers:
  - `isReservedSchoolRouteSlug`
  - `getTenantCanonicalUrl`
  - `getSubdomainTenant`
  - `normalizeTenantSlug`
- [ ] Add canonical rules:
  - Choose one canonical form per verified tenant.
  - Use the path form if subdomain verification is not ready.
  - Use the subdomain form only once Vercel domain routing is confirmed.
- [ ] Only include verified public tenant pages in sitemap.

## 9. Component Architecture

- [ ] Create a modular marketing component system under `apps/web/src/components/marketing/`.
- [ ] Required reusable components:
  - `HeroSection`
  - `CTAButton`
  - `InfoCard`
  - `ModuleGrid`
  - `VisibilityGapCards`
  - `BeforeAfterComparison`
  - `TrustBadges`
  - `ContactStrip`
  - `PublicSiteShell`
  - `SeoJsonLd`
- [ ] Map the user's conceptual React structure to Next.js App Router:

```tsx
// Conceptual composition
<App>
  <PublicLandingPage />
  <ParentLoginPage />
  <SchoolAdminLoginPage />
</App>
```

- [ ] Implement as route pages:
  - `apps/web/src/app/page.tsx`
  - `apps/web/src/app/parent-portal/page.tsx`
  - `apps/web/src/app/school-portal/page.tsx`
  - `apps/web/src/app/dashboard/page.tsx`
  - `apps/web/src/app/login/page.tsx`
- [ ] Keep components reusable and route pages thin.

## 10. Public Landing Page

- [ ] Implement the public landing page at `apps/web/src/app/page.tsx`.
- [ ] Hero headline:
  - `From manual school operations to structured institutional intelligence`
- [ ] Hero subtext:
  - `Schools operate best when every process is visible, trackable, and accountable across departments.`
  - `MyShule brings clarity across academic, financial, and operational systems.`
- [ ] CTAs:
  - `Get Started`
  - `Talk to Us`
  - show `0769622589`
- [ ] Add Before vs After section.
- [ ] Before:
  - Fragmented records
  - Delayed reporting
  - Untracked inventory and assets
  - Poor communication traceability
  - Manual fee tracking errors
- [ ] After:
  - Unified school dashboard
  - Real-time reporting
  - Full audit trails
  - Structured communication logs
  - Controlled financial visibility
- [ ] Add System Intelligence Layers without feature dumping.
- [ ] Academic Layer:
  - Student Management
  - Admissions
  - Academic Structure
  - Exams and Results
  - CBT Exams
  - eLearning and LMS
- [ ] Financial Layer:
  - Fee Management
  - Procurement
  - Reports
- [ ] Operations Layer:
  - Timetable
  - Teacher Attendance
  - Transport
  - Library
  - Store and Inventory
  - Asset Tracking
- [ ] Welfare Layer:
  - Clinic and Health
  - Discipline
  - Hostel and Boarding
- [ ] Communication Layer:
  - Communication and SMS
  - Parent Portal
- [ ] Governance Layer:
  - Staff and HR
  - Administrative Leadership
  - Principal Dashboard
- [ ] Security Layer:
  - Visitor Management
- [ ] Intelligence Layer:
  - AI Insights
- [ ] Trust section:
  - Built for Kenyan schools
  - Designed for accountability and transparency
  - Multi-tenant scalable architecture
  - Suitable for public and private institutions
- [ ] Final CTA headline:
  - `Bring clarity to every layer of your school`
- [ ] Final CTA contact:
  - `0769622589`
- [ ] Final CTA buttons:
  - `Get Started`
  - `Talk to Us`
  - `Request Demo`
- [ ] Link prominently to:
  - `/parent-portal`
  - `/school-portal`
  - `/dashboard`
  - `/login`

## 11. Parent Login Landing Page

- [ ] Create `apps/web/src/app/parent-portal/page.tsx`.
- [ ] Hero headline:
  - `Know what happens at school - beyond the classroom`
- [ ] Hero subtext:
  - `Parents should not rely on delayed updates or informal communication.`
  - `This system brings structured visibility into attendance, academics, discipline, and school communication.`
- [ ] CTAs:
  - `Login as Parent` -> `/parent/login`
  - `Request School Access` -> contact or `/school-portal`
- [ ] Add Visibility Gaps section titled:
  - `Visibility gaps parents live with`
- [ ] Include:
  - Delayed academic updates after exams are already completed
  - Missing attendance or absence context
  - Lack of structured clinic or health feedback
  - Fragmented communication from school staff
- [ ] Add What Becomes Visible section titled:
  - `What becomes visible`
- [ ] Include:
  - Attendance tracking history
  - Academic performance per term
  - Discipline records and behavior notes
  - Clinic and health logs if enabled by school
  - Official school announcements
- [ ] Add contact CTA block:
  - `0769622589`
  - `Login as Parent`
  - `Request Access`
- [ ] Link to:
  - `/`
  - `/school-portal`
  - `/dashboard`
  - `/login`

## 12. School Admin Login Landing Page

- [ ] Create `apps/web/src/app/school-portal/page.tsx`.
- [ ] Hero headline:
  - `Every decision in your school should be backed by structured data`
- [ ] Hero subtext:
  - `Without centralized systems, school operations depend on delayed reporting, manual registers, and fragmented departmental updates.`
- [ ] Add Operational Blind Spots section.
- [ ] Financial Control:
  - Fee Management -> delayed reconciliation, incomplete payment visibility
  - Procurement -> untracked approvals and spending flow
- [ ] Academic Systems:
  - Student Management -> fragmented student lifecycle records
  - Admissions -> scattered intake and enrollment data
  - Academic Structure -> inconsistent curriculum mapping
  - Exams and Results -> delayed grading and performance tracking
- [ ] Discipline and Welfare:
  - Discipline -> incomplete behavior history tracking
  - Clinic and Health -> unstructured medical logs
- [ ] Operations:
  - Timetable -> conflicts and manual scheduling errors
  - Teacher Attendance -> manual errors and delayed reporting
  - Transport -> unverified student movement logs
- [ ] Resources:
  - Store and Inventory -> untracked items and stock gaps
  - Library -> missing book return tracking
  - Asset Tracking -> unclear asset lifecycle visibility
  - Laboratory Management -> untracked lab usage and materials
- [ ] Boarding:
  - Hostel and Boarding -> incomplete student accommodation records
- [ ] Communication:
  - Communication and SMS -> fragmented messaging history
  - Parent Portal -> delayed updates and inconsistent visibility
- [ ] Governance:
  - Staff and HR -> scattered staff records
  - Reports -> manually compiled and delayed insights
  - Administrative Leadership -> siloed departmental decisions
- [ ] Executive Control:
  - Principal Dashboard -> no unified school-wide visibility
- [ ] Digital Learning:
  - CBT Exams -> unmonitored exam sessions
  - eLearning and LMS -> fragmented learning tracking
- [ ] Intelligence Layer:
  - AI Insights -> underutilized or missing operational predictions
- [ ] Security and Access:
  - Visitor Management -> manual logs, incomplete entry tracking
- [ ] Add Control Layer section headline:
  - `From fragmented reporting to unified school visibility`
- [ ] Include:
  - Real-time dashboards per department
  - Centralized audit trail across all modules
  - Structured accountability per role
  - Cross-department visibility
- [ ] Add CTA:
  - `0769622589`
  - `Login to Dashboard` -> `/school/login`
  - `Request Demo`
- [ ] Link to:
  - `/`
  - `/parent-portal`
  - `/dashboard`
  - `/login`

## 13. Public Dashboard Page

- [ ] Create or update `apps/web/src/app/dashboard/page.tsx`.
- [ ] Ensure this public route does not interfere with authenticated `/dashboard/[role]`.
- [ ] Headline:
  - `Structured visibility across every school decision`
- [ ] Explain the dashboard as the unified view of:
  - financial visibility
  - academic progress
  - operational reporting
  - communication traceability
  - audit trails
  - leadership accountability
- [ ] Include page links:
  - `Parent Portal` -> `/parent-portal`
  - `School Portal` -> `/school-portal`
  - `Login` -> `/login`
- [ ] Add a CTA:
  - `Login to Dashboard` -> `/login`
  - `Talk to Us` -> phone contact

## 14. Login Hub Page

- [ ] Update `apps/web/src/app/login/page.tsx`.
- [ ] Keep existing session-aware redirect behavior if present.
- [ ] Show three access choices:
  - Parent Portal -> `/parent/login`
  - School Portal -> `/school/login`
  - Dashboard -> current login flow
- [ ] Add internal links to:
  - `/parent-portal`
  - `/school-portal`
  - `/dashboard`
- [ ] Add contact:
  - `0769622589`
- [ ] Keep it crawlable with metadata title:
  - `Login - MyShule`

## 15. Header and Footer Linking

- [ ] Add a shared public shell component:
  - `apps/web/src/components/marketing/public-site-shell.tsx`
- [ ] Header must include:
  - MyShule logo text
  - Parent Portal
  - School Portal
  - Dashboard
  - Login
  - contact `0769622589`
- [ ] Footer must include:
  - Parent Portal
  - School Portal
  - Dashboard
  - Login
  - Login as Parent
  - Login to Dashboard
  - Request Demo
  - `0769622589`
- [ ] Use the same labels across all pages to strengthen sitelink signals.
- [ ] Ensure links are plain anchor or Next `Link` components, not hidden behind JavaScript-only interactions.

## 16. Files To Create

- [ ] `apps/web/src/lib/seo/public-routes.ts`
- [ ] `apps/web/src/lib/seo/metadata.ts`
- [ ] `apps/web/src/lib/seo/structured-data.ts`
- [ ] `apps/web/src/lib/seo/tenant-routes.ts`
- [ ] `apps/web/src/components/marketing/seo-json-ld.tsx`
- [ ] `apps/web/src/components/marketing/public-site-shell.tsx`
- [ ] `apps/web/src/components/marketing/hero-section.tsx`
- [ ] `apps/web/src/components/marketing/cta-button.tsx`
- [ ] `apps/web/src/components/marketing/info-card.tsx`
- [ ] `apps/web/src/components/marketing/module-grid.tsx`
- [ ] `apps/web/src/components/marketing/visibility-gap-cards.tsx`
- [ ] `apps/web/src/components/marketing/before-after-comparison.tsx`
- [ ] `apps/web/src/components/marketing/trust-badges.tsx`
- [ ] `apps/web/src/components/marketing/contact-strip.tsx`
- [ ] `apps/web/src/app/parent-portal/page.tsx`
- [ ] `apps/web/src/app/school-portal/page.tsx`
- [ ] `apps/web/src/app/dashboard/page.tsx`

## 17. Files To Modify

- [ ] `apps/web/src/app/page.tsx`
- [ ] `apps/web/src/app/layout.tsx`
- [ ] `apps/web/src/app/login/page.tsx`
- [ ] `apps/web/src/app/sitemap.ts`
- [ ] `apps/web/src/app/robots.ts`
- [ ] `apps/web/src/app/opengraph-image.tsx`
- [ ] `apps/web/src/app/manifest.ts`
- [ ] `apps/web/src/lib/seo.ts`
- [ ] `apps/web/src/proxy.ts`
- [ ] `apps/web/src/lib/auth/experience-routing.ts`
- [ ] `apps/web/src/app/school/[role]/page.tsx`
- [ ] `apps/web/src/app/school/[role]/[section]/page.tsx`

## 18. Implementation Order

- [ ] Phase 1: Create the SEO route registry and metadata helpers.
- [ ] Phase 2: Update sitemap, robots, manifest, OpenGraph image, and root layout metadata.
- [ ] Phase 3: Build the shared marketing component system.
- [ ] Phase 4: Build the public landing page.
- [ ] Phase 5: Build the parent portal landing page.
- [ ] Phase 6: Build the school portal landing page.
- [ ] Phase 7: Build the public dashboard page.
- [ ] Phase 8: Update the login hub page.
- [ ] Phase 9: Add tenant route helpers and route discrimination.
- [ ] Phase 10: Add tests and verification.
- [ ] Phase 11: Run production build and deploy.

## 19. Testing Plan

- [ ] Add SEO route registry tests under `apps/web/tests/design/seo-architecture.test.ts`.
- [ ] Test that the core public routes exist in the registry:
  - `/`
  - `/parent-portal`
  - `/school-portal`
  - `/dashboard`
  - `/login`
- [ ] Test that Parent Portal, School Portal, and Dashboard have unique titles and descriptions.
- [ ] Test that public navigation schema includes Parent Portal, School Portal, and Dashboard.
- [ ] Test tenant reserved slugs so school role pages are not misread as public tenant pages.
- [ ] Test `sitemap()` includes core URLs.
- [ ] Test `robots()` allows the important public routes.

## 20. Verification Commands

- [ ] Run focused tests:

```powershell
npm.cmd --prefix apps/web run test:design -- seo-architecture
```

- [ ] Run lint:

```powershell
npm.cmd --prefix apps/web run lint
```

- [ ] Run production build:

```powershell
npm.cmd --prefix apps/web run build
```

- [ ] Start local server:

```powershell
npm.cmd --prefix apps/web run dev -- --hostname 127.0.0.1 --port 3101
```

- [ ] Verify local routes:
  - `http://127.0.0.1:3101/`
  - `http://127.0.0.1:3101/parent-portal`
  - `http://127.0.0.1:3101/school-portal`
  - `http://127.0.0.1:3101/dashboard`
  - `http://127.0.0.1:3101/login`
- [ ] Verify crawl files:

```powershell
curl.exe -s http://127.0.0.1:3101/sitemap.xml
curl.exe -s http://127.0.0.1:3101/robots.txt
```

- [ ] After deployment, verify production:

```powershell
curl.exe -I https://myshule.online/
curl.exe -I https://myshule.online/parent-portal
curl.exe -I https://myshule.online/school-portal
curl.exe -I https://myshule.online/dashboard
curl.exe -I https://myshule.online/login
curl.exe -s https://myshule.online/sitemap.xml
curl.exe -s https://myshule.online/robots.txt
```

## 21. Lighthouse and SEO Acceptance

- [ ] Lighthouse SEO score should target 100.
- [ ] Each public page must have exactly one visible `h1`.
- [ ] Each public page must have descriptive internal links to the other priority pages.
- [ ] Parent Portal, School Portal, and Dashboard must appear in:
  - header navigation
  - homepage hero or priority link section
  - footer navigation
  - sitemap
  - SiteNavigationElement schema
- [ ] Metadata must be server-rendered.
- [ ] JSON-LD must be valid JSON.
- [ ] Mobile view must have no horizontal overflow.
- [ ] CTA buttons must be tappable on mobile.
- [ ] Copy must avoid direct fear language and use the visibility vocabulary.

## 22. Final Acceptance Criteria

- [ ] Google can crawl `/`, `/parent-portal`, `/school-portal`, `/dashboard`, and `/login`.
- [ ] `https://myshule.online/sitemap.xml` lists all five important public pages.
- [ ] `https://myshule.online/robots.txt` allows indexing of the five important public pages.
- [ ] The homepage visually emphasizes Parent Portal, School Portal, and Dashboard.
- [ ] Parent Portal page explains parent visibility without sounding like a generic login form.
- [ ] School Portal page explains centralized school control without dumping modules.
- [ ] Dashboard page explains school-wide visibility and supports sitelink importance.
- [ ] All pages include `0769622589`.
- [ ] The frontend is responsive, production-grade, and conversion-focused.
- [ ] The architecture is ready for multi-tenant scaling.
- [ ] No existing authenticated dashboard route is broken.
