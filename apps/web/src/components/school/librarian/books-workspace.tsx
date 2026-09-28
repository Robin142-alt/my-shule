"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { BookOpen, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { addBook, deleteBook } from "./api-client";

type BookRecord = {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  copies_total: number;
  copies_available: number;
  shelf_location: string;
  status: string;
};

type BooksData = {
  metrics: {
    total_titles: number;
    total_copies: number;
    available_copies: number;
    categories: number;
  };
  books: BookRecord[];
};

export function BooksWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<BooksData>('/admin-command/librarian/books');
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBook, setNewBook] = useState({ title: "", author: "", isbn: "", category: "", copies_total: 1, shelf_location: "" });

  const books = data?.books || [];
  const filtered = books.filter((b) =>
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.isbn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusTone = (st: string): Tone => {
    if (st === "Available") return "success";
    if (st === "All Issued") return "warning";
    if (st === "Low Stock") return "danger";
    return "neutral";
  };

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.author) {
      toast.error("Title and Author are required.");
      return;
    }
    setIsAdding(true);
    try {
      await addBook(newBook);
      toast.success(`"${newBook.title}" added to the catalogue.`);
      setNewBook({ title: "", author: "", isbn: "", category: "", copies_total: 1, shelf_location: "" });
      setShowAddForm(false);
      refetch();
    } catch {
      toast.error("Failed to add book. Please try again.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (book: BookRecord) => {
    if (!confirm(`Remove "${book.title}" from the catalogue?`)) return;
    try {
      await deleteBook(book.id);
      toast.success(`"${book.title}" removed.`);
      refetch();
    } catch {
      toast.error("Failed to remove book.");
    }
  };

  return (
    <Panel
      title="Book Catalogue"
      description="Manage the school library book inventory."
      icon={BookOpen}
      actions={
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition"
        >
          <Plus className="w-4 h-4" /> Add Book
        </button>
      }
    >
      {/* Metrics */}
      <div className="app-metric-grid grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Titles</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_titles ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Copies</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_copies ?? 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Available Copies</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.available_copies ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Categories</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.categories ?? 0}</div>
        </div>
      </div>

      {/* Add book form */}
      {showAddForm && (
        <div className="mb-6 rounded-xl border border-info-border bg-info-soft p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Add New Book</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Book Title *" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Author *" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="ISBN" value={newBook.isbn} onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Category (e.g. Fiction, Science)" value={newBook.category} onChange={(e) => setNewBook({ ...newBook, category: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" placeholder="Shelf Location" value={newBook.shelf_location} onChange={(e) => setNewBook({ ...newBook, shelf_location: e.target.value })} />
            <input className="rounded-lg border border-border px-3 py-2 text-sm" type="number" min={1} placeholder="Number of Copies" value={newBook.copies_total} onChange={(e) => setNewBook({ ...newBook, copies_total: parseInt(e.target.value) || 1 })} />
          </div>
          <div className="mt-3 flex gap-2">
            <button disabled={isAdding} onClick={handleAddBook} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">{isAdding ? "Adding..." : "Save Book"}</button>
            <button onClick={() => setShowAddForm(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-muted hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm placeholder:text-muted"
          placeholder="Search books by title, author, ISBN, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Title</th>
              <th className="px-4 py-3 font-bold border-b border-border">Author</th>
              <th className="px-4 py-3 font-bold border-b border-border">ISBN</th>
              <th className="px-4 py-3 font-bold border-b border-border">Category</th>
              <th className="px-4 py-3 font-bold border-b border-border">Shelf</th>
              <th className="px-4 py-3 font-bold border-b border-border">Copies</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">Loading book catalogue...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">{searchTerm ? "No books match your search." : "No books in the catalogue yet. Click \"Add Book\" to add the first book."}</td></tr>
            ) : (
              filtered.map((book) => (
                <tr key={book.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{book.title}</td>
                  <td className="px-4 py-3 text-muted">{book.author}</td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{book.isbn || "—"}</td>
                  <td className="px-4 py-3 text-muted">{book.category}</td>
                  <td className="px-4 py-3 text-muted">{book.shelf_location || "—"}</td>
                  <td className="px-4 py-3 text-foreground font-semibold">{book.copies_available}/{book.copies_total}</td>
                  <td className="px-4 py-3"><StatusChip label={book.status} tone={getStatusTone(book.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(book)} className="text-rose-600 hover:text-danger p-1" title="Remove book"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
