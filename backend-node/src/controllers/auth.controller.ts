import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { callWorkatoSignupWebhook } from "../utils/workato";

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