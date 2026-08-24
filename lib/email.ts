/**
 * Sends an email using whichever provider is configured (checked in order):
 *   1. Resend           -> set RESEND_API_KEY  (recommended for production/Vercel)
 *   2. SMTP (nodemailer) -> set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS  (e.g. Gmail)
 *   3. Abacus.AI         -> set ABACUSAI_API_KEY  (only for local dev; token is short-lived)
 *
 * The sender address is taken from EMAIL_FROM (falls back to a noreply@<domain> derived
 * from NEXTAUTH_URL). Returns { success, message } and never throws.
 */
export async function sendNotificationEmail({
  to,
  subject,
  body,
  isHtml = true,
}: {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}) {
  // Resolve sender name + address
  const appUrl = process.env.NEXTAUTH_URL || "";
  let appName = "HRIS";
  let derivedSender = "noreply@hris.local";
  if (appUrl) {
    try {
      const url = new URL(appUrl);
      appName = url.hostname.split(".")[0] || "HRIS";
      derivedSender = `noreply@${url.hostname}`;
    } catch {
      console.warn("[EMAIL] Invalid NEXTAUTH_URL, using default sender");
    }
  }
  const fromAddress = process.env.EMAIL_FROM || derivedSender;
  const fromName = process.env.EMAIL_FROM_NAME || `${appName} HRIS`;

  console.log(`[EMAIL] Sending to: ${to} | Subject: ${subject}`);

  // ---- 1. Resend ----------------------------------------------------------
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to,
        subject,
        ...(isHtml ? { html: body } : { text: body }),
      });
      if (error) {
        console.error(`[EMAIL][Resend] Failed for ${to}:`, error);
        return { success: false, message: error.message || "Resend error" };
      }
      console.log(`[EMAIL][Resend] Sent to ${to} (id: ${data?.id})`);
      return { success: true, message: "Email sent via Resend" };
    } catch (error: any) {
      console.error("[EMAIL][Resend] Exception:", error?.message || error);
      return { success: false, message: error?.message || "Resend exception" };
    }
  }

  // ---- 2. SMTP (nodemailer) ----------------------------------------------
  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    try {
      const nodemailer = await import("nodemailer");
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure: port === 465, // true for 465, false for 587/others
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const info = await transporter.sendMail({
        from: `"${fromName}" <${process.env.SMTP_FROM || process.env.SMTP_USER || fromAddress}>`,
        to,
        subject,
        ...(isHtml ? { html: body } : { text: body }),
      });
      console.log(`[EMAIL][SMTP] Sent to ${to} (id: ${info.messageId})`);
      return { success: true, message: "Email sent via SMTP" };
    } catch (error: any) {
      console.error("[EMAIL][SMTP] Exception:", error?.message || error);
      return { success: false, message: error?.message || "SMTP exception" };
    }
  }

  // ---- 3. Abacus.AI (local dev fallback; token is short-lived) ------------
  const apiKey = process.env.ABACUSAI_API_KEY || process.env.ABACUS_API_KEY;
  if (apiKey) {
    try {
      const payload = {
        deployment_token: apiKey,
        subject,
        body,
        is_html: isHtml,
        recipient_email: to,
        sender_email: fromAddress,
        sender_alias: fromName,
      };
      const response = await fetch("https://apps.abacus.ai/api/sendNotificationEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        console.error(`[EMAIL][Abacus] Failed for ${to}:`, result.message || result.error);
        return { success: false, message: result.message || result.error || "Abacus email error" };
      }
      console.log(`[EMAIL][Abacus] Sent to ${to}`);
      return { success: true, message: "Email sent via Abacus.AI" };
    } catch (error: any) {
      console.error("[EMAIL][Abacus] Exception:", error?.message || error);
      return { success: false, message: error?.message || "Abacus exception" };
    }
  }

  // ---- No provider configured --------------------------------------------
  console.error(
    "[EMAIL] No email provider configured. Set RESEND_API_KEY (recommended), " +
      "or SMTP_HOST/SMTP_USER/SMTP_PASS, in your environment (e.g. Vercel project settings)."
  );
  return {
    success: false,
    message:
      "Email service not configured. The account was still created; share the temporary password manually.",
  };
}

export function getLeaveApprovalEmailTemplate(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  status: "APPROVED" | "REJECTED",
  reason?: string
) {
  const statusColor = status === "APPROVED" ? "#16a34a" : "#dc2626";
  const statusText = status === "APPROVED" ? "Approved" : "Rejected";

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">Leave Request Update</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;">Dear <strong>${employeeName}</strong>,</p>
        <p style="margin: 10px 0;">Your leave request has been <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>.</p>
        <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
          <p style="margin: 5px 0;"><strong>Period:</strong> ${startDate} to ${endDate}</p>
          ${reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>` : ""}
        </div>
      </div>
      <p style="color: #6b7280; font-size: 12px;">This is an automated message from HRIS.</p>
    </div>
  `;
}

export function getLeaveSubmittedEmailTemplate(
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason: string
) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">New Leave Request</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;">A new leave request has been submitted and requires your attention.</p>
        <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Employee:</strong> ${employeeName}</p>
          <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${leaveType}</p>
          <p style="margin: 5px 0;"><strong>Period:</strong> ${startDate} to ${endDate}</p>
          <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
        </div>
      </div>
      <p style="color: #6b7280; font-size: 12px;">Please log in to HRIS to approve or reject this request.</p>
    </div>
  `;
}

export function getWelcomeEmailTemplate(name: string, email: string, tempPassword: string, loginUrl?: string) {
  const baseUrl = loginUrl || process.env.NEXTAUTH_URL || '';
  const loginLink = baseUrl ? `${baseUrl}/login` : '';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">Welcome to HRIS!</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;">Dear <strong>${name}</strong>,</p>
        <p style="margin: 10px 0;">Your HRIS account has been created. Here are your login credentials:</p>
        <div style="background: white; padding: 15px; border-radius: 4px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        ${loginLink ? `
        <div style="text-align: center; margin: 20px 0;">
          <a href="${loginLink}" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to HRIS</a>
        </div>
        <p style="margin: 10px 0; color: #6b7280; font-size: 12px;">Or copy this link: <a href="${loginLink}" style="color: #1e40af;">${loginLink}</a></p>
        ` : ''}
        <p style="margin: 10px 0; color: #dc2626;">Please change your password upon first login.</p>
      </div>
      <p style="color: #6b7280; font-size: 12px;">This is an automated message from HRIS.</p>
    </div>
  `;
}

export function getPasswordResetEmailTemplate(name: string, resetLink: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px;">Password Reset Request</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;">Dear <strong>${name}</strong>,</p>
        <p style="margin: 10px 0;">A password reset was requested for your HRIS account.</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetLink}" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
        </div>
        <p style="margin: 10px 0; color: #6b7280;">This link will expire in 1 hour.</p>
        <p style="margin: 10px 0; color: #6b7280;">If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `;
}