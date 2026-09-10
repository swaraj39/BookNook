import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { HelpdeskService } from "../services/helpdesk.service";
import { getSafeErrorMessage, getStatusCode } from "../utils/app-error";
import { logError } from "../middleware/error";

export class HelpdeskController {
  static async submit(req: AuthRequest, res: Response) {
    try {
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({
          message: "Name, email, and message are required.",
        });
      }

      await HelpdeskService.submit({ name, email, message });

      return res.status(200).json({
        message: "Your message has been sent to the helpdesk.",
      });
    } catch (error: any) {
      logError(error, req);
      return res.status(getStatusCode(error)).json({
        message: getSafeErrorMessage(error),
      });
    }
  }
}
