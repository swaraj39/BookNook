-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(191) NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(180) NOT NULL,
    "team" VARCHAR(120) NULL,
    "role" VARCHAR(40) NOT NULL DEFAULT 'member',
    "status" VARCHAR(40) NOT NULL DEFAULT 'active',
    "avatar_initials" VARCHAR(8) NULL,
    "avatar_url" TEXT NULL,
    "password" VARCHAR(255) NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable
CREATE TABLE "genres" (
    "id" VARCHAR(191) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "display_order" INTEGER NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateTable
CREATE TABLE "books" (
    "id" VARCHAR(191) NOT NULL,
    "owner_id" VARCHAR(191) NOT NULL,
    "genre_id" VARCHAR(191) NULL,
    "title" VARCHAR(220) NOT NULL,
    "author" VARCHAR(180) NOT NULL,
    "isbn" VARCHAR(30) NULL,
    "description" TEXT NULL,
    "condition" VARCHAR(40) NOT NULL DEFAULT 'good',
    "default_loan_days" INTEGER NOT NULL DEFAULT 14,
    "availability_status" VARCHAR(40) NOT NULL DEFAULT 'available',
    "visibility_status" VARCHAR(40) NOT NULL DEFAULT 'visible',
    "cover_color" VARCHAR(20) NULL,
    "cover_url" TEXT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_transactions" (
    "id" VARCHAR(191) NOT NULL,
    "book_id" VARCHAR(191) NOT NULL,
    "requester_id" VARCHAR(191) NOT NULL,
    "owner_id" VARCHAR(191) NOT NULL,
    "status" VARCHAR(40) NOT NULL DEFAULT 'pending',
    "requested_loan_days" INTEGER NOT NULL DEFAULT 14,
    "borrower_note" TEXT NULL,
    "owner_response_note" TEXT NULL,
    "requested_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(6) NULL,
    "expires_at" TIMESTAMP(6) NULL,
    "borrowed_at" TIMESTAMP(6) NULL,
    "due_at" TIMESTAMP(6) NULL,
    "returned_at" TIMESTAMP(6) NULL,
    "borrower_return_note" TEXT NULL,
    "owner_return_note" TEXT NULL,
    "return_confirmed_by_owner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "book_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_history" (
    "id" VARCHAR(191) NOT NULL,
    "book_id" VARCHAR(191) NOT NULL,
    "actor_id" VARCHAR(191) NULL,
    "event_type" VARCHAR(80) NOT NULL,
    "event_title" VARCHAR(180) NULL,
    "event_message" TEXT NULL,
    "transaction_id" VARCHAR(191) NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" VARCHAR(191) NOT NULL,
    "recipient_id" VARCHAR(191) NOT NULL,
    "actor_id" VARCHAR(191) NULL,
    "type" VARCHAR(80) NOT NULL,
    "title" VARCHAR(180) NOT NULL,
    "message" TEXT NULL,
    "book_id" VARCHAR(191) NULL,
    "transaction_id" VARCHAR(191) NULL,
    "channel" VARCHAR(40) NULL DEFAULT 'in_app',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" VARCHAR(191) NOT NULL,
    "book_id" VARCHAR(191) NOT NULL,
    "transaction_id" VARCHAR(191) NULL,
    "reviewer_id" VARCHAR(191) NOT NULL,
    "rating" INTEGER NULL,
    "comment" TEXT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" VARCHAR(191) NOT NULL,
    "actor_id" VARCHAR(191) NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(191) NULL,
    "old_value" JSONB NULL,
    "new_value" JSONB NULL,
    "ip_address" VARCHAR(80) NULL,
    "user_agent" TEXT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_transactions" ADD CONSTRAINT "book_transactions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_transactions" ADD CONSTRAINT "book_transactions_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_transactions" ADD CONSTRAINT "book_transactions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_history" ADD CONSTRAINT "book_history_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_history" ADD CONSTRAINT "book_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_history" ADD CONSTRAINT "book_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "book_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "book_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "book_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
