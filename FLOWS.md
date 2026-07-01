# Book Nook: Comprehensive System Flows & Behaviors

This document details the functional workflows of the Book Nook application, covering both successful (Happy Path) and error (Negative Path) scenarios.

---

## 1. User Authentication Lifecycle

### A. User Registration
*   **Happy Path:**
    1.  User enters unique email, password, full name, and capability.
    2.  System hashes the password using BCrypt.
    3.  User is saved to the database with a default role of `USER` and status `active`.
    4.  A JWT token is generated and returned to the frontend.
    5.  User is automatically logged in and redirected to the Dashboard.
*   **Negative Path:**
    *   **Duplicate Email:** System throws `BadRequestException` ("Email already exists").
    *   **Invalid Input:** Missing fields or weak passwords (validated via frontend and backend `@Valid`).

### B. User Login
*   **Happy Path:**
    1.  User enters valid credentials.
    2.  System verifies password match.
    3.  JWT token is returned and stored in `localStorage` (`bn_token`).
*   **Negative Path:**
    *   **Invalid Credentials:** Spring Security returns `401 Unauthorized`.
    *   **Expired Session:** Frontend interceptor detects `401` on any API call, clears the token, and redirects to Login.

---

## 2. Book Management

### A. Adding a New Book
*   **Happy Path:**
    1.  Owner fills out title, author, genre, condition, location, and description.
    2.  System assigns a random cover color based on the title hash.
    3.  Book is saved with status `available` and visibility `visible`.
    4.  An entry is added to the book's history timeline.
*   **Negative Path:**
    *   **Missing Metadata:** Backend validation fails if required fields (like Genre ID) are missing.

### B. Editing/Deleting a Book
*   **Happy Path:**
    1.  Owner modifies book details or marks it as deleted.
    2.  For deletion, book is marked `visibilityStatus = 'deleted'` (soft delete).
*   **Negative Path:**
    *   **Unauthorized Action:** Non-owner tries to edit/delete. System throws `UnauthorizedActionException` (403).
    *   **Active Dependencies:** Owner tries to delete a book that is currently `borrowed` or has `pending` requests. System throws `InvalidBookStateException` (409).

---

## 3. Borrowing Workflow (The Core Engine)

### A. Requesting a Book
*   **Happy Path:**
    1.  Borrower finds an `available` book in the Catalog.
    2.  Borrower submits a request with duration and pickup location.
    3.  Book status changes to `request_pending`.
*   **Negative Path:**
    *   **Self-Request:** Owner tries to request their own book. System throws `WorkflowViolationException`.
    *   **Double Request:** Borrower tries to request a book already in `request_pending` or `borrowed` state. System throws `InvalidBookStateException`.

### B. Approving/Rejecting a Request
*   **Happy Path:**
    1.  Owner views "Requests" and clicks **Approve**.
    2.  A `Loan` record is created with a calculated `dueAt` date.
    3.  Book status changes to `borrowed`.
    4.  **Auto-Cleanup:** All other pending requests for that same book are automatically marked as `expired`.
*   **Negative Path:**
    *   **Stale Approval:** Owner tries to approve a request that was already rejected or expired. System throws `WorkflowViolationException`.

### C. Returning a Book
*   **Happy Path:**
    1.  Borrower clicks **Return** on the "Borrowed" page.
    2.  Loan status changes to `returned`.
    3.  Book status reverts to `available` instantly.
    4.  Activity history is updated.
*   **Negative Path:**
    *   **Unauthorized Return:** Someone other than the borrower tries to trigger the return. System throws `UnauthorizedActionException`.

---

## 4. Discovery & Tracking

### A. Search & Filtering
*   **Search:** Case-insensitive search across Title, Author, Description, and Owner Name.
*   **Genre Filter:** Limits results to a specific UUID.
*   **Availability Filter:** Filters by `available`, `borrowed`, or `request_pending`.

### B. Sorting
*   **Newest:** Uses `createdAt` timestamp.
*   **Title:** Alphabetical sort.
*   **Due Date:** Prioritizes books with the closest return dates; available books are pushed to the end.

### C. Activity Timeline
*   Every major state change (Add, Update, Request, Approve, Return, Delete) generates a permanent `BookHistory` record.
*   These are visible to all users on the Book Details page to provide transparency.

---

## 5. Technical Safety Nets
*   **CORS Protection:** Only authorized frontend origins can talk to the API.
*   **Transactional Integrity:** All multi-step operations (like approving a request and expiring others) are wrapped in `@Transactional` to prevent partial data updates.
*   **Global Exception Handling:** Centralized `ApiExceptionHandler` ensures the frontend always receives a clean JSON error message instead of a raw stack trace.
