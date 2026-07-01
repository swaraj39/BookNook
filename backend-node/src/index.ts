import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { AuthController } from "./controllers/auth.controller";
import { AppController } from "./controllers/app.controller";
import { authenticate } from "./middleware/auth";
import { errorHandler, logError } from "./middleware/error";
import { getSafeErrorMessage, getStatusCode } from "./utils/app-error";
dotenv.config();
const app = express();
const port = process.env.PORT || 8080;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const allowedOrigins = [
  frontendUrl,
  "http://127.0.0.1:5173",
  "https://booknook-74lk.onrender.com",
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.sendStatus(204);
  }
  next();
});
app.use(cookieParser());
app.use(express.json());
app.post("/api/auth/register", AuthController.register);
app.post("/api/auth/login", AuthController.login);
app.post("/api/auth/logout", AuthController.logout);
app.post("/api/auth/forgot-password/request", AuthController.forgotPasswordRequest);
app.post("/api/auth/forgot-password/verify-otp", AuthController.forgotPasswordVerifyOtp);
app.post("/api/auth/forgot-password/reset", AuthController.forgotPasswordReset);

// App routes
app.get("/api/me", authenticate, AppController.me);
app.get("/api/genres", authenticate, AppController.genres);
app.get("/api/dashboard", authenticate, AppController.dashboard);
app.get("/api/books", authenticate, AppController.catalog);
app.get("/api/books/mine", authenticate, AppController.myBooks);
app.get("/api/books/:id", authenticate, AppController.getBook);
app.get("/api/books/:id/history", authenticate, AppController.bookHistory);
app.post("/api/books", authenticate, AppController.createBook);
app.post("/api/books/import", authenticate, AppController.importBooks);
app.patch("/api/books/:id", authenticate, AppController.updateBook);
app.delete("/api/books/:id", authenticate, AppController.deleteBook);

// Author routes
app.get("/api/authors", authenticate, AppController.authors);
app.post("/api/authors", authenticate, AppController.createAuthor);

// Workflow routes
app.get("/api/borrow-requests", authenticate, AppController.myRequests);
app.post("/api/borrow-requests", authenticate, AppController.requestBook);
app.post("/api/borrow-requests/:id/approve", authenticate, AppController.approveRequest);
app.post("/api/borrow-requests/:id/reject", authenticate, AppController.rejectRequest);
app.get("/api/loans/borrowed", authenticate, AppController.borrowed);
app.get("/api/loans/history", authenticate, AppController.loanHistory);
app.post("/api/loans/:id/return", authenticate, AppController.returnBook);
app.get("/api/all/books", authenticate, AppController.exportBooks);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/quote/today", async (req, res) => {
  try {
    const response = await fetch("https://dummyjson.com/quotes/random");
    if (!response.ok) {
      return res.status(response.status).json({
        message: "ZenQuotes API failed",
        status: response.status,
      });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    logError(error, req);
    res.status(getStatusCode(error)).json({
      message: getSafeErrorMessage(error),
    });
  }
});
app.use(errorHandler);
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
