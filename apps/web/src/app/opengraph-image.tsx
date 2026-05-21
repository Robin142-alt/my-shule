import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = "MyShule Parent Portal, School Portal, and Dashboard";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f8fafc",
          color: "#0b1f3a",
          padding: "58px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                display: "flex",
                width: 62,
                height: 62,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                background: "#0b1f3a",
                color: "white",
                fontSize: 26,
                fontWeight: 800,
              }}
            >
              MS
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>{SITE_NAME}</div>
              <div style={{ color: "#c2410c", fontSize: 20, fontWeight: 700 }}>
                Parent Portal - School Portal - Dashboard
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: "#fff7ed",
              color: "#c2410c",
              padding: "12px 20px",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            myshule.online
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: "42px" }}>
          <div style={{ display: "flex", width: "48%", flexDirection: "column" }}>
            <div style={{ fontSize: 58, lineHeight: 1.04, fontWeight: 800 }}>
              Structured institutional intelligence
            </div>
            <div style={{ marginTop: 24, color: "#475569", fontSize: 23, lineHeight: 1.35 }}>
              {SITE_DESCRIPTION}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "52%",
              flexDirection: "column",
              gap: "16px",
              borderRadius: 22,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              padding: "24px",
              boxShadow: "0 24px 80px rgba(15,23,42,0.14)",
            }}
          >
            {[
              ["Parent Portal", "Student life visibility"],
              ["School Portal", "Centralized control"],
              ["Dashboard", "Operational insights"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 16,
                  background: "#f8fafc",
                  padding: "22px",
                  fontSize: 22,
                }}
              >
                <span style={{ color: "#0b1f3a", fontWeight: 800 }}>{label}</span>
                <span style={{ color: "#c2410c", fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
