import prisma from "../config/prisma";
import { StatsCacheService } from "./stats-cache.service";

const TX_OPTIONS = {
  maxWait: 10000,
  timeout: 20000,
};

export class WorkflowService {
  static async myRequests(userId: string, isAdmin: boolean, page = 0, size = 20) {
    const where = isAdmin
      ? {}
      : {
        OR: [{ ownerId: userId }, { requesterId: userId }],
      };

    const [totalElements, content] = await Promise.all([
      prisma.bookTransaction.count({ where }),
      prisma.bookTransaction.findMany({
        where,
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
        orderBy: { requestedAt: "desc" },
        skip: Number(page) * Number(size),
        take: Number(size),
      }),
    ]);

    return {
      content: content.map(this.mapTransaction),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      page,
      pageSize: size,
    };
  }

  static async borrowed(userId: string, page = 0, size = 20) {
    const where = {
      requesterId: userId,
      status: { in: ["active", "overdue", "return_pending"] },
    };

    const [totalElements, content] = await Promise.all([
      prisma.bookTransaction.count({ where }),
      prisma.bookTransaction.findMany({
        where,
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
        orderBy: { dueAt: "asc" },
        skip: Number(page) * Number(size),
        take: Number(size),
      }),
    ]);

    return {
      content: content.map(this.mapTransaction),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      page,
      pageSize: size,
    };
  }

  static async history(userId: string, isAdmin: boolean, page = 0, size = 20) {
    const where = isAdmin ? {} : { requesterId: userId };

    const [totalElements, content] = await Promise.all([
      prisma.bookTransaction.count({ where }),
      prisma.bookTransaction.findMany({
        where,
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
        orderBy: { createdAt: "desc" },
        skip: Number(page) * Number(size),
        take: Number(size),
      }),
    ]);

    return {
      content: content.map(this.mapTransaction),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      page,
      pageSize: size,
    };
  }

  static async requestBook(userId: string, payload: any) {
    const requestedLoanDays = parseInt(payload.requestedLoanDays, 10);

    if (!Number.isInteger(requestedLoanDays) || requestedLoanDays < 1) {
      throw new Error("Borrow days must be a whole number.");
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const book = await tx.book.findUnique({
        where: { id: payload.bookId },
        include: { owner: true, genre: true },
      });

      if (!book) throw new Error("Book not found.");
      if (book.visibilityStatus !== "visible") {
        throw new Error("This book is no longer listed.");
      }
      if (book.ownerId === userId) {
        throw new Error("You cannot request your own book.");
      }
      if (book.availabilityStatus !== "available") {
        throw new Error("This book is not available.");
      }

      const tr = await tx.bookTransaction.create({
        data: {
          bookId: payload.bookId,
          requesterId: userId,
          ownerId: book.ownerId,
          status: "pending",
          requestedLoanDays,
          borrowerNote: payload.borrowerNote || null,
          requestedAt: new Date(),
        },
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
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
          eventMessage: `${tr.requester.fullName} requested ${book.title}.`,
          transactionId: tr.id,
        },
      });

      return tr;
    }, TX_OPTIONS);

    return this.mapTransaction(transaction);
  }

  static async approve(userId: string, transactionId: string, isAdmin: boolean) {
    const now = new Date();

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const transaction = await tx.bookTransaction.findUnique({
        where: { id: transactionId },
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
      });

      if (!transaction) throw new Error("Transaction not found.");

      if (transaction.ownerId !== userId && !isAdmin) {
        throw new Error("Only the book owner can approve this request.");
      }

      if (transaction.status !== "pending") {
        throw new Error("This transaction has already been processed.");
      }

      const dueAt = new Date(
        now.getTime() + transaction.requestedLoanDays * 24 * 60 * 60 * 1000
      );

      const tr = await tx.bookTransaction.update({
        where: { id: transactionId },
        data: {
          status: "active",
          respondedAt: now,
          borrowedAt: now,
          dueAt,
        },
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
      });

      await tx.book.update({
        where: { id: transaction.bookId },
        data: { availabilityStatus: "borrowed" },
      });

      await tx.bookTransaction.updateMany({
        where: {
          bookId: transaction.bookId,
          status: "pending",
          id: { not: transactionId },
        },
        data: {
          status: "expired",
          respondedAt: now,
        },
      });

      await tx.bookHistory.createMany({
        data: [
          {
            bookId: transaction.bookId,
            actorId: userId,
            eventType: "request_approved",
            eventTitle: "Request approved",
            eventMessage: `${transaction.owner.fullName} approved ${transaction.requester.fullName}'s request.`,
            transactionId: tr.id,
          },
          {
            bookId: transaction.bookId,
            actorId: userId,
            eventType: "loan_started",
            eventTitle: "Loan started",
            eventMessage: `${tr.book.title} is due on ${dueAt.toISOString().split("T")[0]
              }.`,
            transactionId: tr.id,
          },
        ],
      });
      return tr;
    }, TX_OPTIONS);

    // Decrement available inventory since book is now physically in 'borrowed' loop
    await StatsCacheService.adjustFields({ availableBooks: -1 });

    return this.mapTransaction(updatedTransaction);
  }

  static async reject(userId: string, transactionId: string, isAdmin: boolean) {
    const now = new Date();

    // 1. Destructure everything returned from the transaction block
    const { updatedTransaction, shouldMakeAvailable } = await prisma.$transaction(async (tx) => {
      const transaction = await tx.bookTransaction.findUnique({
        where: { id: transactionId },
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
      });

      if (!transaction) throw new Error("Transaction not found.");

      if (transaction.ownerId !== userId && !isAdmin) {
        throw new Error("Only the book owner can reject this request.");
      }

      if (transaction.status !== "pending") {
        throw new Error("This transaction has already been processed.");
      }

      const tr = await tx.bookTransaction.update({
        where: { id: transactionId },
        data: {
          status: "rejected",
          respondedAt: now,
        },
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
      });

      const pendingCount = await tx.bookTransaction.count({
        where: {
          bookId: transaction.bookId,
          status: "pending",
        },
      });

      const activeCount = await tx.bookTransaction.count({
        where: {
          bookId: transaction.bookId,
          status: { in: ["active", "overdue", "return_pending"] },
        },
      });

      const isNowAvailable = pendingCount === 0 && activeCount === 0;

      if (isNowAvailable) {
        await tx.book.update({
          where: { id: transaction.bookId },
          data: { availabilityStatus: "available" },
        });
      }

      await tx.bookHistory.create({
        data: {
          bookId: transaction.bookId,
          actorId: userId,
          eventType: "request_rejected",
          eventTitle: "Request rejected",
          eventMessage: `${transaction.owner.fullName} rejected ${tr.requester.fullName}'s request.`,
          transactionId: tr.id,
        },
      });

      // Pass both variables safely out of the transaction scope
      return { 
        updatedTransaction: tr, 
        shouldMakeAvailable: isNowAvailable 
      };
    }, TX_OPTIONS);

    // 2. Now 'shouldMakeAvailable' is perfectly safe to evaluate down here!
    await StatsCacheService.adjustFields({
      availableBooks: shouldMakeAvailable ? 1 : 0
    });

    return this.mapTransaction(updatedTransaction);
  }

  static async returnBook(userId: string, transactionId: string, isAdmin: boolean) {
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const transaction = await tx.bookTransaction.findUnique({
        where: { id: transactionId },
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
      });

      if (!transaction) throw new Error("Transaction not found.");

      if (
        transaction.requesterId !== userId &&
        transaction.ownerId !== userId &&
        !isAdmin
      ) {
        throw new Error("Unauthorized.");
      }

      if (!["active", "overdue", "return_pending"].includes(transaction.status)) {
        throw new Error("This transaction cannot be returned.");
      }

      const tr = await tx.bookTransaction.update({
        where: { id: transactionId },
        data: {
          status: "returned",
          returnedAt: new Date(),
        },
        include: {
          book: { include: { owner: true, genre: true, author: true } },
          requester: true,
          owner: true,
        },
      });

      await tx.book.update({
        where: { id: transaction.bookId },
        data: { availabilityStatus: "available" },
      });

      await tx.bookHistory.create({
        data: {
          bookId: transaction.bookId,
          actorId: userId,
          eventType: "book_returned",
          eventTitle: "Book returned",
          eventMessage: `${tr.requester.fullName} returned ${tr.book.title}.`,
          transactionId: tr.id,
        },
      });
      return tr;
    }, TX_OPTIONS);

    // This is where a real read completion happens!
    // Increment the available count pool and elevate the global complete transaction stats.
    await StatsCacheService.adjustFields({ availableBooks: 1, totalBooksReadGlobal: 1 });

    return this.mapTransaction(updatedTransaction);
  }

  private static mapTransaction(transaction: any) {
    return {
      id: transaction.id,
      status: transaction.status,
      borrowedAt: transaction.borrowedAt,
      dueAt: transaction.dueAt,
      returnedAt: transaction.returnedAt,
      borrowerReturnNote: transaction.borrowerReturnNote,
      ownerReturnNote: transaction.ownerReturnNote,
      returnConfirmedByOwner: transaction.returnConfirmedByOwner,
      requestedLoanDays: transaction.requestedLoanDays,
      borrowerNote: transaction.borrowerNote,
      ownerResponseNote: transaction.ownerResponseNote,
      requestedAt: transaction.requestedAt,
      respondedAt: transaction.respondedAt,

      book: transaction.book
        ? {
            id: transaction.book.id,
            title: transaction.book.title,
            author: transaction.book.author?.name ?? null,
            coverUrl: transaction.book.coverUrl,
            coverColor: transaction.book.coverColor,
            owner: transaction.book.owner
              ? {
                id: transaction.owner.id,
                fullName: transaction.owner.fullName,
              }
              : null,
        }
        : null,

      requester: transaction.requester
        ? {
          id: transaction.requester.id,
          fullName: transaction.requester.fullName,
          email: transaction.requester.email,
          avatarUrl: transaction.requester.avatarUrl,
          avatarInitials: transaction.requester.avatarInitials,
        }
        : null,

      owner: transaction.owner
        ? {
          id: transaction.owner.id,
          fullName: transaction.owner.fullName,
          email: transaction.owner.email,
        }
        : null,
    };
  }
}