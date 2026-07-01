export async function callWorkatoForgotPasswordWebhook(email: string, otp: string) {
  if (!process.env.WORKATO_FORGOT_PASSWORD_WEBHOOK_URL) return;
  try {
    await fetch(process.env.WORKATO_FORGOT_PASSWORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
  } catch (error: any) {
    console.error("Forgot password webhook failed:", error.message);
  }
}

export async function callWorkatoSignupWebhook(user: any) {
  if (!process.env.WORKATO_SIGNUP_WEBHOOK_URL) return;

  try {
    await fetch(process.env.WORKATO_SIGNUP_WEBHOOK_URL, {
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
  } catch (error: any) {
    console.error("Workato webhook failed:", error.message);
  }
}