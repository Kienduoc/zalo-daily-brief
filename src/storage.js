// storage.js — Ghi log tin nhan (markdown de doc + jsonl de tom tat) va quan ly state.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const LOGS_DIR = path.join(ROOT, "logs");
const DATA_DIR = path.join(ROOT, "data");
const MSG_DIR = path.join(DATA_DIR, "messages");
const STATE_PATH = path.join(DATA_DIR, "state.json");

for (const dir of [LOGS_DIR, DATA_DIR, MSG_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function timeLabel(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function safeName(name) {
  return String(name || "Khong-ten").replace(/[\\/:*?"<>|]/g, "-").slice(0, 80);
}

// Ghi 1 tin nhan da lam sach vao ca 2 dinh dang. attach (tuy chon): { kind, href, title }.
// account: uid tai khoan Zalo dang thu tin — de tach bao cao theo tung tai khoan.
export function appendMessage({ ts, threadId, groupName, sender, text, attach, account, msgId }) {
  const day = dateKey(new Date(ts));

  // 1) Markdown de con nguoi doc / Obsidian
  const dayDir = path.join(LOGS_DIR, day);
  fs.mkdirSync(dayDir, { recursive: true });
  const mdFile = path.join(dayDir, `${safeName(groupName)}.md`);
  fs.appendFileSync(mdFile, `[${timeLabel(ts)}] ${sender}: ${text}\n`);

  // 2) JSONL de may xu ly + dedup theo ts
  const record = { ts, threadId, groupName, sender, text };
  if (attach && attach.href) record.attach = attach;
  if (account) record.account = account;
  if (msgId) record.msgId = msgId;
  const jsonlFile = path.join(MSG_DIR, `${day}.jsonl`);
  fs.appendFileSync(jsonlFile, JSON.stringify(record) + "\n");
}

// Tap hop khoa cua tin da co trong 1 ngay — dung de chong ghi trung khi keo lich su ve.
export function getExistingKeys(day) {
  const jsonlFile = path.join(MSG_DIR, day + ".jsonl");
  const keys = new Set();
  if (!fs.existsSync(jsonlFile)) return keys;
  for (const line of fs.readFileSync(jsonlFile, "utf8").split(/\r?\n/)) {
    if (!line) continue;
    try {
      const m = JSON.parse(line);
      if (m.msgId) keys.add(String(m.msgId));
      keys.add(m.ts + "|" + m.sender + "|" + String(m.text).slice(0, 40));
    } catch { /* bo qua dong hong */ }
  }
  return keys;
}

// Ghi hang loat, tu bo qua tin da co. Tra ve so tin thuc su duoc them.
export function appendMessagesDedup(records) {
  const cache = new Map();
  let added = 0;
  for (const r of records) {
    const day = dateKey(new Date(r.ts));
    if (!cache.has(day)) cache.set(day, getExistingKeys(day));
    const keys = cache.get(day);
    const k1 = r.msgId ? String(r.msgId) : null;
    const k2 = r.ts + "|" + r.sender + "|" + String(r.text).slice(0, 40);
    if ((k1 && keys.has(k1)) || keys.has(k2)) continue;
    appendMessage(r);
    if (k1) keys.add(k1);
    keys.add(k2);
    added++;
  }
  return added;
}

// Tin thuoc tai khoan? Tin cu (chua co truong account) coi nhu dung chung.
function matchAccount(m, accountId) {
  return !accountId || !m.account || m.account === accountId;
}

// Doc toan bo tin nhan trong ngay, chi lay tin co ts > sinceTs (loc theo tai khoan neu co).
export function getMessagesSince(sinceTs, day = dateKey(), accountId = null) {
  const jsonlFile = path.join(MSG_DIR, `${day}.jsonl`);
  if (!fs.existsSync(jsonlFile)) return [];
  return fs
    .readFileSync(jsonlFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((m) => m && m.ts > sinceTs && matchAccount(m, accountId));
}

// Doc tat ca tin nhan co ts trong khoang [fromTs, toTs], quet qua nhieu ngay neu can.
export function getMessagesInRange(fromTs, toTs, accountId = null) {
  const out = [];
  const cursor = new Date(fromTs);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(toTs);
  endDay.setHours(23, 59, 59, 999);

  while (cursor.getTime() <= endDay.getTime()) {
    const file = path.join(MSG_DIR, `${dateKey(cursor)}.jsonl`);
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const m = JSON.parse(line);
          if (m && m.ts >= fromTs && m.ts <= toTs && matchAccount(m, accountId)) out.push(m);
        } catch {
          /* bo qua dong hong */
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

export function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return { lastSummaryTs: 0, groups: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { lastSummaryTs: 0, groups: {} };
  }
}

export function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export { dateKey };
