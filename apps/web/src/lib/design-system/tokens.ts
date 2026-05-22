export const implementation400BrandTokens = {
  colors: {
    navy: "#071D49",
    orange: "#FF7A1A",
    lightgray: "#F3F4F6",
    darkblue: "#0F2345",
    white: "#FFFFFF",
  },
  usage: {
    navy: ["sidebar", "top-navigation", "system-headers", "executive-analytics"],
    orange: ["primary-actions", "active-states", "notification-badges", "kpi-highlights"],
    lightgray: ["workspace-background", "form-zones", "table-areas"],
    darkblue: ["body-text", "headings", "labels", "statistics"],
    white: ["cards", "dialogs", "inputs", "tables"],
  },
  radius: {
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "10px",
  },
  motion: {
    fast: "150ms",
    standard: "200ms",
    smooth: "300ms",
  },
} as const;

export type Implementation400BrandColor = keyof typeof implementation400BrandTokens.colors;
