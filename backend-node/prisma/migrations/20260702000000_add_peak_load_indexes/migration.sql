CREATE INDEX IF NOT EXISTS "books_owner_id_visibility_status_idx"
ON "books" ("owner_id", "visibility_status");

CREATE INDEX IF NOT EXISTS "books_genre_id_idx"
ON "books" ("genre_id");

CREATE INDEX IF NOT EXISTS "books_visibility_status_availability_status_idx"
ON "books" ("visibility_status", "availability_status");

CREATE INDEX IF NOT EXISTS "books_created_at_idx"
ON "books" ("created_at");

CREATE INDEX IF NOT EXISTS "book_transactions_owner_id_status_requested_at_idx"
ON "book_transactions" ("owner_id", "status", "requested_at");

CREATE INDEX IF NOT EXISTS "book_transactions_requester_id_status_requested_at_idx"
ON "book_transactions" ("requester_id", "status", "requested_at");

CREATE INDEX IF NOT EXISTS "book_transactions_requester_id_created_at_idx"
ON "book_transactions" ("requester_id", "created_at");

CREATE INDEX IF NOT EXISTS "book_transactions_book_id_status_idx"
ON "book_transactions" ("book_id", "status");

CREATE INDEX IF NOT EXISTS "book_transactions_due_at_idx"
ON "book_transactions" ("due_at");

CREATE INDEX IF NOT EXISTS "book_history_book_id_created_at_idx"
ON "book_history" ("book_id", "created_at");
