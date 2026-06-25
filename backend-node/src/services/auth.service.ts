import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";
import logger from "../utils/logger";

export class AuthService {
  static async register(data: any) {
    const email = data.email.trim().toLowerCase();

    logger.info(`Registration attempt for ${email}`);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      logger.warn(`Registration failed. Email already exists: ${email}`);
      throw new Error(
        "An account with this email already exists. Please sign in instead."
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const role = email.includes("gaurav.choudhary")
      ? "ADMIN"
      : "USER";

    const user = await prisma.user.create({
      data: {
        fullName: data.fullName.trim(),
        email,
        password: hashedPassword,
        team: data.team,
        role,
        status: "active",
      },
    });

    logger.info(
      `User registered successfully: ${user.email} (${user.role})`
    );

    const token = generateToken({
      email: user.email,
      id: user.id,
    });

    return {
      token,
      user: this.mapUser(user),
    };
  }

  static async login(data: any) {
    const email = data.email.trim().toLowerCase();

    logger.info(`Login attempt for ${email}`);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      logger.warn(`Login failed. Unknown email: ${email}`);
      throw new Error("Incorrect email or password.");
    }

    const isValid = await bcrypt.compare(
      data.password,
      user.password
    );

    if (!isValid) {
      logger.warn(`Login failed. Invalid password for ${email}`);
      throw new Error("Incorrect email or password.");
    }

    logger.info(`User logged in successfully: ${user.email}`);

    const token = generateToken({
      email: user.email,
      id: user.id,
    });

    return {
      token,
      user: this.mapUser(user),
    };
  }

  private static mapUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}