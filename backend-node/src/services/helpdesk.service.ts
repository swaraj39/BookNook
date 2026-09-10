import { callHelpdeskWebhook } from "../utils/webhook";

const MAX_MESSAGE_LENGTH = 2000;

export class HelpdeskService {
  static async submit(data: {
    name: string;
    email: string;
    message: string;
  }): Promise<void> {
    const name = data.name?.trim();
    const email = data.email?.trim();
    const message = data.message?.trim();

    if (!name) {
      throw Object.assign(new Error("Name is required."), { status: 400 });
    }
    if (!email) {
      throw Object.assign(new Error("Email is required."), { status: 400 });
    }
    if (!message) {
      throw Object.assign(new Error("Message is required."), { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      throw Object.assign(
        new Error(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`),
        { status: 400 }
      );
    }

    await callHelpdeskWebhook({ name, email, message });
  }
}
