import React, { useEffect, useState } from "react";
import {
  BookOpen,
  CheckSquare,
  History,
  LibraryBig,
  LogOut,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Undo2,
  Home as HomeIcon,
  Search,
  User as UserIcon,
  ChevronDown
} from "lucide-react";
import { api } from "./api";
import { Profile } from "./components/Profile";
import { Stats } from "./components/Stats";
import { BookModal } from "./components/BookModal";
import { RequestModal } from "./components/RequestModal";
import { ToastContainer } from "./components/common/Toast";
import { Login } from "./pages/Login";
import { Catalog } from "./pages/Catalog";
import { Requests } from "./pages/Requests";
import { MyBooks } from "./pages/MyBooks";
import { Borrowed } from "./pages/Borrowed";
import { LoanHistory } from "./pages/LoanHistory";
import { Details } from "./pages/Details";
import { Home } from "./pages/Home";
import { initials } from "./utils/helpers";

const blankBook = {
  title: "",
  author: "",
  genreId: "",
  condition: "good",
  defaultLoanDays: 14,
  description: "",
  coverUrl: ""
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("bn_token"));
  const [view, setView] = useState("home");
  const [darkMode, setDarkMode] = useState(localStorage.getItem("bn_theme") === "dark");
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [genres, setGenres] = useState([]);
  
  // Pagination States
  const [booksPage, setBooksPage] = useState({ content: [], totalPages: 0, totalElements: 0, page: 0 });
  const [requestsPage, setRequestsPage] = useState({ content: [], totalPages: 0, totalElements: 0, page: 0 });
  const [myBooksPage, setMyBooksPage] = useState({ content: [], totalPages: 0, totalElements: 0, page: 0 });
  const [borrowedPage, setBorrowedPage] = useState({ content: [], totalPages: 0, totalElements: 0, page: 0 });
  const [historyPage, setHistoryPage] = useState({ content: [], totalPages: 0, totalElements: 0, page: 0 });
  const [bookHistoryPage, setBookHistoryPage] = useState({ content: [], totalPages: 0, totalElements: 0, page: 0 });
  
  const [selectedBook, setSelectedBook] = useState(null);
  const [filters, setFilters] = useState({ search: "", genreId: "", availability: "all", sort: "title", page: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [bookModal, setBookModal] = useState(null);
  const [requestModal, setRequestModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBootstrap();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 0 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCatalog();
    }
  }, [filters, isAuthenticated]);

  async function handleLogin(token, user) {
    localStorage.setItem("bn_token", token);
    setMe(user);
    setIsAuthenticated(true);
    notify("Welcome back, " + user.fullName + "!");
    setView("home");
  }

  function handleLogout() {
    localStorage.removeItem("bn_token");
    setIsAuthenticated(false);
    setMe(null);
    notify("Logged out successfully.");
  }

  async function loadBootstrap() {
    try {
      setLoading(true);
      const [user, genreList] = await Promise.all([api.me(), api.genres()]);
      setMe(user);
      setGenres(genreList);
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    const dashboard = await api.dashboard();
    setStats(dashboard);
    await Promise.all([
      loadCatalog(),
      loadRequests(requestsPage.page),
      loadMyBooks(myBooksPage.page),
      loadBorrowed(borrowedPage.page),
      loadHistory(historyPage.page)
    ]);
  }

  async function loadCatalog() {
    try {
      setLoading(true);
      const params = {
        search: filters.search,
        availability: filters.availability,
        sort: filters.sort,
        page: filters.page
      };
      if (filters.genreId) params.genreId = filters.genreId;
      setBooksPage(await api.books(params));
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadRequests(page) {
    try { setRequestsPage(await api.requests(page)); } catch (e) { notify(e.message, "error"); }
  }

  async function loadMyBooks(page) {
    try { setMyBooksPage(await api.myBooks(page)); } catch (e) { notify(e.message, "error"); }
  }

  async function loadBorrowed(page) {
    try { setBorrowedPage(await api.borrowed(page)); } catch (e) { notify(e.message, "error"); }
  }

  async function loadHistory(page) {
    try { setHistoryPage(await api.loanHistory(page)); } catch (e) { notify(e.message, "error"); }
  }

  async function loadBookHistory(id, page) {
    try { setBookHistoryPage(await api.bookHistory(id, page)); } catch (e) { notify(e.message, "error"); }
  }

  async function openDetails(book) {
    const freshBook = await api.book(book.id);
    setSelectedBook(freshBook);
    await loadBookHistory(book.id, 0);
    setView("detail");
  }

  async function saveBook(payload) {
    try {
      if (bookModal?.id) await api.updateBook(bookModal.id, payload);
      else await api.createBook(payload);
      setBookModal(null);
      notify(bookModal?.id ? "Book updated." : "Book added.");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function deleteBook(id) {
    if (!window.confirm("Are you sure you want to remove this book from the library?")) return;
    try {
      await api.deleteBook(id);
      notify("Book deleted.");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function sendRequest(payload) {
    try {
      await api.requestBook(payload);
      setRequestModal(null);
      notify("Borrow request sent.");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function approve(id) {
    try {
      await api.approve(id);
      notify("Request approved and loan started.");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function reject(id) {
    if (!window.confirm("Are you sure you want to reject this request?")) return;
    try {
      await api.reject(id);
      notify("Request rejected.");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function returnBook(id) {
    try {
      await api.returnBook(id);
      notify("Book marked as returned.");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  }

  function notify(message, type = "success") {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  const navItems = [
    { id: "home", label: "Home", Icon: HomeIcon },
    { id: "catalog", label: "Browse", Icon: Search },
    { id: "myBooks", label: "My Shelf", Icon: LibraryBig },
    { id: "requests", label: "Requests", Icon: CheckSquare, badge: stats?.pendingApprovals },
    { id: "borrowed", label: "Reading", Icon: Undo2 },
    { id: "history", label: "History", Icon: History },
  ];

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-container">
          <button className="brand btn-link" onClick={() => setView("home")}>
            <div className="brand-mark">BN</div>
            <div className="brand-text">
              <h1>Book Nook</h1>
            </div>
          </button>

          <nav className="top-nav">
            {navItems.map(({ id, label, Icon, badge }) => (
              <button 
                key={id} 
                className={`nav-link ${view === id ? "active" : ""}`}
                onClick={() => setView(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {badge > 0 && <span className="nav-badge">{badge}</span>}
              </button>
            ))}
          </nav>

          <div className="header-right">
            <button className="btn icon-only" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            
            <div className="profile-dropdown-container" style={{ position: "relative" }}>
              <button className="user-profile-trigger" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                <div className="user-avatar-small">
                  {me ? (me.avatarInitials || initials(me.fullName)) : "?"}
                </div>
                <ChevronDown size={14} color="var(--muted)" />
              </button>
              
              {showProfileDropdown && (
                <div className="card" style={{ 
                  position: "absolute", 
                  top: "100%", 
                  right: 0, 
                  marginTop: "8px", 
                  minWidth: "240px", 
                  zIndex: 200, 
                  padding: "16px" 
                }}>
                  {me && <Profile user={me} />}
                  <hr style={{ margin: "16px 0", border: "0", borderTop: "1px solid var(--line)" }} />
                  <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        {view === "home" && <Home stats={stats} setView={setView} setBookModal={setBookModal} />}
        
        {view === "catalog" && (
          <Catalog
            page={booksPage}
            genres={genres}
            filters={filters}
            setFilters={setFilters}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            loading={loading}
            me={me}
            openDetails={openDetails}
            setRequestModal={setRequestModal}
            setBookModal={setBookModal}
            returnBook={returnBook}
          />
        )}
        {!loading && view === "requests" && <Requests page={requestsPage} onPageChange={loadRequests} me={me} approve={approve} reject={reject} openDetails={openDetails} returnBook={returnBook} />}
        {!loading && view === "myBooks" && <MyBooks page={myBooksPage} onPageChange={loadMyBooks} setBookModal={setBookModal} deleteBook={deleteBook} openDetails={openDetails} />}
        {!loading && view === "borrowed" && <Borrowed page={borrowedPage} onPageChange={loadBorrowed} returnBook={returnBook} openDetails={openDetails} />}
        {!loading && view === "history" && <LoanHistory page={historyPage} onPageChange={loadHistory} />}
        {!loading && view === "detail" && selectedBook && (
          <Details 
            book={selectedBook} 
            historyPage={bookHistoryPage} 
            onPageChange={(p) => loadBookHistory(selectedBook.id, p)} 
            me={me} 
            setView={setView} 
            setBookModal={setBookModal} 
            setRequestModal={setRequestModal} 
            returnBook={returnBook}
          />
        )}
      </main>

      <nav className="mobile-nav">
        {navItems.slice(0, 5).map(({ id, label, Icon }) => (
          <button 
            key={id} 
            className={`mobile-nav-item ${view === id ? "active" : ""}`}
            onClick={() => setView(id)}
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {bookModal && <BookModal book={bookModal} genres={genres} onClose={() => setBookModal(null)} onSave={saveBook} />}
      {requestModal && <RequestModal book={requestModal} onClose={() => setRequestModal(null)} onSave={sendRequest} />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
