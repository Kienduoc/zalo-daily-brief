// backfill.js — Keo tin nhan CU tu may chu Zalo ve theo khoang thoi gian.
// Giai quyet: may moi cai chua co du lieu, hoac phan mem vua tat mot luc bi hong tin.
// Chi lam duoc voi NHOM (Zalo khong mo API lich su cho tin nhan ca nhan).
import { cleanContent, describeAttachment } from "./clean.js";
import { appendMessagesDedup } from "./storage.js";

const NAME_CHUNK = 50;   // so nhom lay ten moi lan goi
const CONCURRENCY = 6;   // so nhom quet song song
const MS_DAY = 86400000;

// So tin can lay moi nhom, tuy theo khoang thoi gian yeu cau
function countFor(fromTs, toTs) {
  const days = Math.max(1, Math.ceil((toTs - fromTs) / MS_DAY));
  if (days <= 1) return 50;
  if (days <= 3) return 100;
  if (days <= 7) return 200;
  return 300;
}

// Lay ten cua nhieu nhom (goi theo lo de nhanh)
async function fetchGroupNames(api, ids) {
  const names = new Map();
  for (let i = 0; i < ids.length; i += NAME_CHUNK) {
    const chunk = ids.slice(i, i + NAME_CHUNK);
    try {
      const info = await api.getGroupInfo(chunk);
      const map = info?.gridInfoMap || {};
      for (const id of chunk) names.set(id, map[id]?.name || id);
    } catch {
      for (const id of chunk) names.set(id, id); // khong lay duoc ten thi dung id
    }
  }
  return names;
}

// Doi 1 tin tu lich su thanh ban ghi luu tru; tra ve null neu la rac
function toRecord(msg, groupName, accountId) {
  const raw = msg?.data?.content;
  let text = null;
  let attach = null;

  if (typeof raw === "string") {
    text = cleanContent(raw);
  } else if (raw && typeof raw === "object") {
    const a = describeAttachment(raw, msg?.data?.msgType);
    if (a) {
      text = a.marker;
      attach = { kind: a.kind, href: a.href, title: a.title };
    }
  }
  if (!text) return null;

  return {
    ts: Number(msg?.data?.ts) || 0,
    threadId: msg.threadId,
    groupName,
    sender: msg?.data?.dName || msg?.data?.uidFrom || "Khong ro",
    text,
    ...(attach ? { attach } : {}),
    ...(accountId ? { account: accountId } : {}),
    ...(msg?.data?.msgId ? { msgId: String(msg.data.msgId) } : {}),
  };
}

/**
 * Keo lich su cac nhom trong khoang [fromTs, toTs] va luu vao kho (tu chong trung).
 * onProgress({ done, total, added }) duoc goi de bao tien do.
 */
export async function backfillRange(api, { fromTs, toTs, accountId = null, onProgress = null }) {
  const t0 = Date.now();

  // 1) Danh sach nhom dang tham gia
  let ids = [];
  try {
    const all = await api.getAllGroups();
    ids = Object.keys(all?.gridVerMap || {});
  } catch (e) {
    return { ok: false, note: "Không lấy được danh sách nhóm: " + e.message };
  }
  if (!ids.length) return { ok: true, groups: 0, added: 0, ms: 0 };

  // 2) Kiem tra endpoint lich su con song khong (Zalo da bo /api/group/history)
  //    Thu 1 nhom truoc: neu 404 thi dung ngay, khong quet 331 nhom vo ich.
  try {
    await api.getGroupChatHistory(ids[0], 10);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("404")) {
      return {
        ok: true, unavailable: true, groups: 0, added: 0, ms: Date.now() - t0,
        note: "Zalo hiện không cho lấy lịch sử tin nhắn cũ (endpoint trả 404). Chỉ tóm tắt được tin phần mềm đã thu.",
      };
    }
  }

  // 3) Ten nhom (goi theo lo)
  const names = await fetchGroupNames(api, ids);

  // 3) Quet lich su tung nhom, chay song song co gioi han
  const count = countFor(fromTs, toTs);
  const collected = [];
  let done = 0;
  let failed = 0;
  let idx = 0;

  async function worker() {
    while (idx < ids.length) {
      const gid = ids[idx++];
      try {
        const hist = await api.getGroupChatHistory(gid, count);
        const msgs = hist?.groupMsgs || [];
        for (const m of msgs) {
          const ts = Number(m?.data?.ts) || 0;
          if (ts < fromTs || ts > toTs) continue;
          if (m.isSelf) continue; // bo qua tin do chinh minh gui
          const rec = toRecord(m, names.get(gid) || gid, accountId);
          if (rec) collected.push(rec);
        }
      } catch {
        failed++; // nhom loi thi bo qua, khong lam hong ca dot quet
      }
      done++;
      if (onProgress && done % 10 === 0) onProgress({ done, total: ids.length });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  // 4) Luu, tu bo qua tin da co
  const added = appendMessagesDedup(collected);

  return {
    ok: true,
    groups: ids.length,
    failed,
    found: collected.length,
    added,
    ms: Date.now() - t0,
  };
}
