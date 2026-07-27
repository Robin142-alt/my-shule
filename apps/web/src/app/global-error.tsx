'use client';

import "./globals.css";
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4 text-center">
          <div className="flex max-w-md flex-col items-center space-y-6 rounded-xl border border-destructive/20 bg-card p-8 shadow-lg">
            <div className="rounded-full bg-destructive/10 p-4 text-destructive">
              <AlertTriangle className="h-12 w-12" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Critical System Error</h1>
              <p className="text-sm text-muted-foreground">
                A fatal error occurred that crashed the application. We apologize for the inconvenience.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 rounded-md bg-muted p-4 text-left text-xs text-muted-foreground overflow-auto max-h-32">
                  <p className="font-mono break-all">{error.message}</p>
                </div>
              )}
            </div>
            <Button onClick={reset} size="lg" className="w-full">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Reload Application
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
