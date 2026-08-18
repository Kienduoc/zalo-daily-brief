// reportCore.js — Loi tao bao cao theo khoang thoi gian. Dung chung cho UI web, CLI va brief tu dong.
// Bao cao luu theo TUNG TAI KHOAN: logs/reports/<uid>/2026.08.18_00_00-den-2026.08.18_08_36(Zalo).html
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getMessagesInRange } from "./storage.js";
import { summarize } from "./llm.js";
import { sendBrief } from "./mailer.js";
import { sourceActivityHtml, pageHtml } from "./render.js";
import { enrichAttachments } from "./enrich.js";
import { getProfile, buildSystemPrompt } from "./profile.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, "..", "logs");

const p = (n) => String(n).padStart(2, "0");

function fmt(d) {
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Dinh dang ten file theo yeu cau: 2026.08.18_00_00
function fmtFile(d) {
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}_${p(d.getHours())}_${p(d.getMinutes())}`;
}

// Luu file bao cao vao thu muc cua tai khoan. Trung ten (cung khoang, xuat lai) -> them gio xuat.
export function saveReportFile(from, to, fullHtml, accountId) {
  const acc = String(accountId || "chung");
  const dir = path.join(LOGS_DIR, "reports", acc);
  fs.mkdirSync(dir, { recursive: true });

  let name = `${fmtFile(from)}-den-${fmtFile(to)}(Zalo).html`;
  if (fs.existsSync(path.join(dir, name))) {
    const now = new Date();
    name = `${fmtFile(from)}-den-${fmtFile(to)}(Zalo)_xuat-${p(now.getHours())}_${p(now.getMinutes())}.html`;
  }
  const file = path.join(dir, name);
  fs.writeFileSync(file, fullHtml);
  return { file, name, relUrl: `/logs/reports/${acc}/${encodeURIComponent(name)}` };
}

// Tao bao cao cho khoang [from, to] cua 1 tai khoan. Tra ve { ok, count, file?, relUrl?, label, note? }
export async function runRangeReport(from, to, { email = false, accountId = null, displayName = "", onProgress = null } = {}) {
  const bao = (phase, percent, note) => { if (onProgress) onProgress({ phase, percent, note }); };
  const label = `${fmt(from)} - ${fmt(to)}`;
  const messages = getMessagesInRange(from.getTime(), to.getTime(), accountId);

  if (!messages.length) {
    return { ok: false, count: 0, label, note: "Không có tin nhắn trong khoảng thời gian này." };
  }

  bao("enrich", 12, "Đang đọc ảnh và tài liệu đính kèm…");
  const en = await enrichAttachments(messages, (p) => {
    const pct = p.total ? 12 + Math.round((p.done / p.total) * 28) : 12;
    bao("enrich", pct, `Đã đọc ${p.done}/${p.total} ảnh/tài liệu`);
  });

  bao("summarize", 42, "AI đang đọc và tóm tắt…");
  const sysPrompt = buildSystemPrompt(getProfile(accountId, displayName));
  const aiHtml = await summarize(messages, sysPrompt);
  const body = sourceActivityHtml(messages) + aiHtml;

  bao("save", 95, "Đang tạo file báo cáo…");
  const saved = saveReportFile(from, to, pageHtml("Báo cáo Zalo", label, body), accountId);

  let mailed = false;
  if (email && process.env.SMTP_HOST) {
    bao("mail", 97, "Đang gửi email…");
    await sendBrief({ dateStr: label, htmlBody: body });
    mailed = true;
  }

  return {
    ok: true,
    count: messages.length,
    enriched: en.enriched || 0,
    label,
    file: saved.file,
    relUrl: saved.relUrl,
    mailed,
  };
}
