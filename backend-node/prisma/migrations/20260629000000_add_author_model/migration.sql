-- CreateTable authors
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authors_name_key" ON "authors"("name");

-- Backfill: insert existing authors from books table
INSERT INTO "authors" ("id", "name")
SELECT gen_random_uuid()::text, "author"
FROM (SELECT DISTINCT "author" FROM "books") AS distinct_authors;

-- Add author_id column as nullable first
ALTER TABLE "books" ADD COLUMN "author_id" TEXT;

-- Update books with the correct author_id
UPDATE "books" b
SET "author_id" = a."id"
FROM "authors" a
WHERE b."author" = a."name";

-- Make author_id NOT NULL
ALTER TABLE "books" ALTER COLUMN "author_id" SET NOT NULL;

-- Drop the old author column
ALTER TABLE "books" DROP COLUMN "author";

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
