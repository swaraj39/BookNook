import prisma from "../config/prisma";

export class WorkflowService {
  static async myRequests(userId: string, isAdmin: boolean, page = 0, size = 20) {
    const where = isAdmin ? {} : {
      OR: [{ ownerId: userId }, { requesterId: userId }]
    };

    const [totalElements, content] = await Promise.all([
      prisma.borrowRequest.count({ where }),
      prisma.borrowRequest.findMany({
        where,
        include: { book: true, requester: true, owner: true },
        orderBy: { requestedAt: "desc" },
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      content: content.map(this.mapRequest),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      pageNumber: page,
      pageSize: size,
    };
  }

  static async borrowed(userId: string, page = 0, size = 20) {
    const where = {
      borrowerId: userId,
      status: { in: ["active", "overdue", "return_pending"] },
    };

    const [totalElements, content] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        include: {
          book: { include: { owner: true } },
          borrower: true,
          owner: true,
        },
        orderBy: { dueAt: "asc" },
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      content: content.map(this.mapLoan),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      pageNumber: page,
      pageSize: size,
    };
  }

  static async history(userId: string, isAdmin: boolean, page = 0, size = 20) {
    const where = isAdmin ? {} : {
      OR: [{ borrowerId: userId }, { ownerId: userId }]
    };

    const [totalElements, content] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        include: {
          book: { include: { owner: true } },
          borrower: true,
          owner: true,
        },
        orderBy: { createdAt: "desc" },
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      content: content.map(this.mapLoan),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      pageNumber: page,
      pageSize: size,
    };
  }

  static async requestBook(userId: string, payload: any) {
    const requestedLoanDays = parseInt(payload.requestedLoanDays, 10);

    if (!Number.isInteger(requestedLoanDays) || requestedLoanDays < 1) {
      throw new Error("Borrow days must be a whole number.");
    }

    const book = await prisma.book.findUnique({
      where: { id: payload.bookId },
      include: { owner: true },
    });

    if (!book) throw new Error("Book not found.");
    if (book.visibilityStatus !== "visible") throw new Error("This book is no longer listed.");
    if (book.ownerId === userId) throw new Error("You cannot request your own book.");
    if (book.availabilityStatus !== "available") throw new Error("This book is not available.");

    const request = await prisma.$transaction(
  async (tx) => {
    const req = await tx.borrowRequest.create({
      data: {
        bookId: payload.bookId,
        requesterId: userId,
        ownerId: book.ownerId,
        status: "pending",
        requestedLoanDays,
        borrowerNote: payload.borrowerNote,
        requestedAt: new Date(),
      },
      include: {
        requester: true,
        book: true,
        owner: true,
      },
    });

    await tx.book.update({
      where: { id: payload.bookId },
      data: { availabilityStatus: "request_pending" },
    });

    await tx.bookHistory.create({
      data: {
        bookId: book.id,
        actorId: userId,
        eventType: "request_created",
        eventTitle: "Borrow request created",
        eventMessage: `${req.requester.fullName} requested ${book.title}.`,
        borrowRequestId: req.id,
      },
    });

    return req;
  },
  {
    timeout: 15000,
    maxWait: 10000,
  }
);

    return this.mapRequest(request);
  }

  static async approve(userId: string, requestId: string, isAdmin: boolean) {
    const request = await prisma.borrowRequest.findUnique({
      where: { id: requestId },
      include: { owner: true, book: true, requester: true },
    });

    if (!request) throw new Error("Request not found.");
    if (request.ownerId !== userId && !isAdmin) throw new Error("Unauthorized.");
    if (request.status !== "pending") throw new Error("This request has already been processed.");

    const activeLoan = await prisma.loan.findFirst({
      where: {
        bookId: request.bookId,
        status: { in: ["active", "overdue", "return_pending"] },
      },
    });

    if (activeLoan) throw new Error("This book is already borrowed.");

    const now = new Date();
    const dueAt = new Date(now.getTime() + request.requestedLoanDays * 24 * 60 * 60 * 1000);

    const loan = await prisma.$transaction(async (tx) => {
      await tx.borrowRequest.update({
        where: { id: requestId },
        data: {
          status: "converted_to_loan",
          respondedAt: now,
        },
      });

      const ln = await tx.loan.create({
        data: {
          bookId: request.bookId,
          borrowRequestId: request.id,
          borrowerId: request.requesterId,
          ownerId: request.ownerId,
          status: "active",
          borrowedAt: now,
          dueAt,
          returnConfirmedByOwner: false,
        },
        include: { book: { include: { owner: true } }, borrower: true, owner: true },
      });

      await tx.book.update({
        where: { id: request.bookId },
        data: { availabilityStatus: "borrowed" },
      });

      await tx.borrowRequest.updateMany({
        where: {
          bookId: request.bookId,
          status: "pending",
          id: { not: requestId },
        },
        data: {
          status: "expired",
          respondedAt: now,
        },
      });

      await tx.bookHistory.create({
        data: {
          bookId: request.bookId,
          actorId: userId,
          eventType: "request_approved",
          eventTitle: "Request approved",
          eventMessage: `${request.owner.fullName} approved ${request.requester.fullName}'s request.`,
          borrowRequestId: request.id,
          loanId: ln.id,
        },
      });

      await tx.bookHistory.create({
        data: {
          bookId: request.bookId,
          actorId: userId,
          eventType: "loan_started",
          eventTitle: "Loan started",
          eventMessage: `${request.book.title} is due on ${dueAt.toISOString().split("T")[0]}.`,
          borrowRequestId: request.id,
          loanId: ln.id,
        },
      });

      return ln;
    });

    return this.mapLoan(loan);
  }

  static async reject(userId: string, requestId: string, isAdmin: boolean) {
    const request = await prisma.borrowRequest.findUnique({
      where: { id: requestId },
      include: { owner: true, book: true },
    });

    if (!request) throw new Error("Request not found.");
    if (request.ownerId !== userId && !isAdmin) throw new Error("Unauthorized.");
    if (request.status !== "pending") throw new Error("This request has already been processed.");

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.borrowRequest.update({
        where: { id: requestId },
        data: {
          status: "rejected",
          respondedAt: new Date(),
        },
        include: { requester: true, book: true, owner: true },
      });

      const pendingCount = await tx.borrowRequest.count({
        where: { bookId: request.bookId, status: "pending" },
      });

      const activeLoanCount = await tx.loan.count({
        where: {
          bookId: request.bookId,
          status: { in: ["active", "overdue", "return_pending"] },
        },
      });

      if (pendingCount === 0 && activeLoanCount === 0) {
        await tx.book.update({
          where: { id: request.bookId },
          data: { availabilityStatus: "available" },
        });
      }

      await tx.bookHistory.create({
        data: {
          bookId: request.bookId,
          actorId: userId,
          eventType: "request_rejected",
          eventTitle: "Request rejected",
          eventMessage: `${request.owner.fullName} rejected the request for ${request.book.title}.`,
          borrowRequestId: request.id,
        },
      });

      return req;
    });

    return this.mapRequest(updatedRequest);
  }

  static async returnBook(userId: string, loanId: string, isAdmin: boolean) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { borrower: true, owner: true, book: true },
    });

    if (!loan) throw new Error("Loan not found.");
    if (loan.borrowerId !== userId && loan.ownerId !== userId && !isAdmin) {
      throw new Error("Unauthorized.");
    }

    if (!["active", "overdue"].includes(loan.status)) {
      throw new Error("This loan cannot be returned.");
    }

    const updatedLoan = await prisma.$transaction(async (tx) => {
      const ln = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: "returned",
          returnedAt: new Date(),
        },
        include: { book: { include: { owner: true } }, borrower: true, owner: true },
      });

      await tx.book.update({
        where: { id: loan.bookId },
        data: { availabilityStatus: "available" },
      });

      await tx.bookHistory.create({
        data: {
          bookId: loan.bookId,
          actorId: userId,
          eventType: "book_returned",
          eventTitle: "Book returned",
          eventMessage: `${loan.borrower.fullName} returned ${loan.book.title}.`,
          borrowRequestId: loan.borrowRequestId,
          loanId: ln.id,
        },
      });

      return ln;
    });

    return this.mapLoan(updatedLoan);
  }

  private static mapRequest(request: any) {
    return {
      id: request.id,
      status: request.status,
      requestedLoanDays: request.requestedLoanDays,
      borrowerNote: request.borrowerNote,
      ownerResponseNote: request.ownerResponseNote,
      requestedAt: request.requestedAt,
      respondedAt: request.respondedAt,
      book: request.book,
      requester: {
        id: request.requester.id,
        fullName: request.requester.fullName,
        email: request.requester.email,
        avatarUrl: request.requester.avatarUrl,
        avatarInitials: request.requester.avatarInitials,
      },
      owner: {
        id: request.owner.id,
        fullName: request.owner.fullName,
        email: request.owner.email,
      }
    };
  }

  private static mapLoan(loan: any) {
    return {
      id: loan.id,
      status: loan.status,
      borrowedAt: loan.borrowedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
      borrowerReturnNote: loan.borrowerReturnNote,
      ownerReturnNote: loan.ownerReturnNote,
      returnConfirmedByOwner: loan.returnConfirmedByOwner,
      book: {
        id: loan.book.id,
        title: loan.book.title,
        author: loan.book.author,
        coverUrl: loan.book.coverUrl,
        coverColor: loan.book.coverColor,
        owner: {
          id: loan.book.owner.id,
          fullName: loan.book.owner.fullName,
        }
      },
      borrower: {
        id: loan.borrower.id,
        fullName: loan.borrower.fullName,
        email: loan.borrower.email,
        avatarUrl: loan.borrower.avatarUrl,
        avatarInitials: loan.borrower.avatarInitials,
      },
      owner: {
        id: loan.owner.id,
        fullName: loan.owner.fullName,
      }
    };
  }
}