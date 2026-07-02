import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { AuthController } from "./controllers/auth.controller";
import { AppController } from "./controllers/app.controller";
import { authenticate } from "./middleware/auth";
import { errorHandler, logError } from "./middleware/error";
import { getSafeErrorMessage, getStatusCode } from "./utils/app-error";
import { ReadCacheService } from "./services/read-cache.service";
dotenv.config();
const app = express();
const port = process.env.PORT || 8080;
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://booknook-74lk.onrender.com",
];
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}
app.use(cors({ origin: allowedOrigins, credentials: true }));
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
    const data = await ReadCacheService.getOrSet("quote:today", 6 * 60 * 60 * 1000, async () => {
      const response = await fetch("https://dummyjson.com/quotes/random");
      if (!response.ok) {
        throw new Error(`Quote API failed with status ${response.status}`);
      }
      return response.json();
    });
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
