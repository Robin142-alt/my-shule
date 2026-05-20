import { ImageResponse } from "next/og";

import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const alt = "My Shule school ERP dashboard for Kenyan CBC schools";
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
          background: "#f6f8f7",
          color: "#0f172a",
          padding: "56px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                display: "flex",
                width: 58,
                height: 58,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                background: "#047857",
                color: "white",
                fontSize: 30,
                fontWeight: 800,
              }}
            >
              M
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{SITE_NAME}</div>
              <div style={{ color: "#047857", fontSize: 20, fontWeight: 700 }}>
                School ERP for Kenya
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: "#d1fae5",
              color: "#065f46",
              padding: "12px 20px",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            CBC + M-PESA ready
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            width: "100%",
            alignItems: "center",
            gap: "42px",
          }}
        >
          <div style={{ display: "flex", width: "48%", flexDirection: "column" }}>
            <div style={{ fontSize: 62, lineHeight: 1.05, fontWeight: 800 }}>
              Secure school management software
            </div>
            <div style={{ marginTop: 24, color: "#475569", fontSize: 24, lineHeight: 1.35 }}>
              {SITE_DESCRIPTION}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: "52%",
              flexDirection: "column",
              gap: "16px",
              borderRadius: 24,
              border: "1px solid #dbe5df",
              background: "#ffffff",
              padding: "24px",
              boxShadow: "0 24px 80px rgba(15,23,42,0.14)",
            }}
          >
            <div style={{ display: "flex", gap: "12px" }}>
              {["Fees", "Exams", "Portal"].map((label, index) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    borderRadius: 14,
                    background: index === 0 ? "#ecfdf5" : index === 1 ? "#eff6ff" : "#fff7ed",
                    padding: "18px",
                  }}
                >
                  <div style={{ color: "#64748b", fontSize: 16, fontWeight: 700 }}>{label}</div>
                  <div style={{ marginTop: 14, fontSize: 30, fontWeight: 800 }}>
                    {index === 0 ? "KES" : index === 1 ? "CBC" : "Live"}
                  </div>
                </div>
              ))}
            </div>
            {[
              ["M-PESA fee payments", "Payment tracking"],
              ["CBC report cards", "Ready for review"],
              ["Admissions pipeline", "Application review"],
              ["Inventory and library", "Barcode workflows"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  padding: "16px 18px",
                  fontSize: 20,
                }}
              >
                <span style={{ color: "#0f172a", fontWeight: 700 }}>{label}</span>
                <span style={{ color: "#047857", fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
