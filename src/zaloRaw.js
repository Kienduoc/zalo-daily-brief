// zaloRaw.js — Goi thang API Zalo o muc thap (dung lai bo ma hoa/giai ma cua zca-js).
// Muc dich: lay lich su KHONG bi gioi han so tin, va lay duoc ca tin nhan CA NHAN
// (thu vien chi boc san lich su NHOM voi count co dinh).
import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";

let cachedUtils = null;

async function loadUtils() {
  if (cachedUtils) return cachedUtils;
  const require = createRequire(import.meta.url);
  // Chi duong dan "." duoc phep -> tra ve .../zca-js/dist/index.js
  const entry = require.resolve("zca-js");
  // require.resolve tra ve ban CJS (.../dist/cjs/index.cjs) -> lui ve dist/ de lay ban ESM
  let dir = path.dirname(entry);
  if (path.basename(dir) === "cjs") dir = path.dirname(dir);
  const utilsPath = path.join(dir, "utils.js");
  cachedUtils = await import(pathToFileURL(utilsPath).href);
  return cachedUtils;
}

// Goi 1 endpoint Zalo voi tham so bat ky. Tra ve du lieu da giai ma.
export async function rawCall(api, baseUrl, params) {
  const u = await loadUtils();
  const ctx = api.getContext();
  const encoded = u.encodeAES(ctx.secretKey, JSON.stringify(params));
  if (!encoded) throw new Error("Khong ma hoa duoc tham so");
  const url = u.makeURL(ctx, baseUrl, { params: encoded });
  const res = await u.request(ctx, url, { method: "GET" });
  return u.resolveResponse(ctx, res, (r) => {
    let data = r.data;
    if (typeof data === "string") {
      try { data = JSON.parse(data); } catch { /* giu nguyen */ }
    }
    return data;
  });
}

export function groupHistoryUrl(api) {
  return `${api.zpwServiceMap.group[0]}/api/group/history`;
}
export function userHistoryUrl(api) {
  return `${api.zpwServiceMap.chat[0]}/api/message/history`;
}

// ===== BO DO: thu cac dang tham so de tim dung cach Zalo chap nhan =====

// Do lich su NHOM: count lon co duoc khong, phan trang bang tham so nao
export async function probeGroupHistory(api, groupId) {
  const url = groupHistoryUrl(api);
  const out = [];

  // Doi chieu voi ham san co cua thu vien
  try {
    const lib = await api.getGroupChatHistory(groupId, 50);
    out.push({ thu: "ham thu vien getGroupChatHistory(50)", ok: true, soTin: (lib?.groupMsgs || []).length, more: lib?.more });
  } catch (e) {
    out.push({ thu: "ham thu vien getGroupChatHistory(50)", ok: false, loi: String(e.message).slice(0, 120) });
  }
  out.push({ thu: "URL dang dung", url, serviceMapGroup: api.zpwServiceMap?.group?.[0] || null });

  for (const count of [50, 500, 2000]) {
    try {
      const d = await rawCall(api, url, { grid: groupId, count });
      const msgs = d?.groupMsgs || [];
      out.push({ thu: `count=${count}`, ok: true, soTin: msgs.length, more: d?.more,
        cuNhat: msgs.length ? Number(msgs[0]?.ts || msgs[0]?.data?.ts) : null,
        moiNhat: msgs.length ? Number(msgs[msgs.length - 1]?.ts || msgs[msgs.length - 1]?.data?.ts) : null });
    } catch (e) {
      out.push({ thu: `count=${count}`, ok: false, loi: String(e.message).slice(0, 120) });
    }
  }

  // Thu phan trang lui bang cac ten tham so kha di
  let anchor = null;
  try {
    const d = await rawCall(api, url, { grid: groupId, count: 50 });
    const msgs = d?.groupMsgs || [];
    if (msgs.length) anchor = { msgId: msgs[0]?.data?.msgId, globalMsgId: msgs[0]?.data?.globalMsgId, ts: msgs[0]?.data?.ts };
  } catch { /* bo qua */ }

  if (anchor?.msgId) {
    for (const key of ["lastMsgId", "msgId", "lastGlobalMsgId", "globalMsgId", "fromMsgId", "lastActionId"]) {
      try {
        const d = await rawCall(api, url, { grid: groupId, count: 50, [key]: anchor.msgId });
        const msgs = d?.groupMsgs || [];
        const oldest = msgs.length ? Number(msgs[0]?.data?.ts) : null;
        out.push({ thu: `phanTrang ${key}`, ok: true, soTin: msgs.length, cuNhat: oldest,
          luiDuocKhongOld: oldest && anchor.ts ? oldest < Number(anchor.ts) : null });
      } catch (e) {
        out.push({ thu: `phanTrang ${key}`, ok: false, loi: String(e.message).slice(0, 80) });
      }
    }
  }
  return { anchor, ketQua: out };
}

// Do lich su CA NHAN: thu nhieu endpoint x nhieu ten tham so
export async function probeUserHistory(api, userId) {
  const bases = [
    { ten: "chat/message/history", url: `${api.zpwServiceMap.chat[0]}/api/message/history` },
    { ten: "chat/message/getmsgs", url: `${api.zpwServiceMap.chat[0]}/api/message/getmsgs` },
    { ten: "conv/message/history", url: `${api.zpwServiceMap.conversation[0]}/api/message/history` },
    { ten: "zimsg/message/history", url: `${api.zpwServiceMap.zimsg?.[0] || api.zpwServiceMap.chat[0]}/api/message/history` },
  ];
  const paramSets = [
    { ten: "toid", make: (id, c) => ({ toid: id, count: c }) },
    { ten: "uid", make: (id, c) => ({ uid: id, count: c }) },
    { ten: "fid", make: (id, c) => ({ fid: id, count: c }) },
    { ten: "toUid", make: (id, c) => ({ toUid: id, count: c }) },
    { ten: "toid+offset", make: (id, c) => ({ toid: id, count: c, offset: 0 }) },
  ];

  const out = [];
  for (const b of bases) {
    for (const ps of paramSets) {
      try {
        const d = await rawCall(api, b.url, ps.make(userId, 20));
        const msgs = d?.msgs || d?.userMsgs || d?.groupMsgs || d?.messages || [];
        const keys = d && typeof d === "object" ? Object.keys(d).slice(0, 8) : [];
        out.push({ endpoint: b.ten, thamSo: ps.ten, ok: true, soTin: msgs.length, cacTruong: keys });
      } catch (e) {
        out.push({ endpoint: b.ten, thamSo: ps.ten, ok: false, loi: String(e.message).slice(0, 90) });
      }
    }
  }
  return out;
}

// Do cac duong dan kha di khi endpoint cu bi 404
export async function probeGroupPaths(api, groupId) {
  const g = api.zpwServiceMap.group[0];
  const paths = [
    "/api/group/history", "/api/group/getmsgs", "/api/group/msgs", "/api/group/loadmsg",
    "/api/group/gethistory", "/api/group/historyv2", "/api/group/history/v2",
    "/api/group/getlistmsg", "/api/group/recentmsg",
  ];
  const out = [];
  for (const pth of paths) {
    try {
      const d = await rawCall(api, g + pth, { grid: groupId, count: 20 });
      const keys = d && typeof d === "object" ? Object.keys(d).slice(0, 8) : [];
      out.push({ path: pth, ok: true, cacTruong: keys });
    } catch (e) {
      const m = String(e.message);
      out.push({ path: pth, ok: false, loi: m.includes("404") ? "404" : m.slice(0, 70) });
    }
  }
  return out;
}

// Phep thu doi chung: goi endpoint DANG CHAY TOT bang cung duong ong nay.
// Neu cai nay OK ma history 404 => loi thuoc ve Zalo da bo endpoint, khong phai code.
export async function probeControl(api, groupId) {
  const url = `${api.zpwServiceMap.group[0]}/api/group/getmg-v2`;
  const params = { gridVerMap: JSON.stringify({ [groupId]: 0 }) };
  try {
    const d = await rawCall(api, url, params);
    const name = d?.gridInfoMap?.[groupId]?.name || null;
    return { ok: true, endpoint: "/api/group/getmg-v2", tenNhom: name };
  } catch (e) {
    return { ok: false, endpoint: "/api/group/getmg-v2", loi: String(e.message).slice(0, 120) };
  }
}
