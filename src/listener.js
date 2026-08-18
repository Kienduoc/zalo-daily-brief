// listener.js — LANG NGHE (CHI DOC) tin nhan group Zalo va ghi log.
// ================== NGUYEN TAC BAT BUOC ==================
// He thong nay TUYET DOI KHONG gui tin, khong tra loi, khong react trong bat ky nhom nao.
// O day chi co api.listener (nhan su kien). KHONG dung api.sendMessage / addReaction / bat ky ham gui nao.
// =========================================================
import { ThreadType } from "zca-js";
import { cleanContent, describeAttachment } from "./clean.js";
import { appendMessage, loadState, saveState } from "./storage.js";

// Cache ten nhom de khong goi API lien tuc
const groupNameCache = new Map();

async function resolveGroupName(api, threadId) {
  if (groupNameCache.has(threadId)) return groupNameCache.get(threadId);
  let name = threadId;
  try {
    const info = await api.getGroupInfo(threadId);
    name = info?.gridInfoMap?.[threadId]?.name || threadId;
  } catch {
    // Neu khong lay duoc ten, dung threadId
  }
  groupNameCache.set(threadId, name);
  return name;
}

export function startListener(api, { watchAll, allowedThreadIds, accountId = null }) {
  api.listener.on("message", async (msg) => {
    try {
      // Bo qua tin do chinh anh Kien (tai khoan nay) gui di
      if (msg.isSelf) return;

      const isGroup = msg.type === ThreadType.Group;
      const threadId = msg.threadId;

      // Whitelist chi ap cho nhom; tin nhan ca nhan luon nhan
      if (isGroup && !watchAll && !allowedThreadIds.has(threadId)) return;

      // Noi dung: chuoi (text) hoac object (dinh kem: anh/file/video...)
      const raw = msg.data?.content;
      let text = null;
      let attach = null;
      if (typeof raw === "string") {
        text = cleanContent(raw);
      } else if (raw && typeof raw === "object") {
        const a = describeAttachment(raw, msg.data?.msgType);
        if (a) {
          text = a.marker;
          attach = { kind: a.kind, href: a.href, title: a.title };
        }
      }
      if (!text) return; // rac / sticker / su kien he thong

      const ts = Number(msg.data?.ts) || Date.now();
      const sender = msg.data?.dName || msg.data?.uidFrom || "Khong ro";
      // Nhom: dung ten nhom. Ca nhan: gan nhan "[Ca nhan] <nguoi nhan>".
      const label = isGroup
        ? await resolveGroupName(api, threadId)
        : `[Ca nhan] ${sender}`;

      appendMessage({ ts, threadId, groupName: label, sender, text, attach, account: accountId, msgId: msg.data?.msgId });

      // Cap nhat danh ba hoi thoai da thay (phuc vu discovery)
      const state = loadState();
      if (state.groups[threadId] !== label) {
        state.groups[threadId] = label;
        saveState(state);
        console.log(`[${isGroup ? "nhom moi" : "ca nhan moi"}] ${label}  (threadId: ${threadId})`);
      }
    } catch (err) {
      console.error("Loi xu ly tin nhan:", err.message);
    }
  });

  api.listener.start();
  console.log("Dang lang nghe (che do CHI DOC)...");
}
