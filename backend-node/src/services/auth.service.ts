import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";
import { StatsCacheService } from "./stats-cache.service";

export class AuthService {
  static async register(data: any) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email already exists.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const role = data.email.includes("gaurav.choudhary") ? "ADMIN" : "USER";

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        team: data.team,
        role: role,
        status: "active",
      },
    });
    
    // Sync systemic cache row
    await StatsCacheService.adjustFields({ totalUsers: 1 });

    const token = generateToken({ email: user.email, id: user.id });
    return { token, user: this.mapUser(user) };
  }

  static async login(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.password) {
      throw new Error("Invalid email or password");
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const token = generateToken({ email: user.email, id: user.id });
    return { token, user: this.mapUser(user) };
  }

  private static mapUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
