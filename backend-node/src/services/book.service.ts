import prisma from "../config/prisma";

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
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        owner: true,
        genre: true,
      },
    });

    if (!book) throw new Error("Book not found");

    return this.mapBook(book);
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

    return this.mapBook(book);
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

    return this.mapBook(updatedBook);
  }

  static async delete(userId: string, id: string, isAdmin: boolean) {
    await prisma.$transaction(
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

        const deletedBook = await tx.book.update({
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
            eventMessage: `${deletedBook.owner.fullName} removed ${deletedBook.title}.`,
          },
        });
      },
      {
        maxWait: 10000,
        timeout: 10000,
      }
    );
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