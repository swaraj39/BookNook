import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { callWorkatoSignupWebhook } from "../utils/workato";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);

      await callWorkatoSignupWebhook(result.user);

      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const result = await AuthService.login(req.body);

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user: result.user,
      });
    } catch (error: any) {
      res.status(401).json({ message: error.message });
    }
  }
  static async logout(req: Request, res: Response) {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });

    res.json({
      message: "Logged out successfully",
    });
  }
}