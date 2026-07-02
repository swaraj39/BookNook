
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { initials } from "./utils/helpers";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { PageLoader } from "./components/common/PageLoader";
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
// How many books to request from the API in one shot when we load the
// catalog. We fetch everything that matches search/genre/sort ONCE and then
// filter/paginate the "All / Available / Request Pending / Borrowed by me /
// Unavailable" capsules entirely on the client, so switching capsules never
// hits the network.
const CATALOG_FETCH_SIZE = 1000;
const CATALOG_PAGE_SIZE = 20;
// Mirrors the availability logic that used to live server-side so that
// switching capsules client-side produces the exact same results as before.
function matchesCapsule(book, capsule) {
  switch (capsule) {
    case "available":
      return book.availabilityStatus === "available";
    case "request_pending":
      return book.availabilityStatus === "request_pending" && !!book.isPendingByMe;
    case "borrowed_by_me":
      return !!book.isBorrowedByMe;
    case "unavailable":
      return (
        (book.availabilityStatus === "borrowed" || book.availabilityStatus === "request_pending") &&
        !book.isBorrowedByMe &&
        !book.isPendingByMe
      );
    case "all":
    default:
      return true;
  }
}
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
    <div className="dashboard-loader">
      <div className="dashboard-loader-spinner-wrap">
        <div className="dashboard-loader-spinner" />
        <span className="dashboard-loader-emoji">{messages[index].icon}</span>
      </div>
      <p key={index} className="dashboard-loader-text">
        {messages[index].text}
      </p>
      {
}
    </div>
  );
}
function HomePage({ stats, dailyThought, navigateTo, setFilters, setBookModal }) {
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
          <button className="new-btn-primary" onClick={() => navigateTo("catalog")}>Browse the shelf</button>
          <button className="new-btn-outline" onClick={() => setBookModal({ ...blankBook })}>Add Book</button>
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const initialView = getStoredView();
  const [view, setView] = useState(initialView);
  const [navStack, setNavStack] = useState(() => getStoredNavStack(initialView));
  const [selectedBookId, setSelectedBookId] = useState(localStorage.getItem("bn_selectedBookId") || null);
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
    window.history.replaceState(
      { view: safeStack[0], selectedBookId: null, navStack: [safeStack[0]] },
      "",
      window.location.href
    );
    safeStack.slice(1).forEach((stackView, index) => {
      const stackUntilHere = safeStack.slice(0, index + 2);
      window.history.pushState(
        {
          view: stackView,
          selectedBookId: stackView === "detail" ? selectedBookId : null,
          navStack: stackUntilHere
        },
        "",
        window.location.href
      );
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
      window.history.pushState(
        { view: newView, selectedBookId: nextBookId, navStack: nextStack },
        "",
        window.location.href
      );
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
  const [darkMode, setDarkMode] = useState(localStorage.getItem("bn_theme") === "dark");
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [genres, setGenres] = useState([]);
  // Raw, unfiltered list of books matching the current search/genre/sort.
  // Fetched once per "visit" to Browse (or when search/genre/sort change),
  // never re-fetched when the availability capsule is toggled.
  const [catalogBooks, setCatalogBooks] = useState([]);
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
  const [pageLoading, setPageLoading] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [dailyThought, setDailyThought] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const navRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [allBooks, setAllBooks] = useState([]);
  // Capsule filtering happens entirely in memory against the last fetched
  // catalogBooks list - this never triggers a network request.
  const filteredCatalogBooks = useMemo(
    () => catalogBooks.filter((book) => matchesCapsule(book, filters.availability)),
    [catalogBooks, filters.availability]
  );
  // Client-side pagination over the filtered list, shaped the same way the
  // old server-paginated response used to look so <Catalog/> doesn't need
  // to change how it reads `page`.
  const booksPage = useMemo(() => {
    const totalElements = filteredCatalogBooks.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / CATALOG_PAGE_SIZE));
    const safePage = Math.min(Math.max(filters.page, 0), totalPages - 1);
    const start = safePage * CATALOG_PAGE_SIZE;
    return {
      content: filteredCatalogBooks.slice(start, start + CATALOG_PAGE_SIZE),
      totalElements,
      totalPages,
      page: safePage
    };
  }, [filteredCatalogBooks, filters.page]);
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
  const [confirm, setConfirm] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL;
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
  }, [darkMode]);
  useEffect(() => {
      // fetch("https://booknook-gfb8.onrender.com/api/quote/today")
      fetch(`http://localhost:8080/api/quote/today`)
        .then((response) => response.ok ? response.json() : null)
        .then((quote) => {
          if (quote) setDailyThought(quote);
        })
        .catch((error) => {
          console.error("Failed to fetch daily quote:", error);
        });
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
  // Hits the API when the user lands on Browse, and again whenever the
  // search text, genre, or sort order change (those need the server's
  // search/sort). It deliberately does NOT depend on filters.availability
  // or filters.page - toggling a capsule or flipping pages never calls the
  // API, it just re-filters/re-slices the already-fetched list above.
  useEffect(() => {
    if (isAuthenticated && view === "catalog") {
      loadCatalogFromApi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, view, filters.search, filters.genreId, filters.sort]);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (view === "catalog" || view === "home" || view === "detail") return;
    let cancelled = false;
    (async () => {
      try {
        setPageLoading(view);
        switch (view) {
          case "dashboard": {
            const data = await api.dashboard();
            if (!cancelled) setStats(data);
            break;
          }
          case "requests": {
            const data = await api.requests(0);
            if (!cancelled) setRequestsPage(data);
            break;
          }
          case "myBooks": {
            const data = await api.myBooks(0);
            if (!cancelled) setMyBooksPage(data);
            break;
          }
          case "borrowed": {
            const data = await api.borrowed(0);
            if (!cancelled) setBorrowedPage(data);
            break;
          }
          case "history": {
            const data = await api.loanHistory(0);
            if (!cancelled) setHistoryPage(data);
            break;
          }
        }
      } finally {
        if (!cancelled) setPageLoading(null);
      }
    })();
    return () => { cancelled = true; };
  }, [view, isAuthenticated]);
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
        setMe(user);
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
    return () => {
      window.removeEventListener("auth-expired", handler);
    };
  }, []);
  async function handleLogin(token, user) {
    localStorage.setItem("bn_token", token);
    setMe(user);
    setIsAuthenticated(true);
    notify("Welcome, " + user.fullName + "!");
    setSelectedBook(null);
    setSelectedBookId(null);
    setNavStack(["dashboard"]);
    setView("dashboard");
    window.history.replaceState({ view: "dashboard", selectedBookId: null, navStack: ["dashboard"] }, "", window.location.href);
  }
  async function handleLogout() {
    setShowProfileDropdown(false);
    try {
      // await fetch("https://booknook-gfb8.onrender.com/api/auth/logout", {
      await fetch("http://localhost:8080/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    setIsAuthenticated(false);
    setMe(null);
    setSelectedBook(null);
    setSelectedBookId(null);
    setNavStack(["dashboard"]);
    setView("dashboard");
    localStorage.removeItem("bn_view");
    localStorage.removeItem("bn_navStack");
    localStorage.removeItem("bn_selectedBookId");
    notify("Logged out successfully.");
}
async function loadBootstrap() {
  try {
    const [user, genreList] = await Promise.all([api.me(), api.genres()]);
    setMe(user);
    setGenres(genreList);
  } catch (error) {
    notify(error.message, "error");
  }
}
// Fetches EVERY book matching the current search/genre/sort (ignoring the
// availability capsule entirely) and caches it in `catalogBooks`. This is
// the only place that calls the books API for Browse - it runs when the
// user navigates to Browse, when search/genre/sort change, or when the
// user hits the manual refresh button on the catalog header.
async function loadCatalogFromApi() {
  try {
    setCatalogLoading(true);
    const params = {
      search: filters.search,
      sort: filters.sort,
      availability: "all",
      page: 0,
      size: CATALOG_FETCH_SIZE
    };
    if (filters.genreId) params.genreId = filters.genreId;
    const result = await api.books(params);
    setCatalogBooks(result.content || []);
  } catch (error) {
    notify(error.message, "error");
  } finally {
    setCatalogLoading(false);
  }
}
async function reloadCurrentView() {
  if (view === "catalog") {
    await loadCatalogFromApi();
    return;
  }
  try {
    setPageLoading(view);
    switch (view) {
      case "dashboard": {
        const data = await api.dashboard();
        setStats(data);
        break;
      }
      case "requests": {
        const data = await api.requests(requestsPage.page);
        setRequestsPage(data);
        break;
      }
      case "myBooks": {
        const data = await api.myBooks(myBooksPage.page);
        setMyBooksPage(data);
        break;
      }
      case "borrowed": {
        const data = await api.borrowed(borrowedPage.page);
        setBorrowedPage(data);
        break;
      }
      case "history": {
        const data = await api.loanHistory(historyPage.page);
        setHistoryPage(data);
        break;
      }
    }
  } finally {
    setPageLoading(null);
  }
}
function askConfirm(message, onConfirm) {
  setConfirm({ message, onConfirm });
}
async function resolveConfirm(confirmed) {
  if (confirmed && confirm?.onConfirm) await confirm.onConfirm();
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
  try {
    if (bookModal?.id) await api.updateBook(bookModal.id, payload);
    else await api.createBook(payload);
    setBookModal(null);
    notify(bookModal?.id ? "Book updated." : "Book added.");
    await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  }
}
async function deleteBook(id) {
  askConfirm("Are you sure you want to remove this book from the library? This cannot be undone.", async () => {
    try {
      await api.deleteBook(id);
      notify("Book deleted.");
      await reloadCurrentView();
    } catch (error) {
      notify(error.message, "error");
    }
  });
  return;
}
async function sendRequest(payload) {
  try {
    await api.requestBook(payload);
    setRequestModal(null);
      notify("Borrow request sent.");
      await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  }
}
async function approve(id) {
  try {
    await api.approve(id);
      notify("Request approved and loan started.");
      await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  }
}
async function reject(id) {
  askConfirm("Are you sure you want to reject this request?", async () => {
    try {
      await api.reject(id);
      notify("Request rejected.");
      await reloadCurrentView();
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
      await reloadCurrentView();
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
  return <div>Loading...</div>;
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
      {view === "dashboard" && stats && (
        <Dashboard
          stats={stats}
          me={me}
          dailyThought={dailyThought}
          openDetails={openDetails}
        />
      )}
      {view !== "home" && view !== "catalog" && view !== "dashboard" && (
        <section className="topbar">
          <div className="page-title">
            { }
            <h2>BA Reading Community Tracker</h2>
            <p>Share books, discover reads across the capability, manage approvals, and track returns without spreadsheet drift.</p>
          </div>
          <div>
            <button className="btn primary" onClick={() => setBookModal({ ...blankBook })}><Plus size={17} /> Add book</button>
          </div>
        </section>
      )}
      {
      }
      {view === "home" && (
        <HomePage
          stats={stats}
          dailyThought={dailyThought}
          navigateTo={navigateTo}
          setFilters={setFilters}
          setBookModal={setBookModal}
        />
      )}
      {view === "catalog" && (
        <Catalog
          page={booksPage}
          genres={genres}
          filters={filters}
          setFilters={setFilters}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          loading={catalogLoading}
          me={me}
          openDetails={openDetails}
          setRequestModal={setRequestModal}
          setBookModal={setBookModal}
          returnBook={returnBook}
          onRefresh={loadCatalogFromApi}
        />
      )}
      {view === "requests" && <Requests page={requestsPage} onPageChange={loadRequests} me={me} approve={approve} reject={reject} openDetails={openDetails} returnBook={returnBook} onRefresh={() => loadRequests(requestsPage.page)} />}
      {view === "myBooks" && <MyBooks page={myBooksPage} onPageChange={loadMyBooks} setBookModal={setBookModal} deleteBook={deleteBook} openDetails={openDetails} onRefresh={() => loadMyBooks(myBooksPage.page)} />}
      {view === "borrowed" && <Borrowed page={borrowedPage} onPageChange={loadBorrowed} returnBook={returnBook} openDetails={openDetails} onRefresh={() => loadBorrowed(borrowedPage.page)} />}
      {view === "history" && <LoanHistory page={historyPage} onPageChange={loadHistory} onRefresh={() => loadHistory(historyPage.page)} />}
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
    {pageLoading && <PageLoader />}
    {bookModal && <BookModal book={bookModal} genres={genres} onClose={() => setBookModal(null)} onSave={saveBook} />}
    {requestModal && <RequestModal book={requestModal} onClose={() => setRequestModal(null)} onSave={sendRequest} />}
    <ConfirmDialog
      message={confirm?.message}
      onConfirm={() => resolveConfirm(true)}
      onCancel={() => resolveConfirm(false)}
    />
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
