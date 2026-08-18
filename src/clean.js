// clean.js — Loc rac truoc khi luu: bo sticker/anh, tin 1 chu, chao hoi, icon.
// Muc tieu: giam nhieu + tiet kiem token khi tom tat.

const JUNK_EXACT = new Set([
  "ok", "oke", "okie", "okey", "okla", "k", "kk",
  "da", "dạ", "vang", "vâng", "uh", "uhm", "um", "ukm",
  "the a", "thế à", "vay a", "vậy à", "haha", "hihi", "hehe",
  "roi", "rồi", "duoc", "được", "yes", "no", "thanks", "tks", "ty",
  "cam on", "cảm ơn", "oki", "nhe", "nhé", "a", "ạ", "hi", "hello",
]);

// Chi con chu cai/so? (loai emoji-only, dau cham)
function hasMeaningfulText(s) {
  return /[a-zA-ZÀ-ỹ一-鿿0-9]/.test(s);
}

function normalize(s) {
  return s.toLowerCase().replace(/[.!?,~)(*_]+/g, "").trim();
}

// Tra ve chuoi text da lam sach, hoac null neu la rac / khong phai text.
export function cleanContent(content) {
  // zca-js: content la string voi tin text; object voi anh/file/sticker => bo qua
  if (typeof content !== "string") return null;

  const text = content.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (!hasMeaningfulText(text)) return null; // chi emoji / ky tu

  const norm = normalize(text);
  if (!norm) return null;
  if (JUNK_EXACT.has(norm)) return null;

  // Tin qua ngan (1 tu, <= 3 ky tu) va khong chua so => nhieu kha nang la rac
  if (norm.length <= 3 && !/\d/.test(norm)) return null;

  return text;
}

// Mo ta tin nhan dinh kem (content la object): anh/file/video/thoai/link.
// Tra ve { kind, href, title, marker } hoac null (bo qua sticker/su kien he thong).
export function describeAttachment(content, msgType) {
  const t = String(msgType || "").toLowerCase();
  const title = (content && (content.title || content.description || "")).toString().trim();
  const href = (content && content.href) || "";

  if (t.includes("sticker") || t.includes("doodle") || t.includes("typing")) return null;

  if (t.includes("photo") || t.includes("image")) {
    return { kind: "image", href, title, marker: `[Ảnh]${title ? " " + title : ""}` };
  }
  if (t.includes("voice")) {
    return { kind: "voice", href, title, marker: "[Tin nhắn thoại]" };
  }
  if (t.includes("video")) {
    return { kind: "video", href, title, marker: "[Video]" };
  }
  if (t.includes("file") || t.includes("attach")) {
    return { kind: "file", href, title, marker: `[Tệp: ${title || "không rõ tên"}]` };
  }
  // Loai khac co link (chia se link, danh thiep...)
  if (href) {
    return { kind: "other", href, title, marker: `[Đính kèm]${title ? " " + title : ""}` };
  }
  return null;
}
