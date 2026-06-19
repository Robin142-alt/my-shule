import { requestDashboardApi } from '@/lib/dashboard/api-client';

// ── Fetchers ──────────────────────────────────────────────────────
export async function fetchLibrarianOverview() {
  return requestDashboardApi('/admin-command/librarian/overview');
}

export async function fetchBooks() {
  return requestDashboardApi('/admin-command/librarian/books');
}

export async function fetchBorrowers() {
  return requestDashboardApi('/admin-command/librarian/borrowers');
}

export async function fetchIssueBook() {
  return requestDashboardApi('/admin-command/librarian/issue-book');
}

export async function fetchReturnBook() {
  return requestDashboardApi('/admin-command/librarian/return-book');
}

export async function fetchOverdueBooks() {
  return requestDashboardApi('/admin-command/librarian/overdue-books');
}

export async function fetchFinesLostDamaged() {
  return requestDashboardApi('/admin-command/librarian/fines-lost-damaged');
}

export async function fetchLibraryReports() {
  return requestDashboardApi('/admin-command/librarian/reports');
}

// ── Mutations ─────────────────────────────────────────────────────
export async function addBook(data: any) {
  return requestDashboardApi('/admin-command/librarian/books', { method: 'POST', body: data });
}

export async function deleteBook(bookId: string) {
  return requestDashboardApi(`/admin-command/librarian/books/${bookId}`, { method: 'DELETE' });
}

export async function issueBookToStudent(data: any) {
  return requestDashboardApi('/admin-command/librarian/issue-book', { method: 'POST', body: data });
}

export async function returnBookFromStudent(data: any) {
  return requestDashboardApi('/admin-command/librarian/return-book', { method: 'POST', body: data });
}

export async function sendOverdueReminder(borrowerId: string) {
  return requestDashboardApi(`/admin-command/librarian/overdue-books/${borrowerId}/remind`, { method: 'POST' });
}

export async function createFine(data: any) {
  return requestDashboardApi('/admin-command/librarian/fines-lost-damaged', { method: 'POST', body: data });
}

export async function waiveFine(fineId: string) {
  return requestDashboardApi(`/admin-command/librarian/fines-lost-damaged/${fineId}/waive`, { method: 'POST' });
}

export async function markFinePaid(fineId: string) {
  return requestDashboardApi(`/admin-command/librarian/fines-lost-damaged/${fineId}/mark-paid`, { method: 'POST' });
}

export async function generateLibraryReport(data: any) {
  return requestDashboardApi('/admin-command/librarian/reports/generate', { method: 'POST', body: data });
}
