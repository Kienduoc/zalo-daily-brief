// server.js — Phan mem "Thu ky AI Zalo": giao dien web noi bo tren may.
// Chay: npm run app  (hoac dup chuot ThuKyAI.bat) -> mo http://localhost:3179
// Gom: ket noi Zalo bang QR tren man hinh, lang nghe 24/7 (CHI DOC), bao cao bang nut bam.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec, execFile } from "child_process";
import express from "express";
import cron from "node-cron";
import { Zalo } from "zca-js";
import { startListener } from "./listener.js";
import { runSummary } from "./summarize.js";
import { runRangeReport } from "./reportCore.js";
import { loadState, dateKey } from "./storage.js";
import { scanAccount } from "./accountScan.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SESSION_PATH = path.join(ROOT, "data", "session.json");
const GROUPS_PATH = path.join(ROOT, "config", "groups.json");
const LOGS_DIR = path.join(ROOT, "logs");
const MSG_DIR = path.join(ROOT, "data", "messages");
const PORT = Number(process.env.APP_PORT || 3179);

// ===== Trang thai ket noi Zalo =====
// status: chua_ket_noi | cho_quet | dang_ket_noi | da_ket_noi | loi
const zState = {
  status: "chua_ket_noi",
  qrImage: null, // data URL cua ma QR khi cho quet
  account: null, // ten hien thi sau khi quet
  error: null,
  connectedAt: null,
};
let apiInstance = null;
let loginInFlight = false;

// ===== Quet tai khoan dinh ky (mac dinh 5 phut/lan) =====
const SCAN_MINUTES = Math.max(1, Number(process.env.SCAN_MINUTES || 5));
let scanData = null; // ket qua lan quet gan nhat
let scanTimer = null;
let currentScan = null; // promise cua lan quet dang chay (de nut bam DOI ket qua that, khong bo qua)

function runAccountScan() {
  if (!apiInstance) return Promise.resolve(null);
  if (currentScan) return currentScan; // dang quet -> doi chung ket qua, khong quet chong cheo
  currentScan = (async () => {
    try {
      const prevTs = scanData?.scannedAt || null;
      scanData = await scanAccount(apiInstance, prevTs);
      if (scanData.errors.length) console.log("Quet tai khoan (co loi 1 phan):", scanData.errors.join("; "));
    } catch (e) {
      console.error("Loi quet tai khoan:", e.message);
    } finally {
      currentScan = null;
    }
    return scanData;
  })();
  return currentScan;
}

function startScanLoop() {
  if (scanTimer) clearInterval(scanTimer);
  runAccountScan(); // quet ngay khi vua ket noi
  scanTimer = setInterval(runAccountScan, SCAN_MINUTES * 60 * 1000);
}

// ===== Trang thai dang nhap BO NAO AI =====
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "claude-code").trim();
const CLAUDE_CMD = process.env.CLAUDE_CMD || "claude";
let aiState = { provider: LLM_PROVIDER, ready: false, detail: "Chưa kiểm tra", checkedAt: null };

function checkAiStatus() {
  return new Promise((resolve) => {
    if (LLM_PROVIDER !== "claude-code") {
      const ok = Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
      aiState = {
        provider: LLM_PROVIDER, ready: ok, checkedAt: Date.now(),
        detail: ok ? "Endpoint: " + process.env.LLM_BASE_URL : "Chưa điền LLM_BASE_URL/LLM_API_KEY trong .env",
      };
      return resolve(aiState);
    }
    execFile(CLAUDE_CMD, ["auth", "status"], { shell: true, windowsHide: true, timeout: 30_000 }, (err, stdout) => {
      try {
        const s = JSON.parse(String(stdout || "").trim());
        aiState = {
          provider: "claude-code",
          ready: Boolean(s.loggedIn),
          email: s.email || null,
          org: s.orgName || null,
          plan: s.subscriptionType || null,
          checkedAt: Date.now(),
          detail: s.loggedIn
            ? `Đã đăng nhập: ${s.email || ""}${s.orgName ? " (" + s.orgName + ")" : ""}`
            : "Chưa đăng nhập Claude — bấm nút Đăng nhập AI.",
        };
      } catch {
        aiState = {
          provider: "claude-code", ready: false, checkedAt: Date.now(),
          detail: err ? "Chưa cài Claude Code trên máy (npm install -g @anthropic-ai/claude-code)" : "Không đọc được trạng thái đăng nhập.",
        };
      }
      resolve(aiState);
    });
  });
}

function loadAllowedThreadIds() {
  if (!fs.existsSync(GROUPS_PATH)) return new Set();
  try {
    const cfg = JSON.parse(fs.readFileSync(GROUPS_PATH, "utf8"));
    return new Set((cfg.groups || []).map((g) => String(g.threadId)));
  } catch {
    return new Set();
  }
}

function attachListener(api) {
  const watchAll = String(process.env.WATCH_ALL_GROUPS || "true") === "true";
  startListener(api, { watchAll, allowedThreadIds: loadAllowedThreadIds(), accountId: zState.uid });
}

function markConnected(api, name) {
  apiInstance = api;
  zState.status = "da_ket_noi";
  zState.qrImage = null;
  zState.error = null;
  zState.account = name || zState.account;
  zState.uid = api.getContext()?.uid || null; // uid tai khoan — dung de tach du lieu/bao cao
  zState.connectedAt = Date.now();
  attachListener(api);
  startScanLoop();
  console.log(`Zalo da ket noi (uid ${zState.uid}). Dang lang nghe (CHI DOC). Tu quet ${SCAN_MINUTES} phut/lan.`);
}

// Thu dang nhap bang session da luu (khong can QR)
async function trySessionLogin() {
  if (!fs.existsSync(SESSION_PATH)) return false;
  try {
    const s = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    const zalo = new Zalo({ selfListen: false });
    const api = await zalo.login({ cookie: s.cookie, imei: s.imei, userAgent: s.userAgent });
    markConnected(api, s.accountName || null);
    return true;
  } catch (err) {
    console.log("Session cu khong dung duoc:", String(err?.message || err));
    zState.status = "chua_ket_noi";
    return false;
  }
}

// Bat dau luong quet QR (goi tu nut "Ket noi Zalo" tren web)
async function startQrLogin() {
  if (loginInFlight) return;
  loginInFlight = true;
  zState.status = "cho_quet";
  zState.qrImage = null;
  zState.error = null;
  let retries = 0;

  try {
    const zalo = new Zalo({ selfListen: false });
    const api = await zalo.loginQR({}, (event) => {
      // 0=QR moi tao, 1=het han, 2=da quet, 3=tu choi, 4=da nhan thong tin dang nhap
      if (event.type === 0 && event.data?.image) {
        const img = String(event.data.image);
        zState.qrImage = img.startsWith("data:") ? img : `data:image/png;base64,${img}`;
        zState.status = "cho_quet";
      } else if (event.type === 1) {
        if (retries < 5 && event.actions?.retry) {
          retries++;
          event.actions.retry();
        } else {
          event.actions?.abort?.();
          zState.status = "loi";
          zState.error = "Mã QR hết hạn nhiều lần. Bấm Kết nối lại.";
        }
      } else if (event.type === 2) {
        zState.status = "dang_ket_noi";
        zState.account = event.data?.display_name || null;
        zState.qrImage = null;
      } else if (event.type === 3) {
        zState.status = "loi";
        zState.error = "Bạn đã từ chối đăng nhập trên điện thoại.";
      }
    });

    // Luu session de lan sau khong can quet lai
    const cookie = api.getCookie();
    const ctx = api.getContext();
    fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
    fs.writeFileSync(
      SESSION_PATH,
      JSON.stringify(
        { cookie: cookie.toJSON(), imei: ctx.imei, userAgent: ctx.userAgent, accountName: zState.account },
        null,
        2
      )
    );
    markConnected(api, zState.account);
  } catch (err) {
    zState.status = "loi";
    zState.error = "Kết nối thất bại: " + String(err?.message || err);
  } finally {
    loginInFlight = false;
  }
}

// Dem so tin da thu hom nay
function countToday() {
  const f = path.join(MSG_DIR, `${dateKey()}.jsonl`);
  if (!fs.existsSync(f)) return 0;
  return fs.readFileSync(f, "utf8").split("\n").filter(Boolean).length;
}

// Liet ke bao cao CUA TAI KHOAN dang dang nhap (moi nhat truoc). Khong tron bao cao tai khoan khac.
function listReports() {
  if (!zState.uid) return [];
  const dir = path.join(LOGS_DIR, "reports", String(zState.uid));
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".html")) continue;
    const st = fs.statSync(path.join(dir, f));
    out.push({
      name: f.replace(/\.html$/, ""),
      url: `/logs/reports/${zState.uid}/${encodeURIComponent(f)}`,
      mtime: st.mtimeMs,
      kind: "Báo cáo",
    });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out.slice(0, 50);
}

// ===== Web app =====
const app = express();
app.use(express.json());

// ===== Khoa phan mem bang Key (APP_KEY trong .env) =====
const APP_KEY = (process.env.APP_KEY || "").trim();

function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isUnlocked(req) {
  if (!APP_KEY) return true; // khong dat key -> khong khoa
  return readCookies(req).appkey === APP_KEY;
}

// Nhap key mo khoa (khong bi chan boi middleware ben duoi)
app.post("/api/unlock", (req, res) => {
  if (!APP_KEY) return res.json({ ok: true, note: "Phần mềm không đặt khóa." });
  const key = String(req.body?.key || "").trim();
  if (key !== APP_KEY) return res.status(401).json({ ok: false, note: "Key không đúng. Liên hệ Nguyễn Đức Kiên — 0981689892." });
  // Ghi nho 90 ngay tren trinh duyet nay
  res.setHeader("Set-Cookie", `appkey=${encodeURIComponent(key)}; Path=/; Max-Age=${90 * 24 * 3600}; SameSite=Lax`);
  res.json({ ok: true });
});

// Chan moi API va bao cao khi chua mo khoa (trang chinh van mo duoc de hien man hinh nhap key)
app.use((req, res, next) => {
  if (isUnlocked(req)) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ ok: false, locked: true, note: "Cần nhập Key phần mềm." });
  if (req.path.startsWith("/logs/")) return res.status(401).send("Cần nhập Key phần mềm để xem báo cáo. Quay lại trang chính.");
  next();
});

// Giao dien: cam cache de nguoi dung luon nhan ban moi nhat sau khi nang cap
app.use(express.static(path.join(ROOT, "public"), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => res.setHeader("Cache-Control", "no-store"),
}));
app.use("/logs", express.static(LOGS_DIR));

app.get("/api/status", (req, res) => {
  const state = loadState();
  res.json({
    status: zState.status,
    qrImage: zState.qrImage,
    account: zState.account,
    error: zState.error,
    groupsSeen: Object.keys(state.groups || {}).length,
    msgToday: countToday(),
    smtpConfigured: Boolean(process.env.SMTP_HOST),
    summaryCron: process.env.SUMMARY_CRON || "0 18 * * 1-5",
    scan: scanData,
    scanMinutes: SCAN_MINUTES,
    scanBusy: Boolean(currentScan),
    ai: aiState,
  });
});

app.post("/api/connect", (req, res) => {
  if (zState.status === "da_ket_noi") return res.json({ ok: true, already: true });
  startQrLogin(); // chay nen, UI se poll /api/status de lay QR
  res.json({ ok: true });
});

// Quet lai ngay theo yeu cau (nut tren giao dien) — DOI quet xong that moi tra ket qua
app.post("/api/scan", async (req, res) => {
  if (!apiInstance) return res.status(400).json({ ok: false, note: "Chưa kết nối Zalo." });
  await runAccountScan();
  res.json({ ok: true, scan: scanData });
});

// Kiem tra lai trang thai dang nhap AI
app.post("/api/ai/check", async (req, res) => {
  res.json(await checkAiStatus());
});

// Mo cua so dang nhap OAuth cho bo nao AI (Claude) — nguoi dung lam theo huong dan trong cua so do
app.post("/api/ai/login", (req, res) => {
  if (LLM_PROVIDER !== "claude-code") {
    return res.status(400).json({ ok: false, note: "Đang dùng endpoint HTTP — điền LLM_BASE_URL/LLM_API_KEY trong .env thay vì đăng nhập OAuth." });
  }
  if (process.platform !== "win32") {
    return res.status(400).json({ ok: false, note: "Mở cửa sổ lệnh và chạy: claude auth login" });
  }
  exec(`start "Dang nhap Claude AI" cmd /k "echo DANG NHAP BO NAO AI (Claude) - lam theo huong dan duoi day: && ${CLAUDE_CMD} auth login && echo. && echo XONG! Dong cua so nay va quay lai phan mem, bam Kiem tra lai."`, { shell: "cmd.exe" });
  res.json({ ok: true, note: "Đã mở cửa sổ đăng nhập. Làm theo hướng dẫn trong đó (trình duyệt sẽ mở trang đăng nhập Claude), xong quay lại bấm Kiểm tra lại." });
});

// Dang nhap lai tu dau: ngat phien hien tai, xoa session cu, phat QR moi
app.post("/api/relogin", (req, res) => {
  try {
    apiInstance?.listener?.stop?.();
  } catch { /* listener co the da dung */ }
  apiInstance = null;
  if (scanTimer) clearInterval(scanTimer);
  scanTimer = null;
  scanData = null;
  try {
    fs.unlinkSync(SESSION_PATH);
  } catch { /* chua co file */ }
  zState.account = null;
  zState.uid = null;
  zState.connectedAt = null;
  startQrLogin(); // phat ma QR moi ngay
  res.json({ ok: true });
});

let reportBusy = false;
app.post("/api/report", async (req, res) => {
  if (reportBusy) return res.status(429).json({ ok: false, note: "Đang có báo cáo khác chạy, đợi chút nhé." });
  const from = new Date(req.body?.from);
  const to = new Date(req.body?.to);
  if (isNaN(from) || isNaN(to) || from > to) {
    return res.status(400).json({ ok: false, note: "Khoảng thời gian không hợp lệ." });
  }
  if (!zState.uid) return res.status(400).json({ ok: false, note: "Kết nối Zalo trước đã — báo cáo gắn với tài khoản đang đăng nhập." });
  reportBusy = true;
  try {
    const r = await runRangeReport(from, to, { email: Boolean(req.body?.email), accountId: zState.uid });
    res.json(r);
  } catch (err) {
    res.status(500).json({ ok: false, note: "Lỗi tạo báo cáo: " + String(err?.message || err) });
  } finally {
    reportBusy = false;
  }
});

app.get("/api/reports", (req, res) => res.json(listReports()));

// ===== Khoi dong =====
async function boot() {
  // Lich tom tat hang ngay van chay du ket noi hay chua (chi tom tat log da co)
  const cronExpr = process.env.SUMMARY_CRON || "0 18 * * 1-5";
  cron.schedule(cronExpr, () => {
    console.log("== Chay tom tat theo lich ==");
    runSummary(zState.uid).catch((e) => console.error("Loi tom tat:", e.message));
  }, { timezone: process.env.TZ || "Asia/Ho_Chi_Minh" });

  const srv = app.listen(PORT, "127.0.0.1", () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Thu ky AI Zalo dang chay tai: ${url}`);
    if (process.platform === "win32" && !process.env.NO_OPEN) {
      exec(`start "" ${url}`, { shell: "cmd.exe" });
    }
  });
  srv.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log("\nPhan mem DA DANG CHAY o cua so khac roi.");
      console.log(`Mo trinh duyet vao: http://localhost:${PORT} de dung. Cua so nay se dong.`);
    } else {
      console.error("Loi khoi dong web:", err.message);
    }
    process.exit(1);
  });

  checkAiStatus(); // kiem tra bo nao AI ngay khi khoi dong
  await trySessionLogin(); // tu ket noi neu co session cu
}

boot();
