import { Prisma } from "@prisma/client";

const friendlyServerMessage =
  "The library desk is a bit overloaded right now. Please try again in a moment.";

function errorText(error: any): string {
  return [
    error?.name,
    error?.code,
    error?.message,
    error?.stack,
  ]
    .filter(Boolean)
    .join(" ");
}

export function isDatabaseError(error: any): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return true;
  }

  const text = errorText(error).toLowerCase();
  return [
    "prisma.",
    "prismaclient",
    "error querying the database",
    "database",
    "emaxconnsession",
    "max clients reached",
    "pool_size",
    "connection pool",
    "too many connections",
  ].some((needle) => text.includes(needle));
}

export function getSafeErrorMessage(error: any): string {
  if (
    error instanceof TypeError ||
    error instanceof ReferenceError ||
    error instanceof SyntaxError ||
    String(error?.message || "").includes("\n    at ")
  ) {
    return "Something wobbled on our side. Please try again in a moment.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P1001":
        return friendlyServerMessage;
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

  if (isDatabaseError(error)) {
    return friendlyServerMessage;
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

  if (isDatabaseError(error)) {
    return 503;
  }

  return 400;
}
