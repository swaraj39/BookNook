import React, { useRef, useMemo, useState } from "react";
import { api } from "../api";
import { Search, Download, Plus, Upload } from "lucide-react";
import { BookCard } from "../components/BookCard";
import { Pagination } from "../components/common/Pagination";
import { EmptyState } from "../components/common/EmptyState";
import { RefreshButton } from "../components/common/RefreshButton";
const handleExportBooks = async () => {
  try {
    await api.exportBooks();
  } catch (error) {
    alert(error.message);
  }
};

export function Catalog({
  page, genres, filters, setFilters, searchTerm, setSearchTerm,
  loading, me, openDetails, setRequestModal, setBookModal, returnBook, importBooks, onRefresh
}) {
  const fileInputRef = useRef(null);
  const isAdmin = me?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [capsule, setCapsule] = useState("all");
  const [page, setPage] = useState(0);

  const capsules = [
    { label: "All", value: "all" },
    { label: "Available", value: "available" },
    { label: "Request Pending", value: "request_pending" },
    { label: "Borrowed by me", value: "borrowed_by_me" },
    { label: "Unavailable", value: "unavailable" },
  ];
  function setCapsule(value) {
    // Only updates local state - the already-fetched book list is what
    // gets re-filtered, no API call happens here.
    setFilters({ ...filters, availability: value, page: 0 });
  }

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
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} /> Import
            </button>
          </>
        )}
        <button className="btn" onClick={() => handleExportBooks()}>Export</button>
        <button className="btn primary" onClick={() => setBookModal({ title: "", author: "", genreId: "", condition: "good", exchangeLocation: "", defaultLoanDays: 14, description: "" })}>
          <Plus size={15} /> Add book
        </button>
      </div>
    </div>
    <div className="catalog-content">
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={17} />
          <input
            className="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search title, author, owner, or description"
          />
        </div>
        <div className="catalog-header-right">
          {isAdmin && (
            <>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button className="btn" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} /> Import
              </button>
            </>
          )}
          <button className="btn" onClick={() => handleExportBooks()}>Export</button>
          <button className="btn primary" onClick={() => setBookModal({ title: "", author: "", genreId: "", condition: "good", exchangeLocation: "", defaultLoanDays: 14, description: "" })}>
            <Plus size={15} /> Add book
          </button>
        </div>
      </div>
      <div className="catalog-content">
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={17} />
            <input
              className="input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search title, author, owner, or description"
            />
          </div>
          <select className="select" value={genreFilter} onChange={(e) => { setGenreFilter(e.target.value); setPage(0); }}>
            <option value="">All genres</option>
            {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
          </select>
          <select className="select" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(0); }}>
            <option value="title">Sort by title</option>
            <option value="newest">Newest first</option>
            <option value="due">Due date</option>
          </select>
        </div>
        <div className="catalog-capsules">
          {capsules.map((c) => (
            <button
              key={c.value}
              className={`catalog-capsule ${capsule === c.value ? "active" : ""}`}
              onClick={() => { setCapsule(c.value); setPage(0); }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="catalog">
          {paged.length === 0 ? (
            <EmptyState
              icon="SearchX"
              title="No books found"
              message="We couldn't find any books matching your current filters. Try adjusting your search or category."
              actionLabel="Clear all filters"
              onAction={clearAllFilters}
            />
          ) : (
            paged.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                me={me}
                openDetails={openDetails}
                setRequestModal={setRequestModal}
                setBookModal={setBookModal}
                returnBook={returnBook}
              />
            ))
          )}
        </div>
      </div>
      {paged.length > 0 && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalElements={filtered.length}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
