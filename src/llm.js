// llm.js — Bo nao AI, ho tro 2 nguon:
//   1) "claude-code" (mac dinh): dang nhap truc tiep tai khoan Claude (goi subscription)
//      qua Claude Code CLI chinh thuc — khong can API key, khong qua proxy trung gian.
//   2) "openai": endpoint HTTP tuong thich OpenAI (LLM_BASE_URL + LLM_API_KEY trong .env).
// Chon nguon bang LLM_PROVIDER trong .env.
import "dotenv/config";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const PROVIDER = (process.env.LLM_PROVIDER || "claude-code").trim();
const BASE_URL = process.env.LLM_BASE_URL;
const API_KEY = process.env.LLM_API_KEY;
const MODEL = process.env.LLM_MODEL;
const CLAUDE_CMD = process.env.CLAUDE_CMD || "claude";

const SYSTEM_PROMPT = `Bạn là thư ký AI riêng của anh Kiên (tên hiển thị trên Zalo: "Pgl Mr Kiên Ttđc"), lãnh đạo Trung tâm Điều hành Công ty Phúc Gia.
Nhiệm vụ DUY NHẤT: đọc log tin nhắn các nhóm Zalo và tin nhắn cá nhân trong khoảng thời gian, rồi bóc tách CHO ANH KIÊN theo đúng góc nhìn của anh.
Tuyệt đối không bịa thêm thông tin không có trong log, không bình luận lan man.

Phân loại thành đúng 4 mục sau, theo thứ tự ưu tiên. Nếu mục nào không có, ghi "Không có".
1. CẦN ANH PHÊ DUYỆT / QUYẾT ĐỊNH: việc đang chờ anh Kiên duyệt, cho ý kiến, ký, hoặc chốt phương án.
2. LIÊN QUAN TRỰC TIẾP ĐẾN ANH: anh Kiên được nhắc tên (@Pgl Mr Kiên...), được giao việc, hoặc được hỏi trực tiếp.
3. ĐIỂM NGHẼN: việc đang tắc, sự cố kỹ thuật, khiếu nại khách hàng — kể cả không trực tiếp liên quan anh.
4. CHỈ CẦN BIẾT: thông báo, cập nhật chung, thông tin tham khảo.

Với mỗi ý: ghi ngắn gọn, kèm (tên nhóm hoặc người nhắn) và người liên quan, có hạn chót thì ghi rõ.
Trả về DUY NHẤT một đoạn HTML gồm 4 mục (dùng <h3> cho tiêu đề mục và <ul><li> cho nội dung). Không kèm giải thích ngoài HTML.`;

// ===== Nguon 1: Claude Code CLI (subscription, OAuth) =====
function runClaude(prompt, { timeoutMs = 300_000, extraArgs = [] } = {}) {
  return new Promise((resolve, reject) => {
    const args = ["-p", "--output-format", "text", ...extraArgs];
    if (process.env.CLAUDE_MODEL) args.push("--model", process.env.CLAUDE_MODEL);

    const child = spawn(CLAUDE_CMD, args, { shell: true, windowsHide: true });
    let out = "", err = "";
    const killTree = () => {
      // Windows: child.kill() chi giet shell boc ngoai, tien trinh claude van treo -> phai diet ca cay
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
      } else {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      killTree();
      reject(new Error("Claude xử lý quá lâu (quá " + Math.round(timeoutMs / 1000) + " giây). Thử khoảng thời gian ngắn hơn."));
    }, timeoutMs);

    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error("Không chạy được Claude trên máy này (" + e.message + "). Cài bằng: npm install -g @anthropic-ai/claude-code"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 && out.trim()) return resolve(out.trim());
      const low = (err + out).toLowerCase();
      if (/login|logged out|credential|unauthorized|api key/.test(low)) {
        return reject(new Error("Máy này chưa đăng nhập Claude. Mở cửa sổ lệnh, gõ: claude  → làm theo hướng dẫn đăng nhập tài khoản, rồi khởi động lại phần mềm."));
      }
      reject(new Error("Claude báo lỗi: " + (err || out || "không rõ").slice(0, 300)));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// Lam sach ket qua: bo rao ```html neu model boc trong code fence
function stripFence(s) {
  return s.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/, "").trim();
}

// ===== Nguon 2: endpoint HTTP tuong thich OpenAI =====
async function chatOpenAI(messages, { maxTokens, timeoutMs = 300_000 } = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, stream: false, temperature: 0.2, ...(maxTokens ? { max_tokens: maxTokens } : {}), messages }),
  });
  if (!res.ok) throw friendlyLlmError(res.status, await res.text().catch(() => ""));
  const data = await res.json();
  const out = data?.choices?.[0]?.message?.content;
  if (!out) throw new Error("Hệ thống AI không trả về nội dung. Thử lại sau ít phút.");
  return out;
}

function friendlyLlmError(status, body) {
  const isHtml = /<!DOCTYPE|<html/i.test(body || "");
  if (status === 530 || (isHtml && /cloudflare|origin dns/i.test(body))) {
    return new Error("Điểm xử lý AI không phản hồi (mã 530 — đường hầm proxy đã ngừng hoạt động). Chuyển LLM_PROVIDER=claude-code trong .env để dùng tài khoản Claude, hoặc cập nhật LLM_BASE_URL mới.");
  }
  if (status === 401 || status === 403) return new Error("Khóa API bị từ chối (mã " + status + "). Kiểm tra LLM_API_KEY trong file .env.");
  if (status === 429) return new Error("Hệ thống AI đang quá tải (mã 429). Đợi 1-2 phút rồi bấm lại.");
  const snippet = isHtml ? "" : ": " + String(body).slice(0, 150);
  return new Error("Hệ thống AI báo lỗi (mã " + status + ")" + snippet);
}

// ===== API chung cho toan he thong =====

// messages: mang { ts, groupName, sender, text }
export async function summarize(messages) {
  if (!messages.length) return "<p>Khong co tin nhan moi trong khoang thoi gian nay.</p>";

  const byGroup = {};
  for (const m of messages) (byGroup[m.groupName] ||= []).push(m);
  let logText = "";
  for (const [group, msgs] of Object.entries(byGroup)) {
    logText += `\n### Nhom: ${group}\n`;
    for (const m of msgs) {
      const t = new Date(m.ts);
      const hh = String(t.getHours()).padStart(2, "0");
      const mm = String(t.getMinutes()).padStart(2, "0");
      logText += `[${hh}:${mm}] ${m.sender}: ${m.text}\n`;
    }
  }

  if (PROVIDER === "claude-code") {
    const out = await runClaude(`${SYSTEM_PROMPT}\n\n=== LOG TIN NHAN ===\n${logText}`);
    return stripFence(out);
  }
  return chatOpenAI([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Log tin nhan:\n${logText}` },
  ]);
}

// Mo ta ngan gon noi dung 1 anh (buffer base64) bang tieng Viet.
export async function describeImage(base64, mime) {
  const ask = "Mô tả ngắn gọn (1-3 câu) nội dung ảnh bằng tiếng Việt, tập trung thông tin công việc: chữ trong ảnh, số liệu, tên chứng từ, nội dung chính. Nếu là ảnh chụp văn bản, trích ý chính.";

  if (PROVIDER === "claude-code") {
    // Ghi anh ra file tam roi nho Claude doc bang tool Read
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
    const tmp = path.join(os.tmpdir(), `zbrief-img-${Date.now()}.${ext}`);
    fs.writeFileSync(tmp, Buffer.from(base64, "base64"));
    try {
      const out = await runClaude(`Đọc ảnh tại đường dẫn "${tmp}" rồi trả lời: ${ask}\nChỉ trả lời phần mô tả, không kèm gì khác.`, {
        timeoutMs: 120_000,
        extraArgs: ["--allowedTools", "Read"],
      });
      return stripFence(out);
    } finally {
      fs.unlink(tmp, () => {});
    }
  }

  return (
    await chatOpenAI(
      [{ role: "user", content: [{ type: "text", text: ask }, { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }] }],
      { maxTokens: 300, timeoutMs: 90_000 }
    )
  ).trim();
}
