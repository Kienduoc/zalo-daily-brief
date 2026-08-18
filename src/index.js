// index.js — Tien trinh chay nen 24/7: lang nghe + hen gio tom tat.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Zalo } from "zca-js";
import cron from "node-cron";
import { startListener } from "./listener.js";
import { runSummary } from "./summarize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SESSION_PATH = path.join(ROOT, "data", "session.json");
const GROUPS_PATH = path.join(ROOT, "config", "groups.json");

function loadAllowedThreadIds() {
  if (!fs.existsSync(GROUPS_PATH)) return new Set();
  try {
    const cfg = JSON.parse(fs.readFileSync(GROUPS_PATH, "utf8"));
    return new Set((cfg.groups || []).map((g) => String(g.threadId)));
  } catch {
    return new Set();
  }
}

async function main() {
  if (!fs.existsSync(SESSION_PATH)) {
    console.error("Chua co session. Chay truoc: npm run login");
    process.exit(1);
  }

  const session = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
  const zalo = new Zalo({ selfListen: false });
  const api = await zalo.login({
    cookie: session.cookie,
    imei: session.imei,
    userAgent: session.userAgent,
  });
  console.log("Da dang nhap Zalo bang session da luu.");

  const watchAll = String(process.env.WATCH_ALL_GROUPS || "true") === "true";
  const allowedThreadIds = loadAllowedThreadIds();
  console.log(
    watchAll
      ? "Che do: theo doi TAT CA nhom."
      : `Che do: chi theo doi ${allowedThreadIds.size} nhom trong config/groups.json.`
  );

  startListener(api, { watchAll, allowedThreadIds });

  // Hen gio tom tat + gui email
  const cronExpr = process.env.SUMMARY_CRON || "0 18 * * 1-5";
  cron.schedule(
    cronExpr,
    () => {
      console.log("== Chay tom tat theo lich ==");
      runSummary().catch((err) => console.error("Loi tom tat:", err.message));
    },
    { timezone: process.env.TZ || "Asia/Ho_Chi_Minh" }
  );
  console.log(`Da len lich tom tat: "${cronExpr}" (${process.env.TZ || "Asia/Ho_Chi_Minh"})`);

  // Giu tien trinh song
  process.stdin.resume();
}

main().catch((err) => {
  const msg = String(err?.message || err);
  if (msg.includes("Đăng nhập thất bại") || msg.includes("dang nhap")) {
    console.error("\nSession Zalo da het hieu luc (thuong do co phien Zalo Web khac cua cung tai khoan tranh cho, hoac token bi xoay).");
    console.error("Xu ly: dong het Zalo Web cua tai khoan bot tren trinh duyet, roi chay lai:");
    console.error("   npm run login   (quet QR)   ->   npm start\n");
  } else {
    console.error("Loi khoi dong:", err);
  }
  process.exit(1);
});
