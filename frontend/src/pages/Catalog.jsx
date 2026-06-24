import React from "react";
import { api } from "../api";
import { Search, Download, Plus } from "lucide-react";
import { BookCard } from "../components/BookCard";
import { Pagination } from "../components/common/Pagination";
import { BookCardSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";

const handleExportBooks = async () => {
  try {
    await api.exportBooks();
  } catch (error) {
    alert(error.message);
  }
};
export function Catalog({
  page, genres, filters, setFilters, searchTerm, setSearchTerm,
  loading, me, openDetails, setRequestModal, setBookModal, returnBook
}) {
  const capsules = [
    { label: "All", value: "all" },
    { label: "Available", value: "available" },
    { label: "Request Pending", value: "request_pending" },
    { label: "Borrowed by me", value: "borrowed_by_me" },
    { label: "Unavailable", value: "unavailable" },
  ];

  function setCapsule(value) {
    setFilters({ ...filters, availability: value, page: 0 });
  }

  return (
  <section className="catalog-page">
    <div className="catalog-header">
      <div className="catalog-header-left">
        <h3>Books on the shelf</h3>
      </div>
      <div className="catalog-header-right">
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
        <select className="select" value={filters.genreId} onChange={(e) => setFilters({ ...filters, genreId: e.target.value, page: 0 })}>
          <option value="">All genres</option>
          {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
        </select>
        <select className="select" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 0 })}>
          <option value="title">Sort by title</option>
          <option value="newest">Newest first</option>
          <option value="due">Due date</option>
        </select>
      </div>

      <div className="catalog-capsules">
        {capsules.map((c) => (
          <button
            key={c.value}
            className={`catalog-capsule ${filters.availability === c.value ? "active" : ""}`}
            onClick={() => setCapsule(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="catalog">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)
        ) : page.content.length === 0 ? (
          <EmptyState
            icon="SearchX"
            title="No books found"
            message="We couldn't find any books matching your current filters. Try adjusting your search or category."
            actionLabel="Clear all filters"
            onAction={() => { setSearchTerm(""); setFilters({ search: "", genreId: "", availability: "all", sort: "title", page: 0 }); }}
          />
        ) : (
          page.content.map((book) => (
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

    {!loading && page.content.length > 0 && page.totalPages > 1 && (
      <Pagination
  page={page.page ?? page.pageNumber ?? 0}
  totalPages={page.totalPages}
  totalElements={page.totalElements}
  onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
/>
    )}
  </section>
);
}