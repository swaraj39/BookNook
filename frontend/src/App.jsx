import React, { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckSquare,
  Home as HomeIcon,
  History,
  LibraryBig,
  LogOut,
  Moon,
  Plus,
  RotateCcw,
  Sun,
  Undo2,
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
import { initials } from "./utils/helpers";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import logo from "./styles/blue_altair_logo-removebg-preview.png";
const blankBook = {
  title: "",
  author: "",
  genreId: "",
  condition: "good",
  defaultLoanDays: 14,
  description: "",
  coverUrl: ""
};

function HomePage({ stats, dailyThought, setView, setFilters, setBookModal }) {
  return (
    <section className="home-page">
      <div className="new-hero">
        <div className="new-hero-badge">
          <span>✦</span>
          <span>A Reading Community</span>
        </div>
        <h1 className="new-hero-title">
          Borrow a book. <span>Pass it on.</span>
        </h1>
        <p className="new-hero-desc">
          Book Nook is a shared shelf for our team. List a book you'd lend,
          borrow one you've been meaning to read, and swap stories along the way.
        </p>
        <div className="new-hero-actions">
          <button className="new-btn-primary" onClick={() => setView("catalog")}>Browse the shelf</button>
          <button className="new-btn-outline" onClick={() => setBookModal({ ...blankBook })}>Lend a book</button>
        </div>
        {dailyThought && (
          <div className="new-hero-quote">
            <span className="new-hero-quote-icon">📖</span>
            <blockquote>"{dailyThought.quote || dailyThought.text || dailyThought.content || dailyThought.q}"</blockquote>
            — {dailyThought.author || dailyThought.by || dailyThought.a}
          </div>
        )}
        <div className="new-hero-stats">
          <div className="new-stat-card">
            <label>Books on the shelf</label>
            <strong>{stats?.totalBooks || 0}</strong>
          </div>
          <div className="new-stat-card">
            <label>Available to borrow</label>
            <strong>{stats?.availableBooks || 0}</strong>
          </div>
        </div>
      </div>
      <section className="how-it-works panel">
        <div className="panel-head"><h3>How it works</h3></div>
        <div className="steps-grid">
          <article><span>1</span><h4>Browse</h4><p>Search the shared shelf and filter books by genre, status, or due date.</p></article>
          <article><span>2</span><h4>Request</h4><p>Send a borrow request with your preferred number of reading days.</p></article>
          <article><span>3</span><h4>Read & return</h4><p>Track active loans and mark books returned when you are done.</p></article>
        </div>
      </section>
    </section>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("bn_token"));
  const [view, setView] = useState("home");
  const [darkMode, setDarkMode] = useState(localStorage.getItem("bn_theme") === "dark");
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [genres, setGenres] = useState([]);
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
  const [dailyThought, setDailyThought] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
  }, [darkMode]);
  useEffect(() => {
    fetch("https://booknook-gfb8.onrender.com/api/quote/today")
      .then((response) => response.ok ? response.json() : null)
      .then((quote) => {
        if (quote) setDailyThought(quote);
        console.log(quote);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      ) {
        setShowProfileDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
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
    notify("Welcome , " + user.fullName + "!");
    setView("home");
  }
  function handleLogout() {
    setShowProfileDropdown(false);
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
        page: filters.page,
        size: 20
      };
      if (filters.genreId) params.genreId = filters.genreId;
      setBooksPage(await api.books(params));
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function askConfirm(message, onConfirm) {
    setConfirm({ message, onConfirm });
  }
  function resolveConfirm(confirmed) {
    if (confirmed && confirm?.onConfirm) confirm.onConfirm();
    setConfirm(null);
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
    askConfirm("Are you sure you want to remove this book from the library? This cannot be undone.", async () => {
      try {
        await api.deleteBook(id);
        notify("Book deleted.");
        await refresh();
      } catch (error) {
        notify(error.message, "error");
      }
    });
    return;
    // try {
    //   await api.deleteBook(id);
    //   notify("Book deleted.");
    //   await refresh();
    // } catch (error) {
    //   notify(error.message, "error");
    // }
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
    askConfirm("Are you sure you want to reject this request?", async () => {
      try {
        await api.reject(id);
        notify("Request rejected.");
        await refresh();
      } catch (error) {
        notify(error.message, "error");
      }
    });
    return;
  }
  async function returnBook(id, bookTitle) {
    askConfirm(`Return "${bookTitle}"? This will mark the book as returned.`, async () => {
      try {
        await api.returnBook(id);
        notify("Book marked as returned.");
        await refresh();
      } catch (error) {
        notify(error.message, "error");
      }
    });
  }
  function notify(message, type = "success") {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }
  function removeToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }
  const navSections = [
    {
      label: "Discovery",
      items: [
        ["home", "Home", HomeIcon],
        ["catalog", "Browse", BookOpen]
      ]
    },
    {
      label: "Your Activity",
      items: [
        ["requests", "Requests", CheckSquare, stats?.pendingApprovals],
        ["myBooks", "My Shelf", LibraryBig],
        ["borrowed", "Currently Reading", Undo2, stats?.activeBorrowed],
        ["history", "History", History]
      ]
    }
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
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
          <img className="brand-mark" src={logo} alt="Book Nook Logo" />
          <div>
            <h1>Book Nook</h1>
            <p>BA Reading Community</p>
          </div>
        </button>
        <nav className="nav">
          {navSections.map((section) => (
            <div key={section.label} className="nav-section">
              <div className="nav-label">{section.label}</div>
              {section.items.map(([id, label, Icon, badge]) => (
                <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
                  <div className="nav-item-content">
                    <Icon size={18} />
                    <span>{label}</span>
                  </div>
                  {badge > 0 && <span className="nav-badge">{badge}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="top-nav-actions">
          <button className="btn icon-only" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {me && (
            <div
              ref={profileDropdownRef}
              className="profile-dropdown-container"
              style={{ position: "relative" }}
            >
              <button className="user-profile-trigger" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                <div className="user-avatar-small">
                  {me.avatarInitials || initials(me.fullName)}
                </div>
                <ChevronDown size={14} color="var(--muted)" />
              </button>
              {showProfileDropdown && (
                <div className="profile-dropdown-card">
                  <Profile user={me} onLogout={handleLogout} />
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
      <main className="main">
        {view !== "home" && (
          <section className="topbar">
            <div className="page-title">
              <div className="page-kicker">Community library tracker</div>
              <h2>BA Reading Community Tracker</h2>
              <p>Share books, discover reads across the capability, manage approvals, and track returns without spreadsheet drift.</p>
            </div>
            <div className="actions">
              <button className="btn primary" onClick={() => setBookModal({ ...blankBook })}><Plus size={17} /> Add book</button>
            </div>
          </section>
        )}
        {/* {view === "home" && (
          <div style={{ position: "fixed", top: "16px", right: "24px", zIndex: 200 }}>
            <button className="btn icon-only" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        )} */}
        {view === "home" && (
          <HomePage
            stats={stats}
            dailyThought={dailyThought}
            setView={setView}
            setFilters={setFilters}
            setBookModal={setBookModal}
          />
        )}
        {loading && !["catalog", "home"].includes(view) && <div className="panel empty">Loading Book Nook...</div>}
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
      {bookModal && <BookModal book={bookModal} genres={genres} onClose={() => setBookModal(null)} onSave={saveBook} />}
      {requestModal && <RequestModal book={requestModal} onClose={() => setRequestModal(null)} onSave={sendRequest} />}
      <ConfirmDialog
        message={confirm?.message}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}