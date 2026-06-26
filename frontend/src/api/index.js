// const API_URL = "https://booknook-gfb8.onrender.com/api";
const API_URL = "http://localhost:8080/api";
// const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

function getFriendlyMessage(status, defaultMsg) {
  const map = {
    400: "Plot twist! The server couldn't read your input. Double-check your data's grammar and try again.",
    401: "Your reading pass has expired! Please sign back in to access the secret library archives.",
    403: "Access denied! This section is restricted. Step away from the forbidden scrolls.",
    404: "404: Page not found! This book or chapter seems to have been misplaced by a previous borrower.",
    408: "The server fell asleep reading your request. Give it a coffee break and try again.",
    429: "Whoa, speed reader! Slow down, you're flipping pages faster than our server can read them.",
    500: "The server dropped its giant stack of books. Our tech librarians are currently cleaning up the mess.",
    503: "The digital library is undergoing a structural renovation. We'll be back on the shelves shortly."
  };
  return map[status] || defaultMsg || "An unwritten anomaly occurred. Time to close and reopen the book.";
}

async function request(path, options = {}) {
  const token = localStorage.getItem("bn_token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
    });

    // Only trigger auth-expired for protected routes,
    // not for login/register failures.
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/register"
    ) {
      window.dispatchEvent(new CustomEvent("auth-expired"));
    }

    const text = await response.text();

    if (!response.ok) {
      let serverMessage = "Something went wrong.";
      try {
        const body = text ? JSON.parse(text) : {};
        serverMessage = body.message || serverMessage;
      } catch {
        serverMessage = text || serverMessage;
      }

      // Use the server's specific message if it sent one, otherwise fall back to a witty helper
      const friendlyMsg = getFriendlyMessage(response.status, serverMessage);
      throw new Error(friendlyMsg);
    }

    if (response.status === 204) return null;

    return text ? JSON.parse(text) : null;
  } catch (error) {
    // Handle network errors (e.g., failed to fetch)
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      throw new Error("We couldn't reach the server. Maybe the library is closed? Check your connection and try again.");
    }
    // Re-throw other errors (they should already be user-friendly)
    throw error;
  }
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

  me: () => request("/me"),

  dashboard: () => request("/dashboard"),

  genres: () => request("/genres"),

  books: (params) => {
    const query = new URLSearchParams({ size: 20, ...params });
    return request(`/books?${query}`);
  },

  myBooks: (page = 0, size = 20) =>
    request(`/books/mine?page=${page}&size=${size}`),

  book: (id) => request(`/books/${id}`),

  bookHistory: (id, page = 0, size = 20) =>
    request(`/books/${id}/history?page=${page}&size=${size}`),

  createBook: (payload) =>
    request("/books", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateBook: (id, payload) =>
    request(`/books/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteBook: (id) =>
    request(`/books/${id}`, {
      method: "DELETE",
    }),

  requests: (page = 0, size = 20) =>
    request(`/borrow-requests?page=${page}&size=${size}`),

  requestBook: (payload) =>
    request("/borrow-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  approve: (id) =>
    request(`/borrow-requests/${id}/approve`, {
      method: "POST",
    }),

  reject: (id) =>
    request(`/borrow-requests/${id}/reject`, {
      method: "POST",
    }),

  borrowed: (page = 0, size = 20) =>
    request(`/loans/borrowed?page=${page}&size=${size}`),

  loanHistory: (page = 0, size = 20) =>
    request(`/loans/history?page=${page}&size=${size}`),

  returnBook: (id) =>
    request(`/loans/${id}/return`, {
      method: "POST",
    }),

  exportBooks: async () => {
    try {
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
        const status = response.status;
        const friendly = getFriendlyMessage(status, "Failed to export books.");
        throw new Error(friendly);
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
    } catch (error) {
      // Handle network errors for export as well
      if (error.name === "TypeError" && error.message === "Failed to fetch") {
        throw new Error("We couldn't reach the server. Maybe the library is closed? Check your connection and try again.");
      }
      throw error;
    }
  },
};
