// autostart.js — Bat/tat tu khoi dong cung Windows (khong can quyen quan tri).
// Cach lam: dat 1 file .vbs vao thu muc Startup cua nguoi dung; file nay chay
// trinh khoi dong o che do THU NHO de khong lam phien.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const VBS_NAME = "ThuKyAIZalo-TuKhoiDong.vbs";

export function startupDir() {
  const appData = process.env.APPDATA || "";
  return path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
}

function vbsPath() {
  return path.join(startupDir(), VBS_NAME);
}

// Tim file khoi dong (.bat) cua ban dang chay: ban cai dat hoac ban ma nguon
export function findLauncher() {
  const candidates = [
    path.join(ROOT, "..", "ThuKyAIZalo.bat"), // ban cai dat: <cai>\ThuKyAIZalo.bat, app o <cai>\app
    path.join(ROOT, "ThuKyAIZalo.bat"),
    path.join(ROOT, "ThuKyAI.bat"),           // ban ma nguon
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return path.resolve(c);
  }
  return null;
}

export function getAutostart() {
  const p = vbsPath();
  const launcher = findLauncher();
  let enabled = false;
  let pointsTo = null;
  if (fs.existsSync(p)) {
    enabled = true;
    try {
      const m = fs.readFileSync(p, "utf8").match(/"""(.+?)"""/);
      if (m) pointsTo = m[1];
    } catch { /* bo qua */ }
  }
  return {
    supported: process.platform === "win32" && Boolean(launcher),
    enabled,
    launcher,
    pointsTo,
    // Bat nhung tro sai duong dan (vd da cai lai o cho khac)
    stale: enabled && launcher && pointsTo && path.resolve(pointsTo) !== path.resolve(launcher),
  };
}

export function setAutostart(on) {
  if (process.platform !== "win32") throw new Error("Chỉ hỗ trợ trên Windows.");
  const p = vbsPath();
  if (!on) {
    try { fs.unlinkSync(p); } catch { /* chua co thi thoi */ }
    return getAutostart();
  }
  const launcher = findLauncher();
  if (!launcher) throw new Error("Không tìm thấy file khởi động của phần mềm.");
  fs.mkdirSync(startupDir(), { recursive: true });
  // 7 = cua so thu nho, khong chiem man hinh; False = khong cho chay xong
  const vbs = [
    "' Tu khoi dong Thu Ky AI Zalo cung Windows",
    "' Xoa file nay la tat tu khoi dong.",
    `CreateObject("WScript.Shell").Run """${launcher}""", 7, False`,
    "",
  ].join("\r\n");
  fs.writeFileSync(p, vbs, "utf8");
  return getAutostart();
}
