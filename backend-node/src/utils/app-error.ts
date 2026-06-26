import { Prisma } from "@prisma/client";

export function getSafeErrorMessage(error: any): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1001":
        return "Database connection failed. Please try again later.";
      case "P2025":
        return "Requested record was not found.";
      case "P2002":
        return "This record already exists.";
      case "P2003":
        return "This action cannot be completed because related data exists.";
      default:
        return "Database operation failed. Please try again.";
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "Database is temporarily unavailable. Please try again later.";
  }

  if (error?.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function getStatusCode(error: any): number {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1001":
        return 503;
      case "P2025":
        return 404;
      case "P2002":
        return 409;
      case "P2003":
        return 400;
      default:
        return 400;
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return 503;
  }

  return 400;
}