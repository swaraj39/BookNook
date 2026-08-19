import prisma from "../config/prisma";

const COMMENT_MAX_LENGTH = 1000;
const VALID_SORTS = ["latest", "earliest"];
const VALID_RATINGS = [1, 2, 3, 4, 5];

export class ReviewService {
  static async list(bookId: string, sort = "latest", offset = 0, limit = 5) {
    const safeSort = VALID_SORTS.includes(sort) ? sort : "latest";
    const safeOffset = Number(offset) >= 0 ? Number(offset) : 0;
    const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 100);

    const [totalElements, reviews] = await Promise.all([
      prisma.review.count({ where: { bookId } }),
      prisma.review.findMany({
        where: { bookId },
        include: { reviewer: true },
        orderBy: { createdAt: safeSort === "latest" ? "desc" : "asc" },
        skip: safeOffset,
        take: safeLimit,
      }),
    ]);

    return {
      content: reviews.map(this.mapReview),
      totalElements,
    };
  }

  static async create(userId: string, bookId: string, comment: string, rating: number) {
    const text = this.validateComment(comment);
    const safeRating = this.validateRating(rating);

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new Error("Book not found");

    const review = await prisma.review.create({
      data: {
        bookId,
        reviewerId: userId,
        comment: text,
        rating: safeRating,
      },
      include: { reviewer: true },
    });

    return this.mapReview(review);
  }

  static async update(userId: string, reviewId: string, comment: string, rating: number) {
    const text = this.validateComment(comment);
    const safeRating = this.validateRating(rating);

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error("Comment not found");
    if (review.reviewerId !== userId) {
      throw new Error("Only the author can edit this comment.");
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { comment: text, rating: safeRating },
      include: { reviewer: true },
    });

    return this.mapReview(updated);
  }

  static async delete(userId: string, reviewId: string, isAdmin: boolean) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error("Comment not found");
    if (review.reviewerId !== userId && !isAdmin) {
      throw new Error("Unauthorized");
    }

    await prisma.review.delete({ where: { id: reviewId } });
  }

  private static validateComment(comment: any) {
    if (typeof comment !== "string" || !comment.trim()) {
      throw new Error("Comment is required.");
    }
    const text = comment.trim();
    if (text.length > COMMENT_MAX_LENGTH) {
      throw new Error(`Comment cannot exceed ${COMMENT_MAX_LENGTH} characters.`);
    }
    return text;
  }

  private static validateRating(rating: any) {
    if (typeof rating !== "number" || Number.isNaN(rating)) {
      throw new Error("Rating is required.");
    }
    const snapped = Math.round(rating);
    if (snapped < 1 || snapped > 5 || !VALID_RATINGS.includes(snapped)) {
      throw new Error("Rating must be between 1 and 5.");
    }
    return snapped;
  }

  private static mapReview(review: any) {
    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      isEdited: new Date(review.updatedAt).getTime() > new Date(review.createdAt).getTime(),
      reviewer: review.reviewer
        ? {
          id: review.reviewer.id,
          fullName: review.reviewer.fullName,
          avatarUrl: review.reviewer.avatarUrl,
          avatarInitials: review.reviewer.avatarInitials,
          status: review.reviewer.status,
        }
        : null,
    };
  }
}
