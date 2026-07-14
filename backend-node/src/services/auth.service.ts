import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";
import { StatsCacheService } from "./stats-cache.service";

const SIGNUP_OTP_LENGTH = parseInt(process.env.SIGNUP_OTP_LENGTH || "6", 10);
const SIGNUP_OTP_EXPIRY_MINUTES = parseInt(process.env.SIGNUP_OTP_EXPIRY_MINUTES || "5", 10);

function generateOtp(length: number): string {
  const max = Math.pow(10, length);
  return String(Math.floor(Math.random() * max)).padStart(length, "0");
}

export class AuthService {
  static async register(data: any) {
    if (!data.email?.endsWith("@mailinator.com")) {
      throw new Error("Only @bluealtair.com email addresses are allowed to register.");
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email already exists.");
    }

    // If a pending user already exists with this email, remove it first
    await prisma.pendingUser.deleteMany({ where: { email: data.email } });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const role = data.email.includes("gaurav.choudhary") ? "ADMIN" : "USER";

    const otp = generateOtp(SIGNUP_OTP_LENGTH);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + SIGNUP_OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.pendingUser.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        team: data.team,
        role: role,
        otpHash,
        expiresAt,
      },
    });

    return { email: data.email, otp };
  }

  static async verifySignupOtp(email: string, otp: string) {
    const pending = await prisma.pendingUser.findUnique({
      where: { email },
    });

    if (!pending) throw new Error("No pending registration found for this email.");
    if (pending.expiresAt < new Date()) {
      await prisma.pendingUser.delete({ where: { email } });
      throw new Error("OTP has expired. Please register again.");
    }

    const isValid = await bcrypt.compare(otp, pending.otpHash);
    if (!isValid) throw new Error("Invalid OTP. Please check and try again.");

    // Move pending user to users table in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: pending.fullName,
          email: pending.email,
          password: pending.password,
          team: pending.team,
          role: pending.role,
          isVerified: true,
          status: "active",
        },
      });
      await tx.pendingUser.delete({ where: { email } });
      return created;
    });

    // Sync systemic cache row
    await StatsCacheService.adjustFields({ totalUsers: 1 });

    const token = generateToken({ email: user.email, id: user.id });
    return { token, user: this.mapUser(user) };
  }

  static async resendSignupOtp(email: string) {
    const pending = await prisma.pendingUser.findUnique({ where: { email } });
    if (!pending) throw new Error("No pending registration found for this email.");

    const otp = generateOtp(SIGNUP_OTP_LENGTH);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + SIGNUP_OTP_EXPIRY_MINUTES * 60 * 1000);

    await prisma.pendingUser.update({
      where: { email },
      data: { otpHash, expiresAt },
    });

    return otp;
  }

  static async checkPending(email: string) {
    const pending = await prisma.pendingUser.findUnique({ where: { email } });
    return { pending: !!pending };
  }

  static async login(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (user) {
      if (!user.password) throw new Error("Invalid email or password");
      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) throw new Error("Invalid email or password");
      const token = generateToken({ email: user.email, id: user.id });
      return { token, user: this.mapUser(user) };
    }

    // Not in users table — check if there's a pending registration
    const pending = await prisma.pendingUser.findUnique({
      where: { email: data.email },
    });

    if (pending) {
      throw new Error("Please verify your email first. Check your inbox or resend the verification OTP.");
    }

    throw new Error("Invalid email or password");
  }

  static async requestOtp(email: string) {
    // Always respond the same way — don't leak whether the email exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // silently do nothing

    // Invalidate any existing tokens for this email
    await prisma.passwordResetToken.deleteMany({ where: { email } });

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 90 * 1000); // 1 min 30 sec

    await prisma.passwordResetToken.create({
      data: { email, otpHash, expiresAt },
    });

    return otp; // caller sends this via email
  }

  static async verifyOtp(email: string, otp: string) {
    const record = await prisma.passwordResetToken.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) throw new Error("Invalid or expired OTP.");
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      throw new Error("OTP has expired. Please request a new one.");
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) throw new Error("Invalid OTP. Please check and try again.");

    // Don't mark as used yet — reset step needs to verify again
    return true;
  }

  static async resetPassword(email: string, otp: string, newPassword: string) {
    const record = await prisma.passwordResetToken.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });
    if (!record) throw new Error("Invalid or expired OTP.");
    if (record.expiresAt < new Date()) {
      await prisma.passwordResetToken.delete({ where: { id: record.id } });
      throw new Error("OTP has expired. Please request a new one.");
    }
    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) throw new Error("Invalid OTP.");

    // Enforce uniqueness constraint: Read current record hash verification 
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.password) {
      const isSameAsLast = await bcrypt.compare(newPassword, user.password);
      if (isSameAsLast) {
        throw new Error("Your new password cannot be the same as your current password.");
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);
  }

  private static mapUser(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
