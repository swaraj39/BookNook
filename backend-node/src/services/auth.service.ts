import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../config/prisma";
import { generateToken } from "../utils/jwt";
import { StatsCacheService } from "./stats-cache.service";

const ALLOWED_EMAIL_DOMAIN = "@bluealtair.com";
const SIGNUP_OTP_LENGTH = parseInt(process.env.SIGNUP_OTP_LENGTH || "6", 10);
const SIGNUP_OTP_EXPIRY_MINUTES = parseInt(process.env.SIGNUP_OTP_EXPIRY_MINUTES || "5", 10);
const MAGIC_LINK_EXPIRY_DAYS = 7;

function generateOtp(length: number): string {
  const max = Math.pow(10, length);
  return String(Math.floor(Math.random() * max)).padStart(length, "0");
}

function generateMagicLinkToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export class AuthService {
  static async register(data: any) {
    if (!data.email?.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      throw new Error(`Only ${ALLOWED_EMAIL_DOMAIN} email addresses are allowed to register.`);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error("Email already exists.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const role = data.email.includes("gaurav.choudhary") ? "ADMIN" : "USER";

    await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        team: data.team,
        role: role,
        isVerified: false,
        status: "active",
      },
    });

    // Sync systemic cache row
    await StatsCacheService.adjustFields({ totalUsers: 1 });

    // Generate and store signup OTP + magic link token
    const otp = generateOtp(SIGNUP_OTP_LENGTH);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + SIGNUP_OTP_EXPIRY_MINUTES * 60 * 1000);

    const magicLinkToken = generateMagicLinkToken();
    const magicLinkHash = await bcrypt.hash(magicLinkToken, 10);
    const magicLinkExpiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: { email: data.email, otpHash, expiresAt, magicLinkHash, magicLinkExpiresAt },
    });

    return { email: data.email, otp, magicLinkToken };
  }

  static async verifySignupOtp(email: string, otp: string) {
    const record = await prisma.emailVerificationToken.findFirst({
      where: { email, used: false },
      orderBy: { createdAt: "desc" },
    });

    if (!record) throw new Error("Invalid or expired OTP.");
    if (record.expiresAt < new Date()) {
      await prisma.emailVerificationToken.delete({ where: { id: record.id } });
      throw new Error("OTP has expired. Please request a new one.");
    }

    const isValid = await bcrypt.compare(otp, record.otpHash);
    if (!isValid) throw new Error("Invalid OTP. Please check and try again.");

    // Mark user as verified and consume the token in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { email },
        data: { isVerified: true },
      });
      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { used: true },
      });
      return updated;
    });

    const token = generateToken({ email: user.email, id: user.id });
    return { token, user: this.mapUser(user) };
  }

  static async resendSignupOtp(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("No account found with this email.");
    if (user.isVerified) throw new Error("This account is already verified.");

    // Invalidate old tokens
    await prisma.emailVerificationToken.deleteMany({ where: { email } });

    const otp = generateOtp(SIGNUP_OTP_LENGTH);
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + SIGNUP_OTP_EXPIRY_MINUTES * 60 * 1000);

    const magicLinkToken = generateMagicLinkToken();
    const magicLinkHash = await bcrypt.hash(magicLinkToken, 10);
    const magicLinkExpiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: { email, otpHash, expiresAt, magicLinkHash, magicLinkExpiresAt },
    });

    return { otp, magicLinkToken };
  }

  static async verifyMagicLink(token: string) {
    const records = await prisma.emailVerificationToken.findMany({
      orderBy: { createdAt: "desc" },
    });

    let matchedRecord: typeof records[0] | null = null;
    for (const record of records) {
      if (record.magicLinkHash && (await bcrypt.compare(token, record.magicLinkHash))) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) throw new Error("Invalid or expired verification link.");

    if (matchedRecord.used) {
      throw new Error("Your account is already verified. Please log in instead.");
    }

    if (!matchedRecord.magicLinkExpiresAt || matchedRecord.magicLinkExpiresAt < new Date()) {
      throw new Error("This verification link has expired. Please register again.");
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { email: matchedRecord.email },
        data: { isVerified: true },
      });
      await tx.emailVerificationToken.update({
        where: { id: matchedRecord.id },
        data: { used: true },
      });
      return updated;
    });

    const jwtToken = generateToken({ email: user.email, id: user.id });
    return { token: jwtToken, user: this.mapUser(user) };
  }

  static async login(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user || !user.password) {
      throw new Error("No account found with this email. What are you waiting for? Sign up now!");
    }

    if (!user.isVerified) {
      throw new Error("Please verify your email first. Check your inbox for the OTP.");
    }

    const isValid = await bcrypt.compare(data.password, user.password);
    if (!isValid) {
      throw new Error("Incorrect email or password.");
    }

    const token = generateToken({ email: user.email, id: user.id });
    return { token, user: this.mapUser(user) };
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
