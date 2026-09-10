import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { AuthController } from "./controllers/auth.controller";
import { AppController } from "./controllers/app.controller";
import { HelpdeskController } from "./controllers/helpdesk.controller";
import { authenticate } from "./middleware/auth";
import { errorHandler, logError } from "./middleware/error";
import { getSafeErrorMessage, getStatusCode } from "./utils/app-error";
import { ReminderService } from "./services/reminder.service";
dotenv.config();
const app = express();
const port = process.env.PORT || 8080;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(
  cors({
    origin: [
      frontendUrl,
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());
app.post("/api/auth/register", AuthController.register);
app.post("/api/auth/login", AuthController.login);
app.post("/api/auth/logout", AuthController.logout);
app.post("/api/auth/signup/verify-otp", AuthController.signupVerifyOtp);
app.post("/api/auth/signup/resend-otp", AuthController.signupResendOtp);
app.post("/api/auth/signup/verify-magic-link", AuthController.signupVerifyMagicLink);
app.post("/api/auth/forgot-password/request", AuthController.forgotPasswordRequest);
app.post("/api/auth/forgot-password/verify-otp", AuthController.forgotPasswordVerifyOtp);
app.post("/api/auth/forgot-password/reset", AuthController.forgotPasswordReset);

// App routes
app.get("/api/me", authenticate, AppController.me);
app.get("/api/genres", authenticate, AppController.genres);
app.get("/api/leaderboard", authenticate, AppController.leaderboard);
app.get("/api/dashboard", authenticate, AppController.dashboard);
app.get("/api/books", authenticate, AppController.catalog);
app.get("/api/books/mine", authenticate, AppController.myBooks);
app.get("/api/books/:id", authenticate, AppController.getBook);
app.get("/api/books/:id/history", authenticate, AppController.bookHistory);
app.get("/api/books/:id/reviews", authenticate, AppController.bookReviews);
app.post("/api/books/:id/reviews", authenticate, AppController.createReview);
app.patch("/api/reviews/:id", authenticate, AppController.updateReview);
app.delete("/api/reviews/:id", authenticate, AppController.deleteReview);
app.post("/api/books", authenticate, AppController.createBook);
app.post("/api/books/import", authenticate, AppController.importBooks);
app.patch("/api/books/:id", authenticate, AppController.updateBook);
app.delete("/api/books/:id", authenticate, AppController.deleteBook);
app.get("/api/users", authenticate, AppController.listUsers);
app.patch("/api/users/:id", authenticate, AppController.updateUser);

// Workflow routes
app.get("/api/borrow-requests", authenticate, AppController.myRequests);
app.get("/api/borrow-requests/review", authenticate, AppController.reviewRequest);
app.post("/api/borrow-requests", authenticate, AppController.requestBook);
app.post("/api/borrow-requests/:id/approve", authenticate, AppController.approveRequest);
app.post("/api/borrow-requests/:id/reject", authenticate, AppController.rejectRequest);
app.post("/api/borrow-requests/:id/cancel", authenticate, AppController.cancelRequest);
app.get("/api/loans/borrowed", authenticate, AppController.borrowed);
app.get("/api/loans/history", authenticate, AppController.loanHistory);
app.post("/api/loans/:id/return", authenticate, AppController.returnBook);
app.get("/api/all/books", authenticate, AppController.exportBooks);
app.post("/api/helpdesk", authenticate, HelpdeskController.submit);
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});
app.get("/api/quote/today", async (req, res) => {
  const fallbackQuotes = [
    { q: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", a: "George R.R. Martin" },
    { q: "The only thing you absolutely have to know is the location of the library.", a: "Albert Einstein" },
    { q: "I have always imagined that Paradise will be a kind of library.", a: "Jorge Luis Borges" },
    { q: "There is no friend as loyal as a book.", a: "Ernest Hemingway" },
    { q: "A room without books is like a body without a soul.", a: "Marcus Tullius Cicero" },
  ];

  try {
    const response = await fetch("https://zenquotes.io/api/today");
    if (response.ok) {
      const data: any = await response.json();
      return res.json(data[0]);
    }
  } catch (error) {
    logError(error, req);
  }

  res.json(fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]);
});
// JSON 404 for unmatched routes (Express's default is an HTML error page)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});
app.use(errorHandler);

cron.schedule("11 12 * * *", async () => {
  console.log("Running re-engagement reminder job...");
  try {
    await ReminderService.processReminders();
  } catch (error) {
    console.error("Re-engagement reminder job failed:", error);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
