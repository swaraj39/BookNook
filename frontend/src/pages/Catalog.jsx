import React, { useRef } from "react";
import { api } from "../api";
import { Search, Download, Plus, Upload } from "lucide-react";
import { BookCard } from "../components/BookCard";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { RefreshButton } from "../components/common/RefreshButton";

export function Catalog({
  page, genres, filters, setFilters, searchTerm, setSearchTerm,
  loading, me, openDetails, setRequestModal, setBookModal, returnBook, importBooks, onRefresh
}) {
  const fileInputRef = useRef(null);
  const isAdmin = me?.role === "ADMIN";

  const capsules = [
    { label: "All", value: "all" },
    { label: "Available", value: "available" },
    { label: "Request Pending", value: "request_pending" },
    { label: "Borrowed by me", value: "borrowed_by_me" },
    { label: "Unavailable", value: "unavailable" },
  ];

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file && importBooks) importBooks(file);
    e.target.value = "";
  }

  return (
    <section className="catalog-page">
      <div className="catalog-header">
        <div className="catalog-header-left">
          <h3>Books on the shelf</h3>
        </div>
        <div className="catalog-header-right">
          {onRefresh && <RefreshButton onRefresh={onRefresh} title="Refresh catalog" />}
          {isAdmin && (
            <>
              <input type="file" accept=".csv,.xlsx,.xls" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />
              <button className="btn" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Import</button>
            </>
          )}
          <button className="btn" onClick={() => api.exportBooks().catch((e) => alert(e.message))}><Download size={15} /> Export</button>
          <button className="btn primary" onClick={() => setBookModal({ title: "", author: "", genreId: "", condition: "good", defaultLoanDays: 14, description: "" })}>
            <Plus size={15} /> Add book
          </button>
        </div>
      </div>
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={17} />
          <input className="input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search title, author, owner, or description" />
        </div>
        <select className="select" value={filters.genreId || ""} onChange={(e) => setFilters({ ...filters, genreId: e.target.value, page: 0 })}>
          <option value="">All genres</option>
          {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
        </select>
        <select className="select" value={filters.sort || "title"} onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 0 })}>
          <option value="title">Sort by title</option>
          <option value="newest">Newest first</option>
        </select>
      </div>
      <div className="catalog-capsules">
        {capsules.map((c) => (
          <button key={c.value} className={`catalog-capsule ${filters.availability === c.value ? "active" : ""}`} onClick={() => setFilters({ ...filters, availability: c.value, page: 0 })}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="catalog">
        {page.content.length === 0 ? (
          <EmptyState icon="SearchX" title="No books found" message="We couldn't find any books matching your current filters." actionLabel="Clear all filters" onAction={() => setFilters({ search: "", genreId: "", sort: "title", availability: "all", page: 0 })} />
        ) : (
          page.content.map((book) => (
            <BookCard key={book.id} book={book} me={me} openDetails={openDetails} setRequestModal={setRequestModal} setBookModal={setBookModal} returnBook={returnBook} />
          ))
        )}
      </div>
      {page.content.length > 0 && page.totalPages > 1 && (
        <Pagination page={page.page} totalPages={page.totalPages} totalElements={page.totalElements} onPageChange={(p) => setFilters({ ...filters, page: p })} />
      )}
    </section>
  );
}
