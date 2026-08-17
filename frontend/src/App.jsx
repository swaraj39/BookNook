import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  CheckSquare,
  Home as HomeIcon,
  History,
  LibraryBig,
  LogOut,
  Moon,
  RotateCcw,
  Sun,
  Undo2,
  Search,
  Globe,
  User as UserIcon,
  Users as UsersIcon,
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
import { UserModal } from "./components/UserModal";
import { RequestModal } from "./components/RequestModal";
import { SlackShareModal } from "./components/SlackShareModal";
import { ToastContainer } from "./components/common/Toast";
import { Login } from "./pages/Login";
import { VerifyMagicLink } from "./pages/VerifyMagicLink";
import { ReviewRequest } from "./pages/ReviewRequest";
import { Catalog } from "./pages/Catalog";
import { Dashboard } from "./pages/Dashboard";
import { Requests } from "./pages/Requests";
import { MyLibrary } from "./pages/MyLibrary";
import { LoanHistory } from "./pages/LoanHistory";
import { Users } from "./pages/Users";
import { Guide } from './pages/Guide';
import { Details } from "./pages/Details";
import { initials } from "./utils/helpers";
import { ConfirmDialog } from "./components/common/ConfirmDialog";
import { PageLoader } from "./components/common/PageLoader";
import logo from "./styles/blue_altair_logo-removebg-preview.png";
const VALID_VIEWS = new Set(["dashboard", "home", "catalog", "requests", "myBooks", "borrowed", "myLibrary", "history", "detail", "guide", "users"]);
function getStoredView() {
  const storedView = localStorage.getItem("bn_view") || "dashboard";
  const mapped = storedView === "myBooks" || storedView === "borrowed" ? "myLibrary" : storedView;
  return VALID_VIEWS.has(mapped) ? mapped : "dashboard";
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
const CATALOG_FETCH_SIZE = 1000;
const CATALOG_PAGE_SIZE = 20;
// Same "fetch everything once, paginate on the client" strategy used for the
// catalog, reused for Requests / My Books / Borrowed / History / Book
// History so paging through those lists never triggers another API call.
const LIST_FETCH_SIZE = 1000;
const LIST_PAGE_SIZE = 20;
const DASHBOARD_CACHE_TTL = 30000; // 30 seconds
function paginateList(list, pageIndex, pageSize = LIST_PAGE_SIZE) {
  const totalElements = list.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePage = Math.min(Math.max(pageIndex, 0), totalPages - 1);
  const start = safePage * pageSize;
  return {
    content: list.slice(start, start + pageSize),
    totalElements,
    totalPages,
    page: safePage
  };
}
// Single source of truth for how a book maps to one of the status buckets
// shown in the catalog capsules. Every book lands in exactly one bucket, so
// the per-tab counts always sum to the "All" count.
function bookStatusBucket(book) {
  if (book.availabilityStatus === "available") return "available";
  if (book.isBorrowedByMe) return "borrowed_by_me";
  if (book.availabilityStatus === "request_pending" && book.isPendingByMe) return "request_pending";
  return "unavailable";
}
function matchesCapsule(book, capsule) {
  if (capsule === "all") return true;
  return bookStatusBucket(book) === capsule;
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
  const [reviewToken, setReviewToken] = useState(
    () => new URLSearchParams(window.location.search).get("review") || null
  );
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
  const isAdmin = me?.role === "ADMIN";
  const [stats, setStats] = useState(null);
  const [genres, setGenres] = useState([]);
  const [catalogBooks, setCatalogBooks] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [requestsPageIndex, setRequestsPageIndex] = useState(0);
  const [allMyBooks, setAllMyBooks] = useState([]);
  const [myBooksPageIndex, setMyBooksPageIndex] = useState(0);
  const [allBorrowed, setAllBorrowed] = useState([]);
  const [borrowedPageIndex, setBorrowedPageIndex] = useState(0);
  const [allHistory, setAllHistory] = useState([]);
  const [historyPageIndex, setHistoryPageIndex] = useState(0);
  const [allUsers, setAllUsers] = useState([]);
  const [usersPageIndex, setUsersPageIndex] = useState(0);
  const [allBookHistory, setAllBookHistory] = useState([]);
  const [bookHistoryPageIndex, setBookHistoryPageIndex] = useState(0);
  const [selectedBook, setSelectedBook] = useState(null);
  const [filters, setFilters] = useState({ search: "", genreId: "", availability: "all", sort: "title", page: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [bookModal, setBookModal] = useState(null);
  const [requestModal, setRequestModal] = useState(null);
  const [slackShareModal, setSlackShareModal] = useState(null);
  const [userModal, setUserModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [pageLoading, setPageLoading] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dailyThought, setDailyThought] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const navRef = useRef(null);
  const dashboardLastFetchedRef = useRef(0);
  const dailyQuoteDateRef = useRef("");
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [allBooks, setAllBooks] = useState([]);
  // Capsule filtering happens entirely in memory against the last fetched
  // catalogBooks list - this never triggers a network request. The flow is:
  //
  //   catalogBooks -> (search + genre + sort) -> baseCatalogBooks
  //                        |---> catalogStatusCounts (status-independent)
  //                        +---> (selected status capsule) -> filteredCatalogBooks
  //
  // Counts are always derived from the base (non-status) filtered dataset, so
  // selecting a status tab never changes the other tabs' counts.
  const baseCatalogBooks = useMemo(
    () => {
      let books = catalogBooks;

      // Text search (title, author, owner, description)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        books = books.filter((book) =>
          (book.title && book.title.toLowerCase().includes(term)) ||
          (book.author && book.author.toLowerCase().includes(term)) ||
          (book.owner?.fullName && book.owner.fullName.toLowerCase().includes(term)) ||
          (book.description && book.description.toLowerCase().includes(term))
        );
      }

      // Genre filter
      if (filters.genreId) {
        books = books.filter((book) => (book.genreId || book.genre?.id) === filters.genreId);
      }

      // Sort
      const sorted = [...books];
      if (filters.sort === "newest") {
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (filters.sort === "due") {
        sorted.sort((a, b) => {
          const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
          const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
          return aDue - bDue;
        });
      } else {
        sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      }

      return sorted;
    },
    [catalogBooks, searchTerm, filters.genreId, filters.sort]
  );
  // Status counts come from the base dataset only. The selected capsule is
  // intentionally excluded from these dependencies.
  const catalogStatusCounts = useMemo(() => {
    const counts = {
      all: baseCatalogBooks.length,
      available: 0,
      request_pending: 0,
      borrowed_by_me: 0,
      unavailable: 0,
    };
    for (const book of baseCatalogBooks) {
      counts[bookStatusBucket(book)] += 1;
    }
    return counts;
  }, [baseCatalogBooks]);
  // The selected status capsule only narrows the base dataset into what gets
  // displayed - it never feeds back into catalogStatusCounts above.
  const filteredCatalogBooks = useMemo(
    () => {
      if (filters.availability === "all") return baseCatalogBooks;
      return baseCatalogBooks.filter((book) => matchesCapsule(book, filters.availability));
    },
    [baseCatalogBooks, filters.availability]
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
  // Same idea as booksPage above: the full list is fetched once per view/
  // refresh, and paging just re-slices it in memory - no extra API calls.
  const requestsPage = useMemo(
    () => paginateList(allRequests, requestsPageIndex, LIST_FETCH_SIZE),
    [allRequests, requestsPageIndex]
  );
  const myBooksPage = useMemo(
    () => paginateList(allMyBooks, myBooksPageIndex),
    [allMyBooks, myBooksPageIndex]
  );
  const borrowedPage = useMemo(
    () => paginateList(allBorrowed, borrowedPageIndex),
    [allBorrowed, borrowedPageIndex]
  );
  const historyPage = useMemo(
    () => paginateList(allHistory, historyPageIndex),
    [allHistory, historyPageIndex]
  );
  const bookHistoryPage = useMemo(
    () => paginateList(allBookHistory, bookHistoryPageIndex),
    [allBookHistory, bookHistoryPageIndex]
  );
  const usersPage = useMemo(
    () => paginateList(allUsers, usersPageIndex),
    [allUsers, usersPageIndex]
  );
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
    if (!el) return;
    el.addEventListener("scroll", checkNavScroll);
    // Content (nav items) can change width without the nav element's own
    // box resizing - e.g. the admin-only "Users" item appearing once `me`
    // loads. A MutationObserver reacts to that directly, rather than
    // relying on guessing every state value that might add/remove items.
    const mutationObserver = new MutationObserver(checkNavScroll);
    mutationObserver.observe(el, { childList: true, subtree: true });
    // The nav's own box can also resize independently of its content -
    // e.g. the browser window being resized - which the MutationObserver
    // above won't catch.
    const resizeObserver = new ResizeObserver(checkNavScroll);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", checkNavScroll);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [view, stats, isAdmin, checkNavScroll]);
  const [confirm, setConfirm] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("bn_theme", darkMode ? "dark" : "light");
  }, [darkMode]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const today = new Date().toISOString().slice(0, 10);
    if (dailyQuoteDateRef.current === today) return;
    let cancelled = false;
    fetch(`${API_URL}/quote/today`)
      .then((response) => (response.ok ? response.json() : null))
      .then((quote) => {
        if (cancelled) return;
        if (quote) {
          setDailyThought(quote);
          dailyQuoteDateRef.current = today;
        }
      })
      .catch((error) => {
        if (!cancelled) console.error("Failed to fetch daily quote:", error);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, API_URL]);
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
    if (isAuthenticated && view === "catalog") {
      loadCatalogFromApi();
    }
  }, [isAuthenticated, view]);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (view === "catalog" || view === "home" || view === "detail") {
      setPageLoading(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!cancelled) setPageLoading(view);
        switch (view) {
          case "dashboard": {
            if (stats && Date.now() - dashboardLastFetchedRef.current < DASHBOARD_CACHE_TTL) {
              if (!cancelled) setPageLoading(null);
              break;
            }
            const data = await api.dashboard();
            dashboardLastFetchedRef.current = Date.now();
            if (!cancelled) setStats(data);
            break;
          }
          case "requests": {
            const data = await api.requests(0, LIST_FETCH_SIZE);
            if (!cancelled) {
              setAllRequests(data.content || []);
              setRequestsPageIndex(0);
            }
            break;
          }
          case "myBooks":
          case "borrowed":
          case "myLibrary": {
            const [booksData, borrowedData] = await Promise.all([
              api.myBooks(0, LIST_FETCH_SIZE),
              api.borrowed(0, LIST_FETCH_SIZE)
            ]);
            if (!cancelled) {
              setAllMyBooks(booksData.content || []);
              setAllBorrowed(borrowedData.content || []);
              setMyBooksPageIndex(0);
              setBorrowedPageIndex(0);
            }
            break;
          }
          case "history": {
            const data = await api.loanHistory(0, LIST_FETCH_SIZE);
            if (!cancelled) {
              setAllHistory(data.content || []);
              setHistoryPageIndex(0);
            }
            break;
          }
          case "users": {
            const data = await api.users(0, LIST_FETCH_SIZE);
            if (!cancelled) {
              setAllUsers(data.content || []);
              setUsersPageIndex(0);
            }
            break;
          }
        }
      } catch (error) {
        if (!cancelled) notify(error?.message || "Something went wrong loading this page.", "error");
      } finally {
        if (!cancelled) setPageLoading(null);
      }
    })();
    return () => { cancelled = true; setPageLoading(null); };
  }, [view, isAuthenticated]);
  useEffect(() => {
    async function restoreDetailPage() {
      if (!isAuthenticated || view !== "detail" || !selectedBookId || selectedBook) return;
      setDetailsLoading(true);
      try {
        const [freshBook, history] = await Promise.all([
          api.book(selectedBookId),
          api.bookHistory(selectedBookId, 0, LIST_FETCH_SIZE)
        ]);
        setSelectedBook(freshBook);
        setAllBookHistory(history.content || []);
        setBookHistoryPageIndex(0);
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
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }
    localStorage.removeItem("bn_token");
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
function finishReview() {
  setReviewToken(null);
  const url = new URL(window.location.href);
  url.searchParams.delete("review");
  window.history.replaceState({}, "", url.toString());
  setSelectedBook(null);
  setSelectedBookId(null);
  setNavStack(["dashboard"]);
  setView("dashboard");
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
async function loadCatalogFromApi() {
  try {
    setCatalogLoading(true);
    const result = await api.books({ availability: "all", page: 0, size: CATALOG_FETCH_SIZE });
    setCatalogBooks(result.content || []);
  } catch (error) {
    notify(error.message, "error");
  } finally {
    setCatalogLoading(false);
  }
}
// Fetch the entire list ONCE per refresh; pagination after this is purely
// client-side (see requestsPage/myBooksPage/etc useMemo above), so paging
// through these lists never hits the API again.
async function loadRequestsFromApi() {
  try {
    const data = await api.requests(0, LIST_FETCH_SIZE);
    setAllRequests(data.content || []);
  } catch (error) {
    notify(error.message, "error");
  }
}
async function loadMyBooksFromApi() {
  try {
    const data = await api.myBooks(0, LIST_FETCH_SIZE);
    setAllMyBooks(data.content || []);
  } catch (error) {
    notify(error.message, "error");
  }
}
async function loadBorrowedFromApi() {
  try {
    const data = await api.borrowed(0, LIST_FETCH_SIZE);
    setAllBorrowed(data.content || []);
  } catch (error) {
    notify(error.message, "error");
  }
}
async function loadHistoryFromApi() {
  try {
    const data = await api.loanHistory(0, LIST_FETCH_SIZE);
    setAllHistory(data.content || []);
  } catch (error) {
    notify(error.message, "error");
  }
}
async function loadUsersFromApi() {
  try {
    const data = await api.users(0, LIST_FETCH_SIZE);
    setAllUsers(data.content || []);
  } catch (error) {
    notify(error.message, "error");
  }
}
async function loadBookHistoryFromApi(id) {
  try {
    const data = await api.bookHistory(id, 0, LIST_FETCH_SIZE);
    setAllBookHistory(data.content || []);
    setBookHistoryPageIndex(0);
  } catch (error) {
    notify(error.message, "error");
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
        await loadRequestsFromApi();
        break;
      }
      case "myBooks":
      case "borrowed":
      case "myLibrary": {
        await Promise.all([loadMyBooksFromApi(), loadBorrowedFromApi()]);
        break;
      }
      case "history": {
        await loadHistoryFromApi();
        break;
      }
      case "users": {
        await loadUsersFromApi();
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
// These are wired up as onPageChange for their respective lists. Since the
// full list is already in memory (see loadRequestsFromApi & friends), paging
// is just moving the local page index - no network request involved.
function loadRequests(page) {
  setRequestsPageIndex(page);
}
function loadMyBooks(page) {
  setMyBooksPageIndex(page);
}
function loadBorrowed(page) {
  setBorrowedPageIndex(page);
}
function loadHistory(page) {
  setHistoryPageIndex(page);
}
function loadUsers(page) {
  setUsersPageIndex(page);
}
function changeBookHistoryPage(page) {
  setBookHistoryPageIndex(page);
}
function bustDashboardCache() {
  dashboardLastFetchedRef.current = 0;
}
async function openDetails(book) {
  setDetailsLoading(true);
  try {
    const freshBook = await api.book(book.id);
    setSelectedBook(freshBook);
    setSelectedBookId(book.id);
    await loadBookHistoryFromApi(book.id);
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
    bustDashboardCache();
    await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  }
}
async function saveUser(payload) {
  try {
    await api.updateUser(userModal.id, payload);
    setUserModal(null);
    notify("User updated.");
    await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  }
}
async function toggleUserStatus(user) {
  const nextStatus = user.status === "active" ? "inactive" : "active";
  async function applyStatusChange() {
    try {
      await api.updateUser(user.id, { status: nextStatus });
      notify(nextStatus === "active" ? "User activated." : "User deactivated.");
      await reloadCurrentView();
    } catch (error) {
      notify(error.message, "error");
    }
  }
  if (nextStatus === "inactive") {
    askConfirm(`Deactivate ${user.fullName}? They will be immediately signed out and unable to log back in.`, applyStatusChange);
  } else {
    await applyStatusChange();
  }
}
async function deleteBook(id) {
  askConfirm("Are you sure you want to remove this book from the library? This cannot be undone.", async () => {
    try {
      await api.deleteBook(id);
      notify("Book deleted.");
      bustDashboardCache();
      await reloadCurrentView();
    } catch (error) {
      notify(error.message, "error");
    }
  });
  return;
}
async function sendRequest(payload) {
  try {
    const result = await api.requestBook(payload);
    setRequestModal(null);
      notify("Borrow request sent.");
      bustDashboardCache();
      await reloadCurrentView();
      if (result?.reviewToken) {
        setSlackShareModal(result);
      }
  } catch (error) {
    notify(error.message, "error");
  }
}
async function approve(id) {
  try {
    await api.approve(id);
      notify("Request approved and loan started.");
      bustDashboardCache();
      await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  }
}
async function reject(id) {
  try {
    await api.reject(id);
    notify("Request rejected.");
    await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  }
}
async function cancelRequest(id, bookTitle) {
  askConfirm(`Cancel your request for "${bookTitle}"?`, async () => {
    try {
      await api.cancelRequest(id);
      notify("Request cancelled.");
    } catch (error) {
      console.error("Cancel request failed:", error);
    }
    await reloadCurrentView();
  });
}

async function returnBook(id, bookTitle) {
  askConfirm(`Return "${bookTitle}"? This will mark the book as returned.`, async () => {
    try {
      await api.returnBook(id);
      notify("Book marked as returned.");
      bustDashboardCache();
      await reloadCurrentView();
    } catch (error) {
      notify(error.message, "error");
    }
  });
}
async function importBooks(file) {
  setImporting(true);
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length === 0) {
      notify("That file doesn't have any rows to import.", "error");
      return;
    }
    const result = await api.importBooks(rows);
    const { imported = 0, skipped = 0, failed = 0 } = result || {};
    const parts = [`${imported} book${imported === 1 ? "" : "s"} imported`];
    if (skipped) parts.push(`${skipped} skipped`);
    if (failed) parts.push(`${failed} failed`);
    notify(parts.join(", ") + ".", failed ? "error" : "success");
    bustDashboardCache();
    await reloadCurrentView();
  } catch (error) {
    notify(error.message, "error");
  } finally {
    setImporting(false);
  }
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
      ["myLibrary", "My Shelf", LibraryBig],
      ["history", "History", History],
      ["guide", "Guide", Info]
    ]
  },
  ...(isAdmin ? [{
    label: "Admin",
    items: [
      ["users", "Users", UsersIcon]
    ]
  }] : [])
];
if (authChecking) {
  return <PageLoader fullPage />;
}
if (reviewToken) {
  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }
  return (
    <>
      <ReviewRequest token={reviewToken} notify={notify} onDone={finishReview} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
if (!isAuthenticated) {
  const urlParams = new URLSearchParams(window.location.search);
  const hasVerifyToken = urlParams.has("token");

  if (hasVerifyToken) {
    return (
      <>
        <VerifyMagicLink onLogin={handleLogin} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <>
      <Login onLogin={handleLogin} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
return (
  <div className="app-shell">
    {/* Top Header Bar */}
    <aside className="sidebar">
      <button className="brand" onClick={() => navigateTo("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
        <img className="brand-mark" src={logo} alt="Book Nook Logo" />
        <div>
          <h1>Book Nook</h1>
          <p>BA Reading Community</p>
        </div>
      </button>

      {/* Desktop Navigation (Hidden on Mobile via CSS) */}
      <div className="nav-scroll-wrap desktop-nav-only">
        <button className={`nav-scroll-btn left ${canScrollLeft ? "" : "hidden"}`} onClick={() => scrollNav(-1)} aria-label="Scroll left">
          <ChevronLeft size={18} />
        </button>
        <nav className="nav" ref={navRef} onScroll={checkNavScroll}>
          {navSections.map((section) => (
            <div key={section.label} className="nav-section">
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

      {/* Actions (Dark Mode + Profile) */}
      <div className="top-nav-actions">
        <button className="btn icon-only" onClick={() => setDarkMode(!darkMode)} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {me && (
          <div ref={profileDropdownRef} className="profile-dropdown-container" style={{ position: "relative" }}>
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

    {/* Dedicated Mobile Bottom Tab Bar */}
    <nav className="mobile-bottom-nav">
      {navSections.flatMap(s => s.items).map(([id, label, Icon, badge]) => (
        <button key={id} className={`mobile-bottom-nav-item ${view === id ? "active" : ""}`} onClick={() => navigateTo(id)}>
          <div className="mobile-bottom-nav-item-content">
            <Icon size={20} />
            <span>{label}</span>
          </div>
          {badge > 0 && <span className="nav-badge mobile-nav-badge">{badge}</span>}
        </button>
      ))}
    </nav>

    {/* Main Content Area */}
    <main className="main">
      {view === "dashboard" && stats && (
        <Dashboard stats={stats} me={me} dailyThought={dailyThought} openDetails={openDetails} onNavigate={navigateTo} setFilters={setFilters} />
      )}

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
          statusCounts={catalogStatusCounts}
          loading={catalogLoading}
          me={me}
          openDetails={openDetails}
          setRequestModal={setRequestModal}
          setBookModal={setBookModal}
          returnBook={returnBook}
          importBooks={importBooks}
          importing={importing}
          onRefresh={loadCatalogFromApi}
        />
      )}
      {view === "requests" && <Requests page={requestsPage} onPageChange={loadRequests} me={me} approve={approve} reject={reject} openDetails={openDetails} returnBook={returnBook} onCancelRequest={cancelRequest} onRefresh={loadRequestsFromApi} navigateTo={navigateTo} />}
      {(view === "myLibrary" || view === "myBooks" || view === "borrowed") && (
        <MyLibrary
          myBooksPage={myBooksPage}
          onMyBooksPageChange={loadMyBooks}
          borrowedPage={borrowedPage}
          onBorrowedPageChange={loadBorrowed}
          setBookModal={setBookModal}
          deleteBook={deleteBook}
          returnBook={returnBook}
          openDetails={openDetails}
          onRefreshShelf={loadMyBooksFromApi}
          onRefreshReading={loadBorrowedFromApi}
          initialTab={view === "borrowed" ? "reading" : "shelf"}
        />
      )}
      {view === "history" && <LoanHistory page={historyPage} onPageChange={loadHistory} onRefresh={loadHistoryFromApi} openDetails={openDetails} />}
      {view === "users" && <Users page={usersPage} onPageChange={loadUsers} me={me} onEditUser={setUserModal} onToggleStatus={toggleUserStatus} onRefresh={loadUsersFromApi} />}
      {view === "detail" && selectedBook && (
        <Details book={selectedBook} historyPage={bookHistoryPage} onPageChange={changeBookHistoryPage} me={me} navigateBack={navigateBack} navigateTo={navigateTo} setBookModal={setBookModal} setRequestModal={setRequestModal} returnBook={returnBook} />
      )}
      {view === "guide" && <Guide/> }
    </main>
    
    {/* Dedicated Mobile Bottom Tab Bar (Strictly hidden on Laptop/Desktop) */}
    <nav className="mobile-bottom-nav">
      {navSections.flatMap(s => s.items).map(([id, label, Icon, badge]) => (
        <button key={id} className={`mobile-bottom-nav-item ${view === id ? "active" : ""}`} onClick={() => navigateTo(id)}>
          <div className="mobile-bottom-nav-item-content">
            <Icon size={19} />
            <span>{label}</span>
          </div>
          {badge > 0 && <span className="nav-badge mobile-nav-badge">{badge}</span>}
        </button>
      ))}
    </nav>

    {pageLoading && <PageLoader />}
    {bookModal && <BookModal book={bookModal} genres={genres} onClose={() => setBookModal(null)} onSave={saveBook} onNotify={notify} />}
    {userModal && <UserModal user={userModal} onClose={() => setUserModal(null)} onSave={saveUser} />}
    {requestModal && <RequestModal book={requestModal} onClose={() => setRequestModal(null)} onSave={sendRequest} />}
    {slackShareModal && <SlackShareModal request={slackShareModal} onClose={() => setSlackShareModal(null)} />}
    <ConfirmDialog message={confirm?.message} onConfirm={() => resolveConfirm(true)} onCancel={() => resolveConfirm(false)} />
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