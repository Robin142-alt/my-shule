import type {
  LibraryBorrowInput,
  LibraryReturnInput,
} from "@/lib/library/library-data";
import { getCsrfToken } from "@/lib/auth/csrf-client";

export interface LibrarySyncResult {
  synced: boolean;
  message: string;
  upstream?: unknown;
}

export function buildLibraryBorrowSyncPayload(input: LibraryBorrowInput) {
  return {
    borrower_id: input.memberId,
    copy_id: input.bookId,
    due_on: input.dueDate,
  };
}

export function buildLibraryReturnSyncPayload(input: LibraryReturnInput) {
  return {
    loan_id: input.borrowingId,
    returned_on: input.returnedAt,
    daily_fine_minor: 1000,
  };
}

async function postLibrarySync(path: string, payload: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-myshule-csrf": await getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as LibrarySyncResult | null;

  if (!response.ok) {
    throw new Error(body?.message ?? "Live library API sync failed.");
  }

  return body ?? {
    synced: false,
    message: "Live library API did not return a sync response.",
  };
}

export function syncLibraryBorrowing(input: LibraryBorrowInput) {
  return postLibrarySync(
    "/api/library/borrowings",
    buildLibraryBorrowSyncPayload(input),
  );
}

export function syncLibraryReturn(input: LibraryReturnInput) {
  return postLibrarySync(
    "/api/library/returns",
    buildLibraryReturnSyncPayload(input),
  );
}
