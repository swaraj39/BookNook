import prisma from "../config/prisma";

const VALID_ROLES = ["ADMIN", "USER"];
const VALID_STATUSES = ["active", "inactive"];

export class UserService {
  static async list(isAdmin: boolean, page = 0, size = 20) {
    if (!isAdmin) throw new Error("Unauthorized");

    const currentPage = Number(page) || 0;
    const pageSize = Number(size) || 20;

    const [totalElements, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({
        orderBy: { fullName: "asc" },
        skip: currentPage * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      content: users.map(this.mapUser),
      totalElements,
      totalPages: Math.ceil(totalElements / pageSize),
      page: currentPage,
      pageNumber: currentPage,
      pageSize,
    };
  }

  static async update(
    actingUserId: string,
    targetId: string,
    payload: any,
    isAdmin: boolean
  ) {
    if (!isAdmin) throw new Error("Unauthorized");

    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new Error("User not found");

    if (targetId === actingUserId) {
      throw new Error("You cannot change your own role or status.");
    }

    const data: any = {};

    if (payload.fullName !== undefined) {
      if (!payload.fullName?.trim()) {
        throw new Error("Name is required.");
      }
      data.fullName = payload.fullName.trim();
    }

    if (payload.role !== undefined) {
      if (!VALID_ROLES.includes(payload.role)) {
        throw new Error(`Role must be one of: ${VALID_ROLES.join(", ")}`);
      }
      data.role = payload.role;
    }

    if (payload.status !== undefined) {
      if (!VALID_STATUSES.includes(payload.status)) {
        throw new Error(`Status must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      data.status = payload.status;
    }

    if (payload.team !== undefined) {
      data.team = payload.team?.trim() || null;
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data,
    });

    return this.mapUser(updated);
  }

  private static mapUser(user: any) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      team: user.team,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      avatarInitials: user.avatarInitials,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
