import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { callWorkatoSignupWebhook, callWorkatoForgotPasswordWebhook } from "../utils/workato";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);

      const isProd = process.env.NODE_ENV === "production";

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // Don't let webhook failures stop registration
      try {
        await callWorkatoSignupWebhook(result.user);
      } catch (err) {
        console.error("Signup webhook failed:", err);
      }

      res.status(201).json({
        user: result.user,
      });
    } catch (error: any) {
      const status =
        error.message === "An account with this email already exists. Please sign in instead."
          ? 409
          : 400;

      res.status(status).json({
        message: error.message || "Registration failed. Please try again.",
      });
    }
  }


  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);

      const isProd = process.env.NODE_ENV === "production";

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user: result.user,
      });
    } catch (error: any) {
      res.status(401).json({
        message:
          error.message || "Incorrect email or password.",
      });
    }
  }

  static async forgotPasswordRequest(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) { res.status(400).json({ message: "Email is required." }); return; }
      const otp = await AuthService.requestOtp(email);
      if (otp) {
        await callWorkatoForgotPasswordWebhook(email, otp);
      }
      // Always return 200 to avoid leaking whether the email exists
      res.json({ message: "If this email exists, an OTP has been sent." });
    } catch (error: any) {
      res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  }

  static async forgotPasswordVerifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) { res.status(400).json({ message: "Email and OTP are required." }); return; }
      await AuthService.verifyOtp(email, otp);
      res.json({ message: "OTP verified." });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid OTP." });
    }
  }

  static async forgotPasswordReset(req: Request, res: Response) {
    try {
      const { email, otp, password } = req.body;
      if (!email || !otp || !password) { res.status(400).json({ message: "All fields are required." }); return; }
      await AuthService.resetPassword(email, otp, password);
      res.json({ message: "Password reset successfully." });
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to reset password." });
    }
  }

  static async logout(req: Request, res: Response) {
    const isProd = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });

    res.json({
      message: "Logged out successfully",
    });
  }
}