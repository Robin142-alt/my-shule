export const SITE_URL = "https://myshule.online";
export const SITE_NAME = "MyShule";
export const SITE_CONTACT_PHONE = "0769622589";
export const SITE_TITLE = "MyShule - Smart School ERP Platform";
export const SITE_DESCRIPTION =
  "MyShule gives Kenyan schools structured visibility across academic, financial, operational, welfare, communication, governance, security, and intelligence layers.";

export const SEO_KEYWORDS = [
  "MyShule",
  "My Shule",
  "Parent Portal",
  "School Portal",
  "Dashboard",
  "school ERP Kenya",
  "Kenyan school management system",
  "school operational visibility",
  "school administration software",
  "school fee management Kenya",
  "parent portal Kenya",
  "principal dashboard",
  "multi tenant school ERP",
];

export type PublicSeoRoute = {
  path: "/" | "/parent-portal" | "/school-portal" | "/dashboard" | "/login";
  label: "MyShule" | "Parent Portal" | "School Portal" | "Dashboard" | "Login";
  title: string;
  description: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly";
  navAnchor: string;
  sitelinkPriority: boolean;
};

export const publicSeoRoutes: PublicSeoRoute[] = [
  {
    path: "/",
    label: "MyShule",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    priority: 1,
    changeFrequency: "daily",
    navAnchor: "MyShule",
    sitelinkPriority: false,
  },
  {
    path: "/parent-portal",
    label: "Parent Portal",
    title: "Parent Portal - MyShule",
    description:
      "Access student results, attendance, communication, and academic information through the MyShule Parent Portal.",
    priority: 0.95,
    changeFrequency: "daily",
    navAnchor: "Parent Portal",
    sitelinkPriority: true,
  },
  {
    path: "/school-portal",
    label: "School Portal",
    title: "School Portal - MyShule",
    description:
      "Manage school operations, staff, students, and analytics using the MyShule School Portal.",
    priority: 0.95,
    changeFrequency: "daily",
    navAnchor: "School Portal",
    sitelinkPriority: true,
  },
  {
    path: "/dashboard",
    label: "Dashboard",
    title: "Dashboard - MyShule",
    description:
      "View school insights, activity, reports, and operational data from the MyShule Dashboard.",
    priority: 0.92,
    changeFrequency: "daily",
    navAnchor: "Dashboard",
    sitelinkPriority: true,
  },
  {
    path: "/login",
    label: "Login",
    title: "Login - MyShule",
    description:
      "Login to MyShule to access the Parent Portal, School Portal, and dashboard workspaces.",
    priority: 0.85,
    changeFrequency: "weekly",
    navAnchor: "Login",
    sitelinkPriority: false,
  },
];

export const primarySitelinkRoutes = publicSeoRoutes.filter(
  (route) => route.sitelinkPriority,
);

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

export function getPublicSeoRoute(path: PublicSeoRoute["path"]) {
  return publicSeoRoutes.find((route) => route.path === path) ?? null;
}
