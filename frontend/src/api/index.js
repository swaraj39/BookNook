// const API_URL = import.meta.env.VITE_API_URL || "https://booknook-74lk.onrender.com/api";
// Hello
const API_URL = "https://booknook-74lk.onrender.com/api";
function friendlyErrorMessage(message) {
  const text = String(message || "").toLowerCase();
  const looksLikeDatabaseError = [
    "prisma.",
    "prismaclient",
    "error querying the database",
    "emaxconnsession",
    "max clients reached",
    "pool_size",
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
  importBooks: (rows) =>
    request("/books/import", {
      method: "POST",
      body: JSON.stringify({ rows }),
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
