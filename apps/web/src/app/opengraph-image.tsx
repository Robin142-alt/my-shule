import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = "MyShule Parent Portal, School Portal, and Dashboard";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const logoData = await readFile(
    join(process.cwd(), "public", "brand", "myshule-mark-512.png"),
    "base64",
  );
  const logoSrc = `data:image/png;base64,${logoData}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#071D49",
          color: "#FFFFFF",
          padding: "58px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <img
              src={logoSrc}
              alt=""
              width={68}
              height={68}
              style={{
                borderRadius: 18,
                background: "#FFFFFF",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 800 }}>{SITE_NAME}</div>
              <div style={{ color: "#FFB072", fontSize: 20, fontWeight: 700 }}>
                Parent Portal - School Portal - Dashboard
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: "rgba(255,122,26,0.18)",
              color: "#FFB072",
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
            <div style={{ marginTop: 24, color: "#D9E1EC", fontSize: 23, lineHeight: 1.35 }}>
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
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#0F2345",
              padding: "24px",
              boxShadow: "0 24px 80px rgba(2,6,23,0.32)",
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
                  background: "rgba(255,255,255,0.06)",
                  padding: "22px",
                  fontSize: 22,
                }}
              >
                <span style={{ color: "#FFFFFF", fontWeight: 800 }}>{label}</span>
                <span style={{ color: "#FFB072", fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
