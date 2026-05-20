export const SITE_URL = "https://myshule.online";
export const SITE_NAME = "My Shule";
export const SITE_TITLE = "My Shule | School ERP Software for Kenyan CBC Schools";
export const SITE_DESCRIPTION =
  "My Shule is a secure school ERP for Kenyan CBC schools, with parent login, school login, M-PESA fee payments, SMS fee reminders, report cards, discipline, clinic records, and principal dashboards.";

export const SEO_KEYWORDS = [
  "school ERP Kenya",
  "Kenyan school management system",
  "CBC school software",
  "M-PESA school fees",
  "SMS fee reminders Kenya",
  "school report cards software",
  "parent portal Kenya",
  "parent login My Shule",
  "school login My Shule",
  "My Shule dashboard",
  "school finance management",
  "multi tenant school ERP",
  "My Shule",
];

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
