import prisma from "../config/prisma";
import { StatsCacheService } from "./stats-cache.service";
import { ReadCacheService } from "./read-cache.service";
export class BookService {
  static async catalog(params: any, userId?: string) {
    const {
      search = "",
      genreId,
      availability = "all",
      sort = "title",
      page = 0,
      size = 20,
    } = params;
    const currentPage = Number(page) || 0;
    const pageSize = Number(size) || 20;
    const where: any = {
      visibilityStatus: "visible",
    };
    if (userId) where.ownerId = { not: userId };
    if (genreId) where.genreId = genreId;
    if (availability === "borrowed_by_me") {
      where.transactions = {
        some: {
          requesterId: userId,
          status: { in: ["active", "overdue"] },
        },
      };
    } else if (availability === "request_pending") {
      where.availabilityStatus = "request_pending";
      where.transactions = {
        some: {
          requesterId: userId,
          status: "pending",
        },
      };
    } else if (availability === "unavailable") {
      where.availabilityStatus = { in: ["borrowed", "request_pending"] };
      if (userId) {
        where.NOT = [
          {
            transactions: {
              some: {
                requesterId: userId,
                status: { in: ["active", "overdue"] },
              },
            },
          },
          {
            transactions: {
              some: {
                requesterId: userId,
                status: "pending",
              },
            },
          },
        ];
      }
    } else if (availability && availability !== "all") {
      where.availabilityStatus = availability;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { owner: { fullName: { contains: search, mode: "insensitive" } } },
      ];
    }
    const orderBy: any =
      sort === "newest" ? { createdAt: "desc" } : { title: "asc" };
    const [totalElements, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        include: {
          owner: true,
          genre: true,
        },
        orderBy,
        skip: currentPage * pageSize,
        take: pageSize,
      }),
    ]);
    const statusOrder = ["available", "request_pending", "borrowed"];
    const content = books.sort((a, b) => {
      const ai = statusOrder.includes(a.availabilityStatus)
        ? statusOrder.indexOf(a.availabilityStatus)
        : 99;
      const bi = statusOrder.includes(b.availabilityStatus)
        ? statusOrder.indexOf(b.availabilityStatus)
        : 99;
      return ai - bi;
    });
    return {
      content: content.map(this.mapBook),
      totalElements,
      totalPages: Math.ceil(totalElements / pageSize),
      page: currentPage,
      pageNumber: currentPage,
      pageSize,
    };
  }
  static async myBooks(userId: string, page = 0, size = 20) {
    const currentPage = Number(page) || 0;
    const pageSize = Number(size) || 20;
    const where = {
      ownerId: userId,
      visibilityStatus: "visible",
    };
    const [totalElements, content] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        include: {
          owner: true,
          genre: true,
        },
        orderBy: { createdAt: "desc" },
        skip: currentPage * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      content: content.map(this.mapBook),
      totalElements,
      totalPages: Math.ceil(totalElements / pageSize),
      page: currentPage,
      pageNumber: currentPage,
      pageSize,
    };
  }
  static async get(id: string) {
    const cacheKey = `book:${id}`;
    const cached = await ReadCacheService.get<any>(cacheKey);
    if (cached) return cached;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        owner: true,
        genre: true,
      },
    });
    if (!book) throw new Error("Book not found");

    const result = this.mapBook(book);
    await ReadCacheService.set(cacheKey, result, 300);
    return result;
  }
  static async create(userId: string, payload: any) {
    this.validateBookPayload(payload);
    const coverColor = this.pickCoverColor(payload.title);
    const book = await prisma.$transaction(
      async (tx) => {
        const createdBook = await tx.book.create({
          data: {
            title: payload.title.trim(),
            author: payload.author.trim(),
            genreId: payload.genreId,
            condition: payload.condition || "good",
            defaultLoanDays: Number(payload.defaultLoanDays) || 14,
            description: payload.description,
            coverUrl: payload.coverUrl,
            coverColor,
            ownerId: userId,
            availabilityStatus: "available",
            visibilityStatus: "visible",
          },
          include: {
            owner: true,
            genre: true,
          },
        });
        await tx.bookHistory.create({
          data: {
            bookId: createdBook.id,
            actorId: userId,
            eventType: "book_added",
            eventTitle: "Book added",
            eventMessage: `${createdBook.owner.fullName} added ${createdBook.title}.`,
          },
        });
        return createdBook;
      },
      {
        maxWait: 10000,
        timeout: 10000,
      }
    );
    await StatsCacheService.adjustFields({ totalBooks: 1, availableBooks: 1 });
    return this.mapBook(book);
  }
  static async importCsv(actorId: string, rows: any[]) {
    const results: {
      imported: number;
      skipped: number;
      failed: number;
      errors: { row: number; message: string }[];
    } = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      try {
        const title = String(raw.Title || raw.title || "").trim();
        const author = String(raw.Author || raw.author || "").trim();
        const genreName = String(raw.Genre || raw.genre || "").trim();
        const ownerEmail = String(raw.Email || raw.email || "").trim().toLowerCase();
        const isbn = String(raw.ISBN || raw.isbn || "").trim() || null;
        const description = String(raw.Description || raw.description || "").trim() || null;
        const condition = String(raw.Condition || raw.condition || "good").trim().toLowerCase();
        const defaultLoanDays = Number(raw.DefaultLoanDays || raw.defaultLoanDays) || 14;

        if (!title) throw new Error("Title is required.");
        if (!author) throw new Error("Author is required.");
        if (!genreName) throw new Error("Genre is required.");
        if (!ownerEmail) throw new Error("Email is required.");
        if (!Number.isInteger(defaultLoanDays) || defaultLoanDays < 3 || defaultLoanDays > 60) {
          throw new Error("Default loan days must be a whole number between 3 and 60.");
        }

        const coverColor = this.pickCoverColor(title);

        const wasSkipped = await prisma.$transaction(
          async (tx) => {
            const owner = await tx.user.findUnique({
              where: { email: ownerEmail },
            });
            if (!owner) {
              throw new Error(`No user found with email "${ownerEmail}".`);
            }

            // Look for a book with the same title (any owner, not deleted).
            const existingBook = await tx.book.findFirst({
              where: {
                title: { equals: title, mode: "insensitive" },
                visibilityStatus: { not: "deleted" },
              },
            });

            // Same title already owned by the same person from the row -> duplicate, skip it.
            if (existingBook && existingBook.ownerId === owner.id) {
              return true;
            }

            // Either no existing book with this title, or it belongs to a
            // different owner -> safe to add as a new entry for this owner.
            let genre = await tx.genre.findFirst({
              where: { name: { equals: genreName, mode: "insensitive" } },
            });
            if (!genre) {
              genre = await tx.genre.create({ data: { name: genreName } });
            }
            const createdBook = await tx.book.create({
              data: {
                title,
                author,
                genreId: genre.id,
                isbn,
                description,
                condition,
                defaultLoanDays,
                coverColor,
                ownerId: owner.id,
                availabilityStatus: "available",
                visibilityStatus: "visible",
              },
            });
            await tx.bookHistory.create({
              data: {
                bookId: createdBook.id,
                actorId,
                eventType: "book_added",
                eventTitle: "Book added",
                eventMessage: `${title} was imported via CSV for ${owner.fullName}.`,
              },
            });
            return false;
          },
          { maxWait: 10000, timeout: 10000 }
        );

        if (wasSkipped) {
          results.skipped += 1;
        } else {
          results.imported += 1;
        }
      } catch (error: any) {
        results.failed += 1;
        // +2 accounts for the header row and 0-index, so this matches the line number in the CSV/Excel file
        results.errors.push({ row: i + 2, message: error.message || "Unknown error" });
      }
    }
    if (results.imported > 0) {
      await StatsCacheService.adjustFields({
        totalBooks: results.imported,
        availableBooks: results.imported,
      });
    }
    return results;
  }
  static async update(
    userId: string,
    id: string,
    payload: any,
    isAdmin: boolean
  ) {
    this.validateBookPayload(payload);
    const updatedBook = await prisma.$transaction(
      async (tx) => {
        const book = await tx.book.findUnique({
          where: { id },
        });
        if (!book) throw new Error("Book not found");
        if (book.ownerId !== userId && !isAdmin) {
          throw new Error("Unauthorized");
        }

        const result = await tx.book.update({
          where: { id },
          data: {
            title: payload.title.trim(),
            author: payload.author.trim(),
            genreId: payload.genreId,
            condition: payload.condition,
            defaultLoanDays: Number(payload.defaultLoanDays),
            description: payload.description,
            coverUrl: payload.coverUrl,
          },
          include: {
            owner: true,
            genre: true,
          },
        });
        await tx.bookHistory.create({
          data: {
            bookId: result.id,
            actorId: userId,
            eventType: "book_updated",
            eventTitle: "Book updated",
            eventMessage: `${result.owner.fullName} updated ${result.title}.`,
          },
        });
        return result;
      },
      {
        maxWait: 10000,
        timeout: 10000,
      }
    );
    await ReadCacheService.invalidate(`book:${id}`);
    return this.mapBook(updatedBook);
  }
  static async delete(userId: string, id: string, isAdmin: boolean) {
    const deletedBook = await prisma.$transaction(
      async (tx) => {
        const book = await tx.book.findUnique({
          where: { id },
        });
        if (!book) throw new Error("Book not found");
        if (book.ownerId !== userId && !isAdmin) {
          throw new Error("Unauthorized");
        }
        const pendingRequests = await tx.bookTransaction.count({
          where: {
            bookId: id,
            status: "pending",
          },
        });
        if (pendingRequests > 0) {
          throw new Error("Close pending requests before deleting this book.");
        }
        const activeLoans = await tx.bookTransaction.count({
          where: {
            bookId: id,
            status: {
              in: ["active", "overdue", "return_pending"],
            },
          },
        });
        if (activeLoans > 0) {
          throw new Error("This book cannot be deleted while borrowed.");
        }
        const updatedBook = await tx.book.update({
          where: { id },
          data: {
            visibilityStatus: "deleted",
            availabilityStatus: "unavailable",
          },
          include: {
            owner: true,
          },
        });
        await tx.bookHistory.create({
          data: {
            bookId: id,
            actorId: userId,
            eventType: "book_deleted",
            eventTitle: "Book deleted",
            eventMessage: `${updatedBook.owner.fullName} removed ${updatedBook.title}.`,
          },
        });
        return book;
      },
      {
        maxWait: 10000,
        timeout: 10000,
      }
    );
    await Promise.all([
      StatsCacheService.adjustFields({
        totalBooks: -1,
        availableBooks: deletedBook.availabilityStatus === "available" ? -1 : 0
      }),
      ReadCacheService.invalidate(`book:${id}`),
    ]);
  }
  private static validateBookPayload(payload: any) {
    if (!payload.title?.trim()) throw new Error("Title is required.");
    if (!payload.author?.trim()) throw new Error("Author is required.");
    if (!payload.genreId) throw new Error("Genre is required.");
    const loanDays = Number(payload.defaultLoanDays);
    if (!Number.isInteger(loanDays) || loanDays < 3 || loanDays > 60) {
      throw new Error(
        "Default loan days must be a whole number between 3 and 60."
      );
    }
  }
  private static mapBook(book: any) {
    const myTransactions = Array.isArray(book.transactions) ? book.transactions : [];
    const isBorrowedByMe = myTransactions.some(
      (t: any) => t.status === "active" || t.status === "overdue"
    );
    const isPendingByMe = myTransactions.some((t: any) => t.status === "pending");
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      description: book.description,
      condition: book.condition,
      defaultLoanDays: book.defaultLoanDays,
      availabilityStatus: book.availabilityStatus,
      visibilityStatus: book.visibilityStatus,
      coverColor: book.coverColor,
      coverUrl: book.coverUrl,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      isBorrowedByMe,
      isPendingByMe,
      owner: book.owner
        ? {
          id: book.owner.id,
          fullName: book.owner.fullName,
          email: book.owner.email,
          avatarUrl: book.owner.avatarUrl,
          avatarInitials: book.owner.avatarInitials,
        }
        : null,
      genre: book.genre
        ? {
          id: book.genre.id,
          name: book.genre.name,
        }
        : null,
    };
  }
  private static pickCoverColor(title: string) {
    const colors = [
      "#16756f",
      "#17313b",
      "#7c2d12",
      "#1d4ed8",
      "#6d28d9",
      "#9d174d",
      "#166534",
    ];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}