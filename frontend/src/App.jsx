import React, { useEffect, useRef, useState, useCallback } from "react";
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
  BookOpenText,
  Globe,
  User as UserIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "./api";
import { Profile } from "./components/Profile";
import { Stats } from "./components/Stats";
import { BookModal } from "./components/BookModal";
import { RequestModal } from "./components/RequestModal";
import { ToastContainer } from "./components/common/Toast";
import { Login } from "./pages/Login";
import { Catalog } from "./pages/Catalog";
import { Dashboard } from "./pages/Dashboard";
import { Requests } from "./pages/Requests";
import { MyBooks } from "./pages/MyBooks";
import { Borrowed } from "./pages/Borrowed";
import { LoanHistory } from "./pages/LoanHistory";
import { Details } from "./pages/Details";
import { BookAddedDialog } from "./components/common/BookAddedDialog";
import { initials, parseDelimitedText, normalizeImportRow, toBookForm } from "./utils/helpers";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import logo from "./styles/blue_altair_logo-removebg-preview.png";

const VALID_VIEWS = new Set(["dashboard", "home", "catalog", "requests", "myBooks", "borrowed", "history", "detail"]);

function getStoredView() {
  const storedView = localStorage.getItem("bn_view") || "dashboard";
  return VALID_VIEWS.has(storedView) ? storedView : "dashboard";
}

function getStoredNavStack(currentView) {
  try {
    const parsed = JSON.parse(localStorage.getItem("bn_navStack") || "[]");
    const stack = Array.isArray(parsed) ? parsed.filter((item) => VALID_VIEWS.has(item)) : [];
    if (stack.length === 0) return currentView === "home" ? ["home"] : ["home", currentView];
    return stack[stack.length - 1] === currentView ? stack : [...stack, currentView];
  } catch {
    return currentView === "home" ? ["home"] : ["home", currentView];
  }
}

const blankBook = {
  title: "",
  author: "",
  genreId: "",
  condition: "good",
  defaultLoanDays: 14,
  description: "",
  coverUrl: ""
};

function DashboardLoader() {
  const messages = [
    { text: "Welcome back", icon: "👋" },
    { text: "Preparing your dashboard", icon: "⚙️" },
    { text: "Gathering your reading stats", icon: "📊" },
    { text: "Loading your latest activity", icon: "📚" },
    { text: "Syncing your bookshelf", icon: "🗂️" },
    { text: "Calculating your reading progress", icon: "📈" },
    { text: "Curating today's picks", icon: "✨" },
    { text: "Almost ready", icon: "⏳" },
    { text: "Putting the final touches", icon: "🧩" },
    { text: "Good things take a moment", icon: "🌱" },
    { text: "Thanks for your patience", icon: "🙏" },
    { text: "Just a few seconds more", icon: "⏱️" }
  ];
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="dashboard-loader" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div className="dashboard-loader-spinner-wrap">
        <div className="dashboard-loader-spinner" />
        <span className="dashboard-loader-emoji">{messages[index].icon}</span>
      </div>
      <p key={index} className="dashboard-loader-text">
        {messages[index].text}
      </p>
    </div>
  );
}

function NavLoader() {
  return (
    <div className="nav-loader-overlay">
      <div className="nav-loader-card">
        <div className="nav-loader-icon-wrap">
          <BookOpen size={38} className="nav-loader-icon" />
          <div className="nav-loader-ring" />
        </div>
        <p className="nav-loader-message">Loading your bookshelf</p>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const initialView = getStoredView();
  const [view, setView] = useState(initialView);
  const [navStack, setNavStack] = useState(() => getStoredNavStack(initialView));
  const [selectedBookId, setSelectedBookId] = useState(localStorage.getItem("bn_selectedBookId") || null);

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
  
  // High-priority page view loader
  const [pageLoading, setPageLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(null);
  const [dailyThought, setDailyThought] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const navRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [bookAddedMessage, setBookAddedMessage] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("bn_view", view);
    localStorage.setItem("bn_navStack", JSON.stringify(navStack));
    if (view === "detail" && selectedBookId) {
      localStorage.setItem("bn_selectedBookId", selectedBookId);
    } else {
      localStorage.removeItem("bn_selectedBookId");
    }
  }, [view, navStack, selectedBookId]);

  useEffect(() => {
    const safeStack = navStack.length ? navStack : [view];
    window.history.replaceState({ view: safeStack[0], selectedBookId: null, navStack: [safeStack[0]] }, "", window.location.href);
    safeStack.slice(1).forEach((stackView, index) => {
      const stackUntilHere = safeStack.slice(0, index + 2);
      window.history.pushState({ view: stackView, selectedBookId: stackView === "detail" ? selectedBookId : null, navStack: stackUntilHere }, "", window.location.href);
    });

    function handleBrowserBack(event) {
      const state = event.state;
      if (!state?.view || !VALID_VIEWS.has(state.view)) return;
      setView(state.view);
      setSelectedBookId(state.selectedBookId || null);
      setNavStack(Array.isArray(state.navStack) && state.navStack.length ? state.navStack : [state.view]);
    }
    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, []);

  function navigateTo(newView, options = {}) {
    if (!VALID_VIEWS.has(newView)) return;
    setShowProfileDropdown(false);

    const nextBookId = newView === "detail" ? (options.bookId || selectedBookId) : null;
    const nextStack = options.replace
      ? [...navStack.slice(0, -1), newView]
      : navStack[navStack.length - 1] === newView
        ? navStack
        : [...navStack, newView];
        
    setView(newView);
    setSelectedBookId(nextBookId);
    setNavStack(nextStack);
    if (!options.skipHistory) {
      window.history.pushState({ view: newView, selectedBookId: nextBookId, navStack: nextStack }, "", window.location.href);
    }
  }

  function navigateBack(options = {}) {
    if (navStack.length <= 1) return;
    const newStack = navStack.slice(0, -1);
    const previousView = newStack[newStack.length - 1] || "home";
    const previousBookId = previousView === "detail" ? selectedBookId : null;
    setNavStack(newStack);
    setView(previousView);
    setSelectedBookId(previousBookId);
    if (!options.skipHistory) {
      window.history.back();
    }
  }

  const checkNavScroll = useCallback(() => {
    const el = navRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }
  }, []);

  const scrollNav = useCallback((dir) => {
    const el = navRef.current;
    if (el) el.scrollBy({ left: dir * 200, behavior: "smooth" });
  }, []);

  useEffect(() => {
    checkNavScroll();
    const el = navRef.current;
    if (el) {
      el.addEventListener("scroll", checkNavScroll);
      return () => el.removeEventListener("scroll", checkNavScroll);
    }
  }, [view, stats, checkNavScroll]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    fetch(`http://localhost:8080/api/quote/today`)
      .then((response) => response.ok ? response.json() : null)
      .then((quote) => { if (quote) setDailyThought(quote); })
      .catch((error) => console.error("Failed to fetch daily quote:", error));
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── CENTRALIZED AUTOMATIC ON-DEMAND LAZY TAB HYDRATION ROUTINES ───
  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadActiveViewData() {
      // Don't re-fetch data if the state cache is already filled
      if (view === "dashboard" && stats) return;
      if (view === "catalog" && booksPage.content.length > 0) return;
      if (view === "requests" && requestsPage.content.length > 0) return;
      if (view === "myBooks" && myBooksPage.content.length > 0) return;
      if (view === "borrowed" && borrowedPage.content.length > 0) return;
      if (view === "history" && historyPage.content.length > 0) return;

      setPageLoading(true);
      try {
        switch (view) {
          case "dashboard":
            const dashboardData = await api.dashboard();
            setStats(dashboardData);
            break;
          case "catalog":
            await loadCatalog();
            break;
          case "requests":
            await loadRequests(requestsPage.page);
            break;
          case "myBooks":
            await loadMyBooks(myBooksPage.page);
            break;
          case "borrowed":
            await loadBorrowed(borrowedPage.page);
            break;
          case "history":
            await loadHistory(historyPage.page);
            break;
          default:
            break;
        }
      } catch (err) {
        notify(err.message, "error");
      } finally {
        setPageLoading(false);
      }
    }

    loadActiveViewData();
  }, [view, isAuthenticated]);

  // Handle live updates when search terms or filter configurations dynamically adapt
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 0 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (isAuthenticated && view === "catalog") {
      loadCatalog();
    }
  }, [filters, isAuthenticated]);

  useEffect(() => {
    async function restoreDetailPage() {
      if (!isAuthenticated || view !== "detail" || !selectedBookId || selectedBook) return;
      setDetailsLoading(true);
      try {
        const [freshBook, history] = await Promise.all([
          api.book(selectedBookId),
          api.bookHistory(selectedBookId, 0)
        ]);
        setSelectedBook(freshBook);
        setBookHistoryPage(history);
      } catch (error) {
        notify(error.message || "Unable to load book details.", "error");
        navigateTo("catalog", { replace: true });
      } finally {
        setDetailsLoading(false);
      }
    }
    restoreDetailPage();
  }, [isAuthenticated, view, selectedBookId, selectedBook]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await api.me();
        const genreList = await api.genres();
        setMe(user);
        setGenres(genreList);
        setIsAuthenticated(true);
      } catch (error) {
        setMe(null);
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    const handler = () => {
      setMe(null);
      setIsAuthenticated(false);
    };
    window.addEventListener("auth-expired", handler);
    return () => window.removeEventListener("auth-expired", handler);
  }, []);

  async function handleLogin(token, user) {
    setPageLoading(true);
    localStorage.setItem("bn_token", token);
    setMe(user);
    try {
      const genreList = await api.genres();
      const dashboardData = await api.dashboard();
      setGenres(genreList);
      setStats(dashboardData);
      setIsAuthenticated(true);
      notify("Welcome, " + user.fullName + "!");
      setSelectedBook(null);
      setSelectedBookId(null);
      setNavStack(["dashboard"]);
      setView("dashboard");
      window.history.replaceState({ view: "dashboard", selectedBookId: null, navStack: ["dashboard"] }, "", window.location.href);
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setPageLoading(false);
    }
  }

  async function handleLogout() {
    setShowProfileDropdown(false);
    try {
      await fetch("http://localhost:8080/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setIsAuthenticated(false);
    setMe(null);
    setStats(null);
    setBooksPage({ content: [], totalPages: 0, totalElements: 0, page: 0 });
    setRequestsPage({ content: [], totalPages: 0, totalElements: 0, page: 0 });
    setMyBooksPage({ content: [], totalPages: 0, totalElements: 0, page: 0 });
    setBorrowedPage({ content: [], totalPages: 0, totalElements: 0, page: 0 });
    setHistoryPage({ content: [], totalPages: 0, totalElements: 0, page: 0 });
    setSelectedBook(null);
    setSelectedBookId(null);
    setNavStack(["dashboard"]);
    setView("dashboard");
    localStorage.removeItem("bn_view");
    localStorage.removeItem("bn_navStack");
    localStorage.removeItem("bn_selectedBookId");
    notify("Logged out successfully.");
  }

  // ─── TARGETED BACKEND SYNC OPERATIONS (EXPLICIT MANIPULATION OR COOLDOWN REFRESH) ───
  async function loadCatalog() {
    const params = {
      search: filters.search,
      availability: filters.availability,
      sort: filters.sort,
      page: filters.page,
      size: 20
    };
    if (filters.genreId) params.genreId = filters.genreId;
    const result = await api.books(params);
    setBooksPage(result);
  }

  async function loadRequests(page) {
    const result = await api.requests(page);
    setRequestsPage(result);
  }

  async function loadMyBooks(page) {
    const result = await api.myBooks(page);
    setMyBooksPage(result);
  }

  async function loadBorrowed(page) {
    const result = await api.borrowed(page);
    setBorrowedPage(result);
  }

  async function loadHistory(page) {
    const result = await api.loanHistory(page);
    setHistoryPage(result);
  }

  async function loadBookHistory(id, page) {
    try { setBookHistoryPage(await api.bookHistory(id, page)); } catch (e) { notify(e.message, "error"); }
  }

  // Manual explicit refresh button triggers inside pages
  async function handleManualRefresh() {
    setPageLoading(true);
    try {
      if (view === "dashboard") setStats(await api.dashboard());
      if (view === "catalog") await loadCatalog();
      if (view === "requests") await loadRequests(requestsPage.page);
      if (view === "myBooks") await loadMyBooks(myBooksPage.page);
      if (view === "borrowed") await loadBorrowed(borrowedPage.page);
      if (view === "history") await loadHistory(historyPage.page);
      notify("Data synchronized.");
    } catch (e) {
      notify(e.message, "error");
    } finally {
      setPageLoading(false);
    }
  }

  function askConfirm(message, onConfirm) {
    setConfirm({ message, onConfirm });
  }

  async function resolveConfirm(confirmed) {
    if (confirmed && confirm?.onConfirm) await confirm.onConfirm();
    setConfirm(null);
  }

  async function openDetails(book) {
    setDetailsLoading(true);
    try {
      const freshBook = await api.book(book.id);
      setSelectedBook(freshBook);
      setSelectedBookId(book.id);
      await loadBookHistory(book.id, 0);
      navigateTo("detail", { bookId: book.id });
    } finally {
      setDetailsLoading(false);
    }
  }

  async function saveBook(payload) {
    setPageLoading(true);
    try {
      if (bookModal?.id) await api.updateBook(bookModal.id, payload);
      else await api.createBook(payload);
      setBookModal(null);
      notify(bookModal?.id ? "Book updated." : "Book added.");
      await loadMyBooks(bookModal?.id ? myBooksPage.page : 0);
      setStats(await api.dashboard()); // sync aggregate parameters metrics
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setPageLoading(false);
    }
  }

  async function importBooks(file) {
    setPageLoading(true);
    try {
      const extension = file.name.split(".").pop().toLowerCase();
      let rawRows = [];
      if (extension === "xlsx" || extension === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
      } else if (extension === "csv" || extension === "txt") {
        const text = await file.text();
        rawRows = parseDelimitedText(text);
      } else {
        window.alert("Please upload a .csv, .xlsx, or .xls file.");
        notify("Unsupported file type.", "error");
        return;
      }
      const rows = rawRows.map(normalizeImportRow).filter((row) => row.Title || row.Author || row.Genre);
      if (rows.length === 0) {
        window.alert("No valid rows were found in that file. Make sure it has Title, Author, and Genre columns.");
        notify("No valid rows found in the file.", "error");
        return;
      }
      const result = await api.importBooks(rows);
      if (result.imported > 0 || result.skipped > 0) {
        setBookAddedMessage(
          `${result.imported} book(s) added successfully.` +
          (result.skipped ? ` ${result.skipped} row(s) skipped as duplicates.` : "") +
          (result.failed ? ` ${result.failed} row(s) failed to import — check the console for details.` : "")
        );
        notify(`Imported ${result.imported} book(s).${result.skipped ? ` ${result.skipped} skipped.` : ""}`);
      } else {
        notify("No books were imported. Please check the file and try again.", "error");
      }
      if (result.errors?.length) console.error("Import errors:", result.errors);
      await loadMyBooks(0);
      setStats(await api.dashboard());
    } catch (error) {
      window.alert(error.message || "Import failed.");
      notify(error.message, "error");
    } finally {
      setPageLoading(false);
    }
  }

  async function deleteBook(id) {
    askConfirm("Are you sure you want to remove this book from the library? This cannot be undone.", async () => {
      setPageLoading(true);
      try {
        await api.deleteBook(id);
        notify("Book deleted.");
        await loadMyBooks(myBooksPage.page);
        setStats(await api.dashboard());
      } catch (error) {
        notify(error.message, "error");
      } finally {
        setPageLoading(false);
      }
    });
  }

  async function sendRequest(payload) {
    setPageLoading(true);
    try {
      await api.requestBook(payload);
      setRequestModal(null);
      notify("Borrow request sent.");
      await loadRequests(requestsPage.page);
      setStats(await api.dashboard());
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setPageLoading(false);
    }
  }

  async function approve(id) {
    setPageLoading(true);
    try {
      await api.approve(id);
      notify("Request approved and loan started.");
      await loadRequests(requestsPage.page);
      setStats(await api.dashboard());
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setPageLoading(false);
    }
  }

  async function reject(id) {
    askConfirm("Are you sure you want to reject this request?", async () => {
      setPageLoading(true);
      try {
        await api.reject(id);
        notify("Request rejected.");
        await loadRequests(requestsPage.page);
        setStats(await api.dashboard());
      } catch (error) {
        notify(error.message, "error");
      } finally {
        setPageLoading(false);
      }
    });
  }

  async function returnBook(id, bookTitle) {
    askConfirm(`Return "${bookTitle}"? This will mark the book as returned.`, async () => {
      setPageLoading(true);
      try {
        await api.returnBook(id);
        notify("Book marked as returned.");
        if (view === "borrowed") await loadBorrowed(borrowedPage.page);
        if (view === "catalog") await loadCatalog();
        setStats(await api.dashboard());
      } catch (error) {
        notify(error.message, "error");
      } finally {
        setPageLoading(false);
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
      label: "Analytics & Shelf",
      items: [
        ["dashboard", "Dashboard", CheckSquare],
        ["catalog", "Browse", Globe]
      ]
    },
    {
      label: "Your Activity",
      items: [
        ["requests", "Requests", CheckSquare, stats?.pendingApprovals],
        ["myBooks", "My Shelf", LibraryBig],
        ["borrowed", "Currently Reading", BookOpenText],
        ["history", "History", History]
      ]
    }
  ];

  if (authChecking) {
    return <DashboardLoader />;
  }

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
      {pageLoading && <DashboardLoader />}
      
      <aside className="sidebar">
        <button className="brand" onClick={() => navigateTo("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
          <img className="brand-mark" src={logo} alt="Book Nook Logo" />
          <div>
            <h1>Book Nook</h1>
            <p>BA Reading Community</p>
          </div>
        </button>
        <div className="nav-scroll-wrap">
          <button className={`nav-scroll-btn left ${canScrollLeft ? "" : "hidden"}`} onClick={() => scrollNav(-1)} aria-label="Scroll left">
            <ChevronLeft size={18} />
          </button>
          <nav className="nav" ref={navRef} onScroll={checkNavScroll}>
            {navSections.map((section) => (
              <div key={section.label} className="nav-section">
                <div className="nav-label">{section.label}</div>
                {section.items.map(([id, label, Icon, badge]) => (
                  <button key={id} className={`nav-item ${view === id ? "active" : ""}`} onClick={() => navigateTo(id)}>
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
          <button className={`nav-scroll-btn right ${canScrollRight ? "" : "hidden"}`} onClick={() => scrollNav(1)} aria-label="Scroll right">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="top-nav-actions">
          <button className="btn icon-only" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {me && (
            <div ref={profileDropdownRef} className="profile-dropdown-container" style={{ position: "relative" }}>
              <button className="user-profile-trigger" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
                <div className="user-avatar-small">{me.avatarInitials || initials(me.fullName)}</div>
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
        {navLoading && <NavLoader />}
        {view === "dashboard" && stats && (
          <Dashboard stats={stats} me={me} dailyThought={dailyThought} openDetails={openDetails} />
        )}
        {view !== "home" && view !== "catalog" && view !== "dashboard" && (
          <section className="topbar">
            <div className="page-title">
              <h2>BA Reading Community Tracker</h2>
              <p>Share books, discover reads across the capability, manage approvals, and track returns without spreadsheet drift.</p>
            </div>
            <div>
              <button className="btn primary" onClick={() => setBookModal({ ...blankBook })}><Plus size={17} /> Add book</button>
            </div>
          </section>
        )}
        
        {view === "catalog" && (
          <Catalog
            page={booksPage}
            genres={genres}
            filters={filters}
            setFilters={setFilters}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            loading={pageLoading}
            me={me}
            openDetails={openDetails}
            setRequestModal={setRequestModal}
            setBookModal={setBookModal}
            returnBook={returnBook}
            importBooks={importBooks}
          />
        )}
        
        {view === "requests" && (
          <Requests page={requestsPage} onPageChange={loadRequests} onRefresh={handleManualRefresh} me={me} approve={approve} reject={reject} openDetails={openDetails} returnBook={returnBook} />
        )}
        {view === "myBooks" && (
          <MyBooks page={myBooksPage} onPageChange={loadMyBooks} onRefresh={handleManualRefresh} setBookModal={setBookModal} deleteBook={deleteBook} openDetails={openDetails} />
        )}
        {view === "borrowed" && (
          <Borrowed page={borrowedPage} onPageChange={loadBorrowed} onRefresh={handleManualRefresh} returnBook={returnBook} openDetails={openDetails} />
        )}
        {view === "history" && (
          <LoanHistory page={historyPage} onPageChange={loadHistory} onRefresh={handleManualRefresh} />
        )}
        
        {view === "detail" && selectedBook && (
          <Details
            book={selectedBook}
            historyPage={bookHistoryPage}
            onPageChange={(p) => loadBookHistory(selectedBook.id, p)}
            me={me}
            navigateBack={navigateBack}
            navigateTo={navigateTo}
            setBookModal={setBookModal}
            setRequestModal={setRequestModal}
            returnBook={returnBook}
          />
        )}
      </main>

      {bookModal && <BookModal book={bookModal} genres={genres} onClose={() => setBookModal(null)} onSave={saveBook} />}
      {requestModal && <RequestModal book={requestModal} onClose={() => setRequestModal(null)} onSave={sendRequest} />}
      
      <ConfirmDialog message={confirm?.message} onConfirm={() => resolveConfirm(true)} onCancel={() => resolveConfirm(false)} />
      <BookAddedDialog message={bookAddedMessage} onClose={() => setBookAddedMessage(null)} />
      
      {detailsLoading && (
        <div className="details-loader-overlay">
          <div className="details-loader-box">
            <svg className="details-loader-spinner" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span>Loading book details...</span>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}