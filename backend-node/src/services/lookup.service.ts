import prisma from "../config/prisma";

export class LookupService {
  static async genres() {
    const genres = await prisma.genre.findMany({
      orderBy: [
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });
    return genres.map((g) => ({ id: g.id, name: g.name }));
  }

  static async bookHistory(bookId: string, page = 0, size = 20) {
    const [totalElements, content] = await Promise.all([
      prisma.bookHistory.count({ where: { bookId } }),
      prisma.bookHistory.findMany({
        where: { bookId },
        include: { actor: true },
        orderBy: { createdAt: "desc" },
        skip: page * size,
        take: size,
      }),
    ]);

    return {
      content: content.map((h) => ({
        id: h.id,
        eventType: h.eventType,
        eventTitle: h.eventTitle,
        eventMessage: h.eventMessage,
        createdAt: h.createdAt,
        actor: h.actor ? {
          id: h.actor.id,
          fullName: h.actor.fullName,
          avatarUrl: h.actor.avatarUrl,
          avatarInitials: h.actor.avatarInitials,
        } : null,
      })),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      pageNumber: page,
      pageSize: size,
    };
  }

  static async dashboard(userId: string) {
    const now = new Date();
    
    const [totalBooks, availableBooks, pendingRequests, activeLoans, overdueLoans] = await Promise.all([
      prisma.book.count({ where: { visibilityStatus: "visible" } }),
      prisma.book.count({ where: { visibilityStatus: "visible", availabilityStatus: "available" } }),
      prisma.bookTransaction.count({
        where: { ownerId: userId, status: "pending" },
      }),
      prisma.bookTransaction.count({
        where: { requesterId: userId, status: { in: ["active", "overdue", "return_pending"] } },
      }),
      prisma.bookTransaction.count({
        where: { requesterId: userId, status: "active", dueAt: { lt: now } },
      }),
    ]);

    return {
      totalBooks,
      availableBooks,
      pendingRequests,
      activeLoans,
      overdueLoans,
    };
  }
}
