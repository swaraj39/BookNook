import prisma from "../config/prisma";

export class BookService {
  static async catalog(params: any, userId?: string) {
    const { search = "", genreId, availability = "all", sort = "title", page = 0, size = 20 } = params;
    const where: any = {
      visibilityStatus: "visible",
    };
    if (userId) {
      where.ownerId = { not: userId };
    }
    if (genreId) {
      where.genreId = genreId;
    }

    if (availability !== "all") {
      where.availabilityStatus = availability;
    }

    if (search) {
      where.OR = [
        { title: { contains: search} },
        { author: { contains: search } },
        { description: { contains: search } },
        { owner: { fullName: { contains: search } } },
      ];
    }

    let secondaryOrder: any = { title: "asc" };
    if (sort === "newest") secondaryOrder = { createdAt: "desc" };

    const statusOrder = ["available", "request_pending", "borrowed"];

    const [totalElements, allContent] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        include: { owner: true, genre: true },
        orderBy: secondaryOrder,
        skip: page * size,
        take: size,
      }),
    ]);

    const content = allContent.sort((a, b) => {
      const ai = statusOrder.indexOf(a.availabilityStatus) === -1 ? 99 : statusOrder.indexOf(a.availabilityStatus);
      const bi = statusOrder.indexOf(b.availabilityStatus) === -1 ? 99 : statusOrder.indexOf(b.availabilityStatus);
      return ai - bi;
    });

    const totalPages = Math.ceil(totalElements / size);
    return {
      content: content.map(this.mapBook),
      totalElements,
      totalPages,
      pageNumber: page,
      pageSize: size,
    };

    // const [totalElements, content] = await Promise.all([
    //   prisma.book.count({ where }),
    //   prisma.book.findMany({
    //     where,
    //     include: {
    //       owner: true,
    //       genre: true,
    //     },
    //     orderBy,
    //     skip: page * size,
    //     take: size,
    //   }),
    // ]);

    // const totalPages = Math.ceil(totalElements / size);

    // return {
    //   content: content.map(this.mapBook),
    //   totalElements,
    //   totalPages,
    //   pageNumber: page,
    //   pageSize: size,
    // };
  }

  static async myBooks(userId: string, page = 0, size = 20) {
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
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      content: content.map(this.mapBook),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      pageNumber: page,
      pageSize: size,
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
    const coverColor = this.pickCoverColor(payload.title);
    
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

    // Add history
    await prisma.bookHistory.create({
      data: {
        bookId: book.id,
        actorId: userId,
        eventType: "book_added",
        eventTitle: "Book added",
        eventMessage: `${book.owner.fullName} added ${book.title}.`,
      },
    });

    return this.mapBook(book);
  }

  static async update(userId: string, id: string, payload: any, isAdmin: boolean) {
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) throw new Error("Book not found");
    if (book.ownerId !== userId && !isAdmin) {
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
    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) throw new Error("Book not found");
    if (book.ownerId !== userId && !isAdmin) {
      throw new Error("Unauthorized");
    }

    // Check pending requests
    const pendingRequests = await prisma.borrowRequest.count({
      where: { bookId: id, status: "pending" },
    });
    if (pendingRequests > 0) {
      throw new Error("Close pending requests before deleting this book.");
    }

    // Check active loans
    const activeLoans = await prisma.loan.count({
      where: {
        bookId: id,
        status: { in: ["active", "overdue", "return_pending"] },
      },
    });
    if (activeLoans > 0) {
      throw new Error("This book cannot be deleted while borrowed.");
    }

    const deletedBook = await prisma.book.update({
      where: { id },
      data: {
        visibilityStatus: "deleted",
        availabilityStatus: "unavailable",
      },
      include: { owner: true }
    });

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
      genre: book.genre ? {
        id: book.genre.id,
        name: book.genre.name,
      } : null,
    };
  }

  private static pickCoverColor(title: string) {
    const colors = ["#16756f", "#17313b", "#7c2d12", "#1d4ed8", "#6d28d9", "#9d174d", "#166534"];
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = title.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
