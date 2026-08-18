// summarize.js — Brief tu dong: tom tat tin MOI ke tu lan brief truoc, luu file + gui email.
// Goi truc tiep: npm run summarize:now
import "dotenv/config";
import { getMessagesSince, loadState, saveState, dateKey } from "./storage.js";
import { summarize } from "./llm.js";
import { sendBrief } from "./mailer.js";
import { sourceActivityHtml, pageHtml } from "./render.js";
import { enrichAttachments } from "./enrich.js";
import { saveReportFile } from "./reportCore.js";
import { getProfile, buildSystemPrompt } from "./profile.js";

export async function runSummary(accountId = null, displayName = "") {
  const state = loadState();
  const today = dateKey();

  // Chi lay tin phat sinh sau lan brief truoc (tranh trung lap)
  const messages = getMessagesSince(state.lastSummaryTs, today, accountId);

  if (!messages.length) {
    console.log("Khong co tin moi de tom tat.");
    return;
  }

  const en = await enrichAttachments(messages);
  if (en.enriched) console.log(`Da doc noi dung ${en.enriched} dinh kem.`);

  console.log(`Dang tom tat ${messages.length} tin nhan...`);
  const aiHtml = await summarize(messages, buildSystemPrompt(getProfile(accountId, displayName)));
  const body = sourceActivityHtml(messages) + aiHtml;

  // Khoang thoi gian cua brief: tu tin dau tien den tin cuoi cung trong dot
  const from = new Date(Math.min(...messages.map((m) => m.ts)));
  const to = new Date();
  const saved = saveReportFile(from, to, pageHtml("Báo cáo Hàng ngày - Zalo", `${today}`, body), accountId);
  console.log("Da luu brief:", saved.file);

  if (process.env.SMTP_HOST) {
    const msgId = await sendBrief({ dateStr: today, htmlBody: body });
    console.log("Da gui email brief:", msgId);
  } else {
    console.log("(Chua cau hinh SMTP -> chua gui email. Mo file HTML o tren de xem.)");
  }

  // Danh dau moc da xu ly = ts lon nhat
  state.lastSummaryTs = Math.max(...messages.map((m) => m.ts));
  saveState(state);
}

// Cho phep chay standalone
if (process.argv.includes("--now")) {
  runSummary().catch((err) => {
    console.error("Loi tom tat:", err);
    process.exit(1);
  });
}
