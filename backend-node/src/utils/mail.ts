import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;
let transporterReady = false;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.MAIL_HOST;
  const port = parseInt(process.env.MAIL_PORT || "587", 10);
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;

  // Port 465 = SMTPS (SSL), Port 587 = STARTTLS
  const secure = port === 465;

  if (!host || !user || !pass) {
    console.warn("Mail config incomplete — emails will not be sent.");
    return null;
  }

  const tlsOptions: any = {};
  // Gmail's cert chain sometimes fails with Node's built-in CA — this avoids false rejections
  tlsOptions.rejectUnauthorized = false;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: tlsOptions,
  });

  // Verify connection immediately so we fail fast with a clear error
  transporter.verify((err) => {
    if (err) {
      console.error("SMTP connection failed — check MAIL_HOST/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD:", err.message);
      transporterReady = false;
    } else {
      console.log("SMTP connected successfully (" + host + ":" + port + ", secure=" + secure + ")");
      transporterReady = true;
    }
  });

  return transporter;
}

const FOOTER_HTML = `
          <tr>
            <td align="center" style="background:#f2f2f2; padding:25px 20px;">
              <p style="margin:0; color:#888888; font-size:12px;">
                &copy; 2026 BookNook. All rights reserved.
              </p>
            </td>
          </tr>`;

const HEADER_HTML = `
          <tr>
            <td align="center" style="background:#2b2926; padding:35px 20px;">
              <div style="color:#ffffff; font-size:28px; font-weight:bold; letter-spacing:1px;">
                BookNook
              </div>
              <div style="color:#cfcfcf; font-size:12px; margin-top:8px; letter-spacing:2px;">
                YOUR READING PORTAL
              </div>
            </td>
          </tr>`;

function wrapBody(content: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width">
</head>
<body style="margin:0; padding:0; background:#f6f4f1; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; max-width:600px; width:100%;">
          ${HEADER_HTML}
          ${content}
          ${FOOTER_HTML}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSignupEmail(user: { fullName: string; email: string }) {
  const tr = getTransporter();
  if (!tr) return;

  const fromAddr = `"BookNook" <${process.env.MAIL_USERNAME}>`;

  try {
    const info = await tr.sendMail({
      from: fromAddr,
      to: user.email,
      subject: "Welcome to BookNook!",
      html: wrapBody(`
          <tr>
            <td align="center" style="padding:45px 35px 30px;">
              <div style="color:#999999; font-size:12px; letter-spacing:2px; text-transform:uppercase;">
                Registration Successful
              </div>

              <h1 style="margin:18px 0 15px; color:#3a332f; font-size:34px; line-height:1.25; font-weight:normal;">
                Thanks for registering<br>
                with BookNook, ${user.fullName}!
              </h1>

              <p style="margin:0 auto; color:#555555; font-size:14px; line-height:1.7; max-width:430px;">
                We&rsquo;re excited to welcome you to BookNook. Your account has been created successfully.
                Start exploring books, managing your profile, and enjoying your reading journey.
              </p>

              <div style="margin-top:28px;">
                <a href="https://book-nook-ba.vercel.app/"
                   style="background:#00a889; color:#ffffff; text-decoration:none; padding:13px 24px; font-size:12px; letter-spacing:1px; text-transform:uppercase; border-radius:3px; display:inline-block;">
                  Go to BookNook Portal
                </a>
              </div>

              <p style="margin:35px 0 0; color:#555555; font-size:13px; line-height:1.6;">
                Thanks,<br>
                <span style="font-size:18px; color:#3a332f;">The BookNook Team</span>
              </p>
            </td>
          </tr>`),
    });
    console.log("Signup email sent:", info.messageId);
  } catch (error: any) {
    console.error("Failed to send signup email:", error);
    throw error;
  }
}

export async function sendOtpEmail(email: string, otp: string) {
  const tr = getTransporter();
  if (!tr) return;

  const fromAddr = `"BookNook" <${process.env.MAIL_USERNAME}>`;

  try {
    const info = await tr.sendMail({
      from: fromAddr,
      to: email,
      subject: "Your BookNook Password Reset OTP",
      html: wrapBody(`
          <tr>
            <td align="center" style="padding:45px 35px 30px;">
              <div style="color:#999999; font-size:12px; letter-spacing:2px; text-transform:uppercase;">
                Password Reset Request
              </div>

              <h1 style="margin:18px 0 15px; color:#3a332f; font-size:34px; line-height:1.25; font-weight:normal;">
                Reset Your Password
              </h1>

              <p style="margin:0 auto; color:#555555; font-size:14px; line-height:1.7; max-width:430px;">
                You recently requested to reset your BookNook password. Use the OTP below to proceed.
              </p>

              <div style="margin:30px 0;">
                <span style="font-size:36px; letter-spacing:8px; font-weight:bold; color:#3a332f; background:#f6f4f1; padding:16px 32px; border-radius:6px; display:inline-block;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0 auto; color:#555555; font-size:13px; line-height:1.7; max-width:430px;">
                This OTP is valid for <strong>90 seconds</strong>. If you did not request this, you can safely ignore this email.
              </p>

              <p style="margin:35px 0 0; color:#555555; font-size:13px; line-height:1.6;">
                Thanks,<br>
                <span style="font-size:18px; color:#3a332f;">The BookNook Team</span>
              </p>
            </td>
          </tr>`),
    });
    console.log("OTP email sent:", info.messageId);
  } catch (error: any) {
    console.error("Failed to send OTP email:", error);
    throw error;
  }
}
