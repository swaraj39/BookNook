// src/services/lookup.service.ts
import prisma from "../config/prisma";
import { StatsCacheService } from "./stats-cache.service";

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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const cachedStats = await StatsCacheService.getStats();
    const safe = <T>(fn: () => Promise<T>, fallback: T): Promise<T> =>
      fn().catch(() => fallback);

    const [pendingRequests, activeBorrowed, booksReadThisMonth, totalBooksRead] = await Promise.all([
      safe(() => prisma.bookTransaction.count({ where: { ownerId: userId, status: "pending" } }), 0),
      safe(() => prisma.bookTransaction.count({
        where: { requesterId: userId, status: { in: ["active", "overdue"] } },
      }), 0),
      safe(() => prisma.bookTransaction.count({
        where: { requesterId: userId, status: "returned", returnedAt: { gte: startOfMonth } },
      }), 0),
      safe(() => prisma.bookTransaction.count({
        where: { requesterId: userId, status: "returned" },
      }), 0),
    ]);

    const rawLatestReadings = await safe(() =>
      prisma.bookTransaction.findMany({
        where: { requesterId: userId },
        include: { book: { include: { genre: true, author: true } } },
        orderBy: { requestedAt: "desc" },
        take: 15,
      }), []
    );

    const latestReadings = rawLatestReadings.map(t => ({
      id: t.id,
      status: t.status,
      requestedAt: t.requestedAt,
      borrowedAt: t.borrowedAt,
      returnedAt: t.returnedAt,
      dueAt: t.dueAt,
      book: {
        id: t.book.id,
        title: t.book.title,
        author: t.book.author?.name ?? null,
        coverColor: t.book.coverColor,
        coverUrl: t.book.coverUrl,
        genreName: t.book.genre?.name ?? "N/A"
      }
    }));

    const communityAverageRead = cachedStats.totalUsers > 0
      ? parseFloat((cachedStats.totalBooksReadGlobal / cachedStats.totalUsers).toFixed(1))
      : 0;

    const chartData = [{
      month: now.toLocaleString("default", { month: "short" }),
      userCount: booksReadThisMonth,
      globalAvg: communityAverageRead
    }];

    const activeBooks = await safe(() =>
      prisma.book.findMany({
        where: { visibilityStatus: "visible" },
        include: { owner: true, genre: true, author: true }
      }), []
    );

    let bookOfTheDay = null;
    if (activeBooks.length > 0) {
      const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
      const index = Math.abs(dateSeed) % activeBooks.length;
      const chosen = activeBooks[index];
      bookOfTheDay = {
        id: chosen.id,
        title: chosen.title,
        author: chosen.author?.name ?? null,
        coverColor: chosen.coverColor,
        coverUrl: chosen.coverUrl,
        description: chosen.description,
        genreName: chosen.genre?.name ?? "N/A",
        ownerName: chosen.owner.fullName
      };
    }

    return {
      totalBooks: cachedStats.totalBooks,
      availableBooks: cachedStats.availableBooks,
      totalUsers: cachedStats.totalUsers,
      communityAverageRead,
      pendingRequests,
      activeBorrowed,
      booksReadThisMonth,
      totalBooksRead,
      chartData,
      latestReadings,
      bookOfTheDay
    };
  }
}