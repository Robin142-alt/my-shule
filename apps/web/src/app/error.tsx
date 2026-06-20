'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-4 text-center">
      <div className="flex max-w-md flex-col items-center space-y-6 rounded-xl border bg-card p-8 shadow-sm">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Something went wrong!</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected error occurred. We&apos;ve been notified and are looking into it.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 rounded-md bg-muted p-4 text-left text-xs text-muted-foreground overflow-auto max-h-40">
              <p className="font-mono">{error.message}</p>
            </div>
          )}
        </div>
        <div className="flex w-full flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Button onClick={reset} className="w-full sm:w-1/2">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
          <Button variant="outline" className="w-full sm:w-1/2" onClick={() => window.location.href = '/dashboard'}>
            <Home className="mr-2 h-4 w-4" />
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
