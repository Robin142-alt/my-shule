import type { ReactNode } from "react";
import { MyShuleBrand } from "@/components/brand/myshule-brand";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <div className="auth-container">
        <div className="auth-brand">
          <MyShuleBrand markSize={40} tone="brand" preload />
        </div>
        {children}
      </div>
    </main>
  );
}
