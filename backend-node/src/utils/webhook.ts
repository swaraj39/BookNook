const WEBHOOK_URLS = {
  signupVerification: process.env.WORKATO_SIGNUP_VERIFICATION_WEBHOOK_URL || "",
  signupWelcome: process.env.WORKATO_SIGNUP_WEBHOOK_URL || "",
  forgotPassword: process.env.WORKATO_FORGOT_PASSWORD_WEBHOOK_URL || "",
};

export async function callSignupVerificationWebhook(payload: {
  email: string;
  otp: string;
  magic_link: string;
}): Promise<void> {
  const url = WEBHOOK_URLS.signupVerification;
  if (!url) {
    console.warn("WORKATO_SIGNUP_VERIFICATION_WEBHOOK_URL not set — skipping webhook.");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Verification webhook returned ${response.status}`);
    } else {
      console.log("Verification webhook sent successfully for", payload.email);
    }
  } catch (error) {
    console.error("Verification webhook failed:", error);
  }
}

export async function callForgotPasswordWebhook(payload: {
  email: string;
  otp: string;
}): Promise<void> {
  const url = WEBHOOK_URLS.forgotPassword;
  if (!url) {
    console.warn("WORKATO_FORGOT_PASSWORD_WEBHOOK_URL not set — skipping webhook.");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Forgot password webhook returned ${response.status}`);
    } else {
      console.log("Forgot password webhook sent successfully for", payload.email);
    }
  } catch (error) {
    console.error("Forgot password webhook failed:", error);
  }
}

export async function callWelcomeWebhook(payload: {
  email: string;
  fullName: string;
}): Promise<void> {
  const url = WEBHOOK_URLS.signupWelcome;
  if (!url) {
    console.warn("WORKATO_SIGNUP_WEBHOOK_URL not set — skipping webhook.");
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Welcome webhook returned ${response.status}`);
    } else {
      console.log("Welcome webhook sent successfully for", payload.email);
    }
  } catch (error) {
    console.error("Welcome webhook failed:", error);
  }
}
