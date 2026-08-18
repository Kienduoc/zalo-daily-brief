// mailer.js — Gui email brief qua SMTP. Chi GUI EMAIL, khong dung toi Zalo.
import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendBrief({ dateStr, htmlBody }) {
  const prefix = process.env.MAIL_SUBJECT_PREFIX || "[Bao cao Hang ngay]";
  const subject = `${prefix} Tom tat Zalo - ${dateStr}`;

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#222">
    <h2 style="color:#6CB545;margin:0 0 12px">Bao cao Hang ngay - Tom tat nhom Zalo</h2>
    <p style="color:#666;margin:0 0 16px">Ngay ${dateStr}</p>
    ${htmlBody}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#999;font-size:12px">Tao tu dong boi Thu ky AI Zalo (che do chi doc). Khong tra loi email nay.</p>
    <p style="color:#999;font-size:12px">© 2026 Nguyễn Đức Kiên — 0981689892. Nghiêm cấm sao chép dưới mọi hình thức.</p>
  </div>`;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
    subject,
    html,
  });
  return info.messageId;
}
