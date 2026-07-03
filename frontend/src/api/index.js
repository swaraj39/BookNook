// const API_URL = "https://booknook-gfb8.onrender.com/api";
const API_URL = "https://booknook-74lk.onrender.com/api";
// const API_URL = "http://localhost:8080/api";
// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// --- Frontend cache layer ---
const CACHE_TTL = {
  FAST: 10 * 1000,
  NORMAL: 20 * 1000,
  SLOW: 60 * 1000,
  STATIC: 5 * 60 * 1000,
};
const cache = new Map();
const inflight = new Map();

function getCacheKey(method, path) {
  return `${method}:${path}`;
}

function cachedRequest(path, options = {}, ttl = CACHE_TTL.NORMAL) {
  const method = options.method || "GET";
  if (method !== "GET") return request(path, options);

  const key = getCacheKey(method, path);
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return Promise.resolve(entry.value);

  const running = inflight.get(key);
  if (running) return running;

  const promise = request(path, options).then((data) => {
    cache.set(key, { value: data, expiresAt: Date.now() + ttl });
    return data;
  }).finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

function invalidateCache(prefix) {
  if (!prefix) {
    cache.clear();
    inflight.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(prefix)) inflight.delete(key);
  }
}

function friendlyErrorMessage(message) {
  const text = String(message || "").toLowerCase();
  const looksLikeDatabaseError = [
    "prisma.",
    "prismaclient",
    "error querying the database",
    "emaxconnsession",
    "max clients reached",
    "connection pool",
    "too many connections",
  ].some((needle) => text.includes(needle));

  if (looksLikeDatabaseError) {
    return "The library desk is a bit overloaded right now. Please try again in a moment.";
  }

  if (!message || text === "internal server error") {
    return "Something wobbled on our side. Please try again in a moment.";
  }

  return message;
}

async function request(path, options = {}) {
  const token = localStorage.getItem("bn_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });
  if (
    response.status === 401 &&
    path !== "/auth/login" &&
    path !== "/auth/register"
  ) {
    window.dispatchEvent(new CustomEvent("auth-expired"));
  }
  const text = await response.text();
  if (!response.ok) {
    let message = "Something went wrong.";
    try {
      const body = text ? JSON.parse(text) : {};
      message = body.message || message;
    } catch {
      message = text || message;
    }
    throw new Error(friendlyErrorMessage(message));
  }
  if (response.status === 204) return null;
  return text ? JSON.parse(text) : null;
}

export const api = {
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request("/auth/logout", {
      method: "POST",
    }),
  me: () => cachedRequest("/me", {}, CACHE_TTL.SLOW),
  dashboard: () => cachedRequest("/dashboard", {}, CACHE_TTL.FAST),
  genres: () => cachedRequest("/genres", {}, CACHE_TTL.STATIC),
  books: (params) => {
    const query = new URLSearchParams({ size: 20, ...params });
    return cachedRequest(`/books?${query}`, {}, CACHE_TTL.NORMAL);
  },
  myBooks: (page = 0, size = 20) =>
    cachedRequest(`/books/mine?page=${page}&size=${size}`, {}, CACHE_TTL.NORMAL),
  book: (id) => cachedRequest(`/books/${id}`, {}, CACHE_TTL.NORMAL),
  bookHistory: (id, page = 0, size = 20) =>
    cachedRequest(`/books/${id}/history?page=${page}&size=${size}`, {}, CACHE_TTL.NORMAL),
  createBook: (payload) => {
    invalidateCache("GET:/books");
    return request("/books", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  importBooks: (rows) => {
    invalidateCache();
    return request("/books/import", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  },
  updateBook: (id, payload) => {
    invalidateCache("GET:/books");
    return request(`/books/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  deleteBook: (id) => {
    invalidateCache("GET:/books");
    return request(`/books/${id}`, {
      method: "DELETE",
    });
  },
  requests: (page = 0, size = 20) =>
    cachedRequest(`/borrow-requests?page=${page}&size=${size}`, {}, CACHE_TTL.FAST),
  requestBook: (payload) => {
    invalidateCache();
    return request("/borrow-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  approve: (id) => {
    invalidateCache();
    return request(`/borrow-requests/${id}/approve`, {
      method: "POST",
    });
  },
  reject: (id) => {
    invalidateCache();
    return request(`/borrow-requests/${id}/reject`, {
      method: "POST",
    });
  },
  borrowed: (page = 0, size = 20) =>
    cachedRequest(`/loans/borrowed?page=${page}&size=${size}`, {}, CACHE_TTL.FAST),
  loanHistory: (page = 0, size = 20) =>
    cachedRequest(`/loans/history?page=${page}&size=${size}`, {}, CACHE_TTL.FAST),
  returnBook: (id) => {
    invalidateCache();
    return request(`/loans/${id}/return`, {
      method: "POST",
    });
  },

  forgotPasswordRequest: (email) =>
    request("/auth/forgot-password/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  forgotPasswordVerifyOtp: (email, otp) =>
    request("/auth/forgot-password/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),
  forgotPasswordReset: (email, otp, password) =>
    request("/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify({ email, otp, password }),
    }),
  exportBooks: async () => {
    const token = localStorage.getItem("bn_token");
    const response = await fetch(`${API_URL}/all/books`, {
      method: "GET",
      credentials: "include",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent("auth-expired"));
      throw new Error("Your session has expired. Please sign in again.");
    }
    if (!response.ok) {
      const text = await response.text();
      let message = "Failed to export books.";
      try {
        const body = text ? JSON.parse(text) : {};
        message = body.message || message;
      } catch {
        message = text || message;
      }
      throw new Error(friendlyErrorMessage(message));
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "booknook.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
