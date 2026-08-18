// uptime.js — Ghi lai cac quang thoi gian phan mem THUC SU dang chay va thu tin.
// Muc dich: bao cao noi ro "khoang nay khong co du lieu vi phan mem khong chay",
// tranh viec nguoi dung tuong la nhom do khong co tin nhan nao.
import fs from "fs";
import path from "path";
import { loadState, saveState } from "./storage.js";

const GAP_TOLERANCE = 12 * 60 * 1000; // gian doan duoi 12 phut coi nhu lien tuc

// Bat dau mot phien thu tin moi (goi khi ket noi Zalo thanh cong)
export function uptimeStart() {
  const st = loadState();
  st.uptime = Array.isArray(st.uptime) ? st.uptime : [];
  const now = Date.now();
  const last = st.uptime[st.uptime.length - 1];
  // Neu vua tat roi bat lai trong thoi gian ngan thi noi tiep phien cu
  if (last && now - last.to < GAP_TOLERANCE) {
    last.to = now;
  } else {
    st.uptime.push({ from: now, to: now });
  }
  if (st.uptime.length > 500) st.uptime = st.uptime.slice(-500);
  saveState(st);
}

// Danh dau "van dang chay" (goi dinh ky trong vong quet)
export function uptimeBeat() {
  const st = loadState();
  if (!Array.isArray(st.uptime) || !st.uptime.length) return uptimeStart();
  st.uptime[st.uptime.length - 1].to = Date.now();
  saveState(st);
}

// Tim cac quang KHONG co du lieu trong [fromTs, toTs]
export function findGaps(fromTs, toTs) {
  const st = loadState();
  const runs = (Array.isArray(st.uptime) ? st.uptime : [])
    .filter((r) => r.to > fromTs && r.from < toTs)
    .sort((a, b) => a.from - b.from);

  const gaps = [];
  let cursor = fromTs;
  for (const r of runs) {
    if (r.from > cursor + GAP_TOLERANCE) gaps.push({ from: cursor, to: r.from });
    cursor = Math.max(cursor, r.to);
  }
  const now = Date.now();
  const end = Math.min(toTs, now);
  if (end > cursor + GAP_TOLERANCE) gaps.push({ from: cursor, to: end });

  const covered = Math.max(0, Math.min(toTs, now) - fromTs) - gaps.reduce((s, g) => s + (g.to - g.from), 0);
  const total = Math.max(1, Math.min(toTs, now) - fromTs);
  return { gaps, phanTramCoDuLieu: Math.round((covered / total) * 100) };
}

// Suy ra cac quang da chay TRONG QUA KHU tu chinh du lieu tin nhan da thu.
// Chay 1 lan khi nhat ky con trong, de bao cao khong bao "0% co du lieu" oan.
export function seedUptimeFromMessages(msgDir) {
  const st = loadState();
  if (Array.isArray(st.uptime) && st.uptime.length) return { seeded: false };

  const ts = [];
  try {
    for (const f of fs.readdirSync(msgDir)) {
      if (!f.endsWith(".jsonl")) continue;
      for (const line of fs.readFileSync(path.join(msgDir, f), "utf8").split(/\r?\n/)) {
        if (!line) continue;
        try {
          const t = Number(JSON.parse(line).ts);
          if (t > 0) ts.push(t);
        } catch { /* bo qua */ }
      }
    }
  } catch {
    return { seeded: false };
  }
  if (!ts.length) return { seeded: false };

  ts.sort((a, b) => a - b);
  // Gom cac moc gan nhau (cach nhau duoi 30 phut) thanh 1 quang chay
  const CLUSTER = 30 * 60 * 1000;
  const runs = [];
  let start = ts[0], prev = ts[0];
  for (const t of ts) {
    if (t - prev > CLUSTER) {
      runs.push({ from: start, to: prev });
      start = t;
    }
    prev = t;
  }
  runs.push({ from: start, to: prev });

  st.uptime = runs;
  saveState(st);
  return { seeded: true, runs: runs.length };
}
