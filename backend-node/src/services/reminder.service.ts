import prisma from "../config/prisma";
import { callReminderWebhook } from "../utils/webhook";

const FIRST_REMINDER_DAYS = 14;
const RESEND_INTERVAL_DAYS = 7;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Statuses that mean the user is currently holding a book (or has an unresolved
// loan), so they must never receive a re-engagement reminder.
const ON_HOLD_STATUSES = ["active", "overdue", "return_pending"];

export class ReminderService {
  static async processReminders(): Promise<void> {
    const now = Date.now();

    // 1. Exclude users who are currently holding a book.
    const holdingLoanRecords = await prisma.bookTransaction.findMany({
      where: { status: { in: ON_HOLD_STATUSES } },
      select: { requesterId: true },
    });
    const excludedUserIds = new Set(
      holdingLoanRecords.map((record) => record.requesterId)
    );

    // 2. Deactivated users are filtered out: only "active" status is considered.
    const users = await prisma.user.findMany({
      where: {
        status: "active",
        ...(excludedUserIds.size > 0 ? { id: { notIn: [...excludedUserIds] } } : {}),
      },
      select: { id: true, email: true, fullName: true, createdAt: true },
    });

    // 3. "Last borrowing activity" = when the user last RETURNED a book.
    // For users with no completed loans, registration date (createdAt) is the
    // baseline so that new users who never borrowed get reminders too.
    const lastReturnedAtByUser = new Map<string, Date>();
    const grouped = await prisma.bookTransaction.groupBy({
      by: ["requesterId"],
      where: { status: "returned", returnedAt: { not: null } },
      _max: { returnedAt: true },
    });
    for (const row of grouped) {
      if (row._max.returnedAt) {
        lastReturnedAtByUser.set(row.requesterId, row._max.returnedAt);
      }
    }

    for (const user of users) {
      const lastReturnedAt = lastReturnedAtByUser.get(user.id);
      const lastActivityDate = lastReturnedAt ?? user.createdAt;
      const daysDiff = Math.floor(
        (now - lastActivityDate.getTime()) / MS_PER_DAY
      );

      if (
        daysDiff >= FIRST_REMINDER_DAYS &&
        (daysDiff - FIRST_REMINDER_DAYS) % RESEND_INTERVAL_DAYS === 0
      ) {
        await callReminderWebhook({
          mail_id: user.email,
          days: daysDiff,
          name: user.fullName,
        });
      }
    }
  }
}