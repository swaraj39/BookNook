import prisma from "../config/prisma";
// import { StatsCacheService } from "./stats-cache.service";

export class StatsCacheService {
  private static readonly STATS_ID = "GLOBAL";

  /**
   * Safely gets the global cache row. If it doesn't exist, it triggers a 
   * self-healing complete recalculation so the app never crashes.
   */
  static async getStats() {
    try {
      const stats = await prisma.systemStats.findUnique({
        where: { id: this.STATS_ID },
      });

      if (!stats) {
        return await this.recalculateAndCacheAll();
      }
      return stats;
    } catch {
      return await this.recalculateAndCacheAll();
    }
  }

  /**
   * Atomic incremental modifications. Very fast, bypasses race conditions, 
   * and minimizes open transaction time in your limited pool.
   */
  static async adjustFields(adjustments: {
    totalBooks?: number;
    availableBooks?: number;
    totalUsers?: number;
    totalBooksReadGlobal?: number;
  }) {
    const updateData: any = {};
    
    for (const [key, value] of Object.entries(adjustments)) {
      if (value !== 0) {
        updateData[key] = { increment: value };
      }
    }

    if (Object.keys(updateData).length === 0) return;

    return await prisma.systemStats.upsert({
      where: { id: this.STATS_ID },
      update: updateData,
      create: {
        id: this.STATS_ID,
        totalBooks: Math.max(0, adjustments.totalBooks || 0),
        availableBooks: Math.max(0, adjustments.availableBooks || 0),
        totalUsers: Math.max(0, adjustments.totalUsers || 0),
        totalBooksReadGlobal: Math.max(0, adjustments.totalBooksReadGlobal || 0),
      },
    });
  }

  /**
   * Fallback self-healing routine. Scans the tables to compute the true state, 
   * then locks it into the single cache row.
   */
  static async recalculateAndCacheAll() {
    try {
      const [booksCount, availableBooksCount, usersCount, completedLoansCount] = await Promise.all([
        prisma.book.count({ where: { visibilityStatus: "visible" } }),
        prisma.book.count({ where: { visibilityStatus: "visible", availabilityStatus: "available" } }),
        prisma.user.count({ where: { status: "active" } }),
        prisma.bookTransaction.count({ where: { status: "returned" } }),
      ]);

      return await prisma.systemStats.upsert({
        where: { id: this.STATS_ID },
        update: {
          totalBooks: booksCount,
          availableBooks: availableBooksCount,
          totalUsers: usersCount,
          totalBooksReadGlobal: completedLoansCount,
        },
        create: {
          id: this.STATS_ID,
          totalBooks: booksCount,
          availableBooks: availableBooksCount,
          totalUsers: usersCount,
          totalBooksReadGlobal: completedLoansCount,
        },
      });
    } catch {
      return {
        id: this.STATS_ID,
        totalBooks: 0,
        availableBooks: 0,
        totalUsers: 0,
        totalBooksReadGlobal: 0,
        updatedAt: new Date(),
      };
    }
  }
}