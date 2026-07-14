export async function callWorkatoForgotPasswordWebhook(email: string, otp: string) {
  const url = process.env.WORKATO_FORGOT_PASSWORD_WEBHOOK_URL;
  if (!url) {
    console.warn("WORKATO_FORGOT_PASSWORD_WEBHOOK_URL not set — forgot-password OTP email not sent.");
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      console.error(`Forgot password webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (error: any) {
    console.error("Forgot password webhook failed:", error.message);
  }
}

export async function callWorkatoSignupWebhook(user: any) {
  const url = process.env.WORKATO_SIGNUP_WEBHOOK_URL;
  if (!url) {
    console.warn("WORKATO_SIGNUP_WEBHOOK_URL not set — signup welcome email not sent.");
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: user.fullName,
        email: user.email,
        team: user.team,
        role: user.role,
      }),
    });
    if (!res.ok) {
      console.error(`Signup webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (error: any) {
    console.error("Workato webhook failed:", error.message);
  }
}

export async function callWorkatoSignupVerificationWebhook(email: string, otp: string) {
  const url = process.env.WORKATO_SIGNUP_VERIFICATION_WEBHOOK_URL;
  if (!url) {
    console.warn("WORKATO_SIGNUP_VERIFICATION_WEBHOOK_URL not set — signup verification OTP email not sent.");
    return;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      console.error(`Signup verification webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (error: any) {
    console.error("Signup verification webhook failed:", error.message);
  }
}
