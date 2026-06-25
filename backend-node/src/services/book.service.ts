import prisma from "../config/prisma";
import logger from "../utils/logger";

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
    logger.info(
      `Fetching book catalog | User: ${userId ?? "Guest"} | Search: "${search}" | Availability: ${availability}`
    );
    const currentPage = Number(page) || 0;
    const pageSize = Number(size) || 20;

    const where: any = {
      visibilityStatus: "visible",
    };

    if (userId) {
      where.ownerId = { not: userId };
    }

    if (genreId) {
      where.genreId = genreId;
    }

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
        { title: { contains: search } },
        { author: { contains: search } },
        { description: { contains: search } },
        { owner: { fullName: { contains: search } } },
      ];
    }

    let orderBy: any = { title: "asc" };

    if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    }

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
    logger.info(`Fetching books owned by user: ${userId}`);
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
    logger.info(`Fetching book details | Book ID: ${id}`);
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        owner: true,
        genre: true,
      },
    });

    if (!book){
      logger.warn(`Book not found | Book ID: ${id}`);
      throw new Error("Book not found");
    } 
    
    return this.mapBook(book);
  }

  private static validateBookPayload(payload: any) {
    if (!payload.title?.trim()) throw new Error("Title is required.");
    if (!payload.author?.trim()) throw new Error("Author is required.");
    if (!payload.genreId) throw new Error("Genre is required.");
    const loanDays = Number(payload.defaultLoanDays);
    if (!Number.isInteger(loanDays) || loanDays < 3 || loanDays > 60) {
      throw new Error("Default loan days must be a whole number between 3 and 60.");
    }
  }

  static async create(userId: string, payload: any) {
    this.validateBookPayload(payload);
    const coverColor = this.pickCoverColor(payload.title);
    logger.info(
      `Creating book | Owner: ${userId} | Title: "${payload.title}"`
    );
    const book = await prisma.book.create({
      data: {
        title: payload.title,
        author: payload.author,
        genreId: payload.genreId,
        condition: payload.condition || "good",
        defaultLoanDays: payload.defaultLoanDays || 14,
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

    await prisma.bookHistory.create({
      data: {
        bookId: book.id,
        actorId: userId,
        eventType: "book_added",
        eventTitle: "Book added",
        eventMessage: `${book.owner.fullName} added ${book.title}.`,
      },
    });
    logger.info(
      `Book created successfully | Book ID: ${book.id} | Title: "${book.title}"`
    );
    return this.mapBook(book);
  }

  static async update(userId: string, id: string, payload: any, isAdmin: boolean) {
    this.validateBookPayload(payload);
    const book = await prisma.book.findUnique({
      where: { id },
    });
    logger.info(
      `Updating book | Book ID: ${id} | User: ${userId}`
    );
    if (!book){
      logger.warn(`Update failed. Book not found | Book ID: ${id}`);
      throw new Error("Book not found");
    } 

    if (book.ownerId !== userId && !isAdmin) {
      logger.warn(
        `Unauthorized update attempt | Book ID: ${id} | User: ${userId}`
      );
      throw new Error("Unauthorized");
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: {
        title: payload.title,
        author: payload.author,
        genreId: payload.genreId,
        condition: payload.condition,
        defaultLoanDays: payload.defaultLoanDays,
        description: payload.description,
        coverUrl: payload.coverUrl,
      },
      include: {
        owner: true,
        genre: true,
      },
    });
    logger.info(
      `Book updated successfully | Book ID: ${updatedBook.id}`
    );
    await prisma.bookHistory.create({
      data: {
        bookId: updatedBook.id,
        actorId: userId,
        eventType: "book_updated",
        eventTitle: "Book updated",
        eventMessage: `${updatedBook.owner.fullName} updated ${updatedBook.title}.`,
      },
    });
    
    return this.mapBook(updatedBook);
  }

  static async delete(userId: string, id: string, isAdmin: boolean) {
    const book = await prisma.book.findUnique({
      where: { id },
    });
    logger.info(
      `Deleting book | Book ID: ${id} | User: ${userId}`
    );
    if (!book){
      logger.warn(`Delete failed. Book not found | Book ID: ${id}`);
      throw new Error("Book not found");
    } 

    if (book.ownerId !== userId && !isAdmin) {
      logger.warn(
        `Unauthorized delete attempt | Book ID: ${id} | User: ${userId}`
      );
      throw new Error("Unauthorized");
    }

    const pendingRequests = await prisma.bookTransaction.count({
      where: {
        bookId: id,
        status: "pending",
      },
    });

    if (pendingRequests > 0) {
      logger.warn(
        `Delete blocked due to pending requests | Book ID: ${id}`
      );
      throw new Error("Close pending requests before deleting this book.");
    }

    const activeLoans = await prisma.bookTransaction.count({
      where: {
        bookId: id,
        status: {
          in: ["active", "overdue", "return_pending"],
        },
      },
    });

    if (activeLoans > 0) {
      logger.warn(
        `Delete blocked because the book is currently borrowed | Book ID: ${id}`
      );
      throw new Error("This book cannot be deleted while borrowed.");
    }

    const deletedBook = await prisma.book.update({
      where: { id },
      data: {
        visibilityStatus: "deleted",
        availabilityStatus: "unavailable",
      },
      include: {
        owner: true,
      },
    });
    logger.info(
      `Book deleted successfully | Book ID: ${id}`
    );

    await prisma.bookHistory.create({
      data: {
        bookId: id,
        actorId: userId,
        eventType: "book_deleted",
        eventTitle: "Book deleted",
        eventMessage: `${deletedBook.owner.fullName} removed ${deletedBook.title}.`,
      },
    });
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
      owner: {
        id: book.owner.id,
        fullName: book.owner.fullName,
        email: book.owner.email,
        avatarUrl: book.owner.avatarUrl,
        avatarInitials: book.owner.avatarInitials,
      },
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