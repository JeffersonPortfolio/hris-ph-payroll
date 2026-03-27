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
  try {
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      console.error("Email send error: ABACUSAI_API_KEY is not configured");
      return { success: false, message: "Email service not configured - missing API key" };
    }

    const appUrl = process.env.NEXTAUTH_URL || "";
    let appName = "HRIS";
    let senderEmail = "noreply@hris.abacusai.app";
    
    if (appUrl) {
      try {
        const url = new URL(appUrl);
        appName = url.hostname.split(".")[0] || "HRIS";
        senderEmail = `noreply@${url.hostname}`;
      } catch (e) {
        console.warn("Invalid NEXTAUTH_URL, using defaults");
      }
    }

    const payload = {
      deployment_token: apiKey,
      subject,
      body,
      is_html: isHtml,
      recipient_email: to,
      sender_email: senderEmail,
      sender_alias: `${appName} HRIS`,
    };

    console.log(`[EMAIL] Sending to: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Sender: ${senderEmail}`);

    const response = await fetch("https://apps.abacus.ai/api/sendNotificationEmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log(`[EMAIL] Response status: ${response.status}`);
    console.log(`[EMAIL] Response body:`, JSON.stringify(result));
    
    if (!result.success) {
      console.error(`[EMAIL] Failed for ${to}:`, result.message || result.error || JSON.stringify(result));
      return { success: false, message: result.message || result.error || "Email service error" };
    }
    
    console.log(`[EMAIL] Successfully sent to ${to}`);
    return { success: true, message: "Email sent" };
  } catch (error: any) {
    console.error("[EMAIL] Exception:", error?.message || error);
    return { success: false, message: error?.message || "Failed to send email" };
  }
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