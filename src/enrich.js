// enrich.js — Tai va boc noi dung dinh kem (anh/file) truoc khi tom tat.
// Anh -> vision mo ta. File PDF/Word/Excel/txt -> boc chu. Loi thi giu marker, ghi chu.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CookieJar } from "tough-cookie";
import { describeImage } from "./llm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = path.join(__dirname, "..", "data", "session.json");

const MAX_ENRICH = 15; // gioi han so dinh kem xu ly moi lan (kiem soat chi phi)
const MAX_DOC_CHARS = 2000; // cat bot van ban file dai
const DOC_EXTS = ["pdf", "docx", "xls", "xlsx", "txt", "csv"];

function loadSession() {
  try {
    const s = JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
    let jar = null;
    try {
      jar = CookieJar.fromJSON(s.cookie);
    } catch {
      jar = null;
    }
    return { userAgent: s.userAgent, jar };
  } catch {
    return { userAgent: "Mozilla/5.0", jar: null };
  }
}

async function download(href, session) {
  const headers = { "User-Agent": session.userAgent || "Mozilla/5.0" };
  if (session.jar) {
    try {
      const c = session.jar.getCookieStringSync(href);
      if (c) headers.Cookie = c;
    } catch {
      /* domain khac cookie - bo qua */
    }
  }
  const res = await fetch(href, { headers, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function extOf(title, href) {
  const m = String(title || href || "")
    .toLowerCase()
    .match(/\.([a-z0-9]{2,5})(?:\?|$)/);
  return m ? m[1] : "";
}

function mimeOf(ext) {
  return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
}

async function extractDocText(buf, ext) {
  if (ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    const r = await parser.getText();
    await parser.destroy();
    return r.text || "";
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer: buf });
    return r.value || "";
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    return wb.SheetNames.map((n) => XLSX.utils.sheet_to_csv(wb.Sheets[n])).join("\n");
  }
  if (ext === "txt" || ext === "csv") return buf.toString("utf8");
  return "";
}

// Xu ly 1 dinh kem. Tra ve true neu boc duoc noi dung.
async function enrichOne(m, session) {
  const { kind, href, title } = m.attach;
  try {
    if (kind === "image") {
      const buf = await download(href, session);
      const ext = extOf(title, href) || "jpg";
      const desc = await describeImage(buf.toString("base64"), mimeOf(ext));
      m.text = `[Ảnh] ${desc}`;
      return true;
    }
    if (kind === "file" || kind === "other") {
      const ext = extOf(title, href);
      if (!DOC_EXTS.includes(ext)) return false;
      const buf = await download(href, session);
      let txt = (await extractDocText(buf, ext)).replace(/\s+/g, " ").trim();
      if (txt.length > MAX_DOC_CHARS) txt = txt.slice(0, MAX_DOC_CHARS) + "…";
      m.text = `[Tệp: ${title || "?"}] Nội dung: ${txt || "(không đọc được)"}`;
      return true;
    }
  } catch (err) {
    m.text = `${m.text} (không tải được nội dung: ${err.message})`;
  }
  return false;
}

// Bo sung noi dung vao message.text cho cac tin co attach. Chay SONG SONG (3 cung luc)
// de khong keo dai thoi gian tao bao cao. Sua truc tiep mang messages.
export async function enrichAttachments(messages, onProgress = null) {
  const targets = messages.filter((m) => m.attach && m.attach.href);
  if (!targets.length) return { enriched: 0, capped: 0 };

  const session = loadSession();
  const queue = targets.slice(0, MAX_ENRICH);
  const capped = targets.length - queue.length;
  let enriched = 0;

  const CONCURRENCY = 3;
  let idx = 0;
  let done = 0;
  async function worker() {
    while (idx < queue.length) {
      const m = queue[idx++];
      if (await enrichOne(m, session)) enriched++;
      done++;
      if (onProgress) onProgress({ done, total: queue.length });
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));

  return { enriched, capped, cap: MAX_ENRICH };
}
