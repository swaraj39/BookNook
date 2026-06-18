import React from "react";
import { Search } from "lucide-react";
import { BookCard } from "../components/BookCard";
import { Pagination } from "../components/common/Pagination";
import { BookCardSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";

export function Catalog({ 
  page, genres, filters, setFilters, searchTerm, setSearchTerm, 
  loading, me, openDetails, setRequestModal, setBookModal, returnBook 
}) {
  return (
    <section>
      <div className="topbar">
        <div className="page-title">
          <div className="page-kicker">Discovery</div>
          <h2>Browse the Library</h2>
          <p>Find your next read from our shared community collection.</p>
        </div>
      </div>

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
        <select className="select" value={filters.availability} onChange={(e) => setFilters({ ...filters, availability: e.target.value, page: 0 })}>
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="borrowed">Borrowed</option>
          <option value="request_pending">Pending request</option>
        </select>
        <select className="select" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value, page: 0 })}>
          <option value="title">Sort by title</option>
          <option value="newest">Newest first</option>
          <option value="due">Due date</option>
        </select>
      </div>

      <div className="grid catalog">
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

      {!loading && page.content.length > 0 && (
        <Pagination 
          page={page.page} 
          totalPages={page.totalPages} 
          totalElements={page.totalElements} 
          onPageChange={(p) => setFilters({ ...filters, page: p })} 
        />
      )}
    </section>
  );
}
