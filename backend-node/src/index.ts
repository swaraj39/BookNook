import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { AuthController } from "./controllers/auth.controller";
import { AppController } from "./controllers/app.controller";
import { authenticate } from "./middleware/auth";
import { errorHandler } from "./middleware/error";
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
    console.error("Quote API error:", error.message);
    res.status(500).json({
    });
  }
});
app.use(errorHandler);
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});