const API_URL = "http://localhost:8080/api";
async function request(path, options = {}) {
  const token = localStorage.getItem("bn_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });
  if (response.status === 401) {
    localStorage.removeItem("bn_token");
    window.location.reload();
    throw new Error("Session expired. Please login again.");
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
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return text ? JSON.parse(text) : null;
}
export const api = {
  login: (email, password) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }),
  register: (payload) => request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  }),
  me: () => request("/me"),
  dashboard: () => request("/dashboard"),
  genres: () => request("/genres"),
  books: (params) => {
    const query = new URLSearchParams({ size: 20, ...params });
    return request(`/books?${query}`);
  },
  myBooks: (page = 0, size = 20) => request(`/books/mine?page=${page}&size=${size}`),
  book: (id) => request(`/books/${id}`),
  bookHistory: (id, page = 0, size = 20) => request(`/books/${id}/history?page=${page}&size=${size}`),
  createBook: (payload) => request("/books", { method: "POST", body: JSON.stringify(payload) }),
  updateBook: (id, payload) => request(`/books/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteBook: (id) => request(`/books/${id}`, { method: "DELETE" }),
  requests: (page = 0, size = 20) => request(`/borrow-requests?page=${page}&size=${size}`),
  requestBook: (payload) => request("/borrow-requests", { method: "POST", body: JSON.stringify(payload) }),
  approve: (id) => request(`/borrow-requests/${id}/approve`, { method: "POST" }),
  reject: (id) => request(`/borrow-requests/${id}/reject`, { method: "POST" }),
  borrowed: (page = 0, size = 20) => request(`/loans/borrowed?page=${page}&size=${size}`),
  loanHistory: (page = 0, size = 20) => request(`/loans/history?page=${page}&size=${size}`),
  returnBook: (id) => request(`/loans/${id}/return`, { method: "POST" })
};