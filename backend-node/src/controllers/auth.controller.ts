import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { callSignupVerificationWebhook, callWelcomeWebhook, callForgotPasswordWebhook } from "../utils/webhook";
import { getSafeErrorMessage, getStatusCode, isDatabaseError } from "../utils/app-error";
import { logError } from "../middleware/error";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const result = await AuthService.register(req.body);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const magicLinkUrl = `${frontendUrl}/verify?token=${result.magicLinkToken}`;

      await callSignupVerificationWebhook({
        email: result.email,
        otp: result.otp,
        magic_link: magicLinkUrl,
      });

      res.status(201).json({
        email: result.email,
      });
    } catch (error: any) {
      logError(error, req);
      const status =
        isDatabaseError(error)
          ? getStatusCode(error)
          :
        error.message === "An account with this email already exists. Please sign in instead."
          ? 409
          : 400;

      res.status(status).json({
        message: isDatabaseError(error)
          ? getSafeErrorMessage(error)
          : error.message || "Registration failed. Please try again.",
      });
    }
  }


  static async signupVerifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) { res.status(400).json({ message: "Email and OTP are required." }); return; }

      const result = await AuthService.verifySignupOtp(email, otp);

      const isProd = process.env.NODE_ENV === "production";

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await callWelcomeWebhook({
        email: result.user.email,
        fullName: result.user.fullName,
      });

      res.json({ user: result.user });
    } catch (error: any) {
      logError(error, req);
      res.status(isDatabaseError(error) ? getStatusCode(error) : 400).json({
        message: isDatabaseError(error) ? getSafeErrorMessage(error) : error.message || "Invalid OTP.",
      });
    }
  }


  static async signupResendOtp(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) { res.status(400).json({ message: "Email is required." }); return; }

      const result = await AuthService.resendSignupOtp(email);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      const magicLinkUrl = `${frontendUrl}/verify?token=${result.magicLinkToken}`;

      await callSignupVerificationWebhook({
        email,
        otp: result.otp,
        magic_link: magicLinkUrl,
      });

      res.json({ message: "A new OTP has been sent to your email." });
    } catch (error: any) {
      logError(error, req);
      res.status(isDatabaseError(error) ? getStatusCode(error) : 400).json({
        message: isDatabaseError(error) ? getSafeErrorMessage(error) : error.message || "Failed to resend OTP.",
      });
    }
  }


  static async signupVerifyMagicLink(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) { res.status(400).json({ message: "Verification token is required." }); return; }

      const result = await AuthService.verifyMagicLink(token);

      const isProd = process.env.NODE_ENV === "production";

      res.cookie("token", result.token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await callWelcomeWebhook({
        email: result.user.email,
        fullName: result.user.fullName,
      });

      res.json({ user: result.user });
    } catch (error: any) {
      logError(error, req);
      res.status(isDatabaseError(error) ? getStatusCode(error) : 400).json({
        message: isDatabaseError(error) ? getSafeErrorMessage(error) : error.message || "Verification failed.",
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
      logError(error, req);
      res.status(isDatabaseError(error) ? getStatusCode(error) : 401).json({
        message: isDatabaseError(error)
          ? getSafeErrorMessage(error)
          : error.message || "Incorrect email or password.",
      });
    }
  }

  static async forgotPasswordRequest(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) { res.status(400).json({ message: "Email is required." }); return; }
      const otp = await AuthService.requestOtp(email);
      if (otp) {
        await callForgotPasswordWebhook({ email, otp });
      }
      // Always return 200 to avoid leaking whether the email exists
      res.json({ message: "If this email exists, an OTP has been sent." });
    } catch (error: any) {
      logError(error, req);
      res.status(getStatusCode(error)).json({ message: getSafeErrorMessage(error) });
    }
  }

  static async forgotPasswordVerifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) { res.status(400).json({ message: "Email and OTP are required." }); return; }
      await AuthService.verifyOtp(email, otp);
      res.json({ message: "OTP verified." });
    } catch (error: any) {
      logError(error, req);
      res.status(isDatabaseError(error) ? getStatusCode(error) : 400).json({
        message: isDatabaseError(error) ? getSafeErrorMessage(error) : error.message || "Invalid OTP.",
      });
    }
  }

  static async forgotPasswordReset(req: Request, res: Response) {
    try {
      const { email, otp, password } = req.body;
      if (!email || !otp || !password) { res.status(400).json({ message: "All fields are required." }); return; }
      await AuthService.resetPassword(email, otp, password);
      res.json({ message: "Password reset successfully." });
    } catch (error: any) {
      logError(error, req);
      res.status(isDatabaseError(error) ? getStatusCode(error) : 400).json({
        message: isDatabaseError(error) ? getSafeErrorMessage(error) : error.message || "Failed to reset password.",
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
