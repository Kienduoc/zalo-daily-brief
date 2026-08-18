// profile.js — Ho so VAI TRO cua tung nguoi dung (theo tai khoan Zalo).
// Moi nguoi doc Zalo voi muc dich khac nhau => chi dan cho AI phai khac nhau.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CFG_PATH = path.join(__dirname, "..", "data", "appconfig.json");

// ===== Ma don vi (suy ra tu duoi ten hien thi Zalo, vd "Pgl Mr Kien Ttdc") =====
export const DON_VI = {
  btgd: "Ban Tổng Giám đốc", bdq: "Ban Đối ngoại & Quan hệ Chính phủ", bcs: "Ban Chính sách",
  bkp: "Ban Kinh doanh & Phát triển thị trường", bht: "Ban Hành chính", btc: "Ban Tài chính",
  btn: "Ban Nhân sự", bqc: "Ban Chất lượng", bmk: "Ban Marketing", bat: "Ban An ninh thông tin",
  bkd: "Ban Kiểm định", bcc: "Ban Công nghệ", btt: "Ban Thanh tra", bpc: "Ban Pháp chế",
  tttn: "Trung tâm Thử nghiệm", tthc: "Trung tâm Hiệu chuẩn", ttcn: "Trung tâm Chứng nhận",
  ttnp: "Trung tâm R&D", ttkt: "Trung tâm Kỹ thuật", ttlg: "Trung tâm Logistics",
  ttdt: "Trung tâm Đào tạo", ttdc: "Trung tâm Điều hành", hcns: "Hành chính Nhân sự",
};

// Goi y vai tro theo ma don vi
const GOI_Y_VAI_TRO = {
  btgd: "lanh-dao", ttdc: "lanh-dao", bkp: "kinh-doanh", bmk: "kinh-doanh",
  tttn: "ky-thuat", tthc: "ky-thuat", ttkt: "ky-thuat", ttnp: "ky-thuat", ttlg: "ky-thuat",
  bht: "hanh-chinh", btn: "hanh-chinh", hcns: "hanh-chinh", btc: "ke-toan",
  bqc: "chat-luong", bpc: "chat-luong", btt: "chat-luong", ttcn: "chat-luong",
};

// ===== Cac vai tro dung san =====
export const VAI_TRO = {
  "lanh-dao": {
    ten: "Lãnh đạo / Ban giám đốc",
    moTa: "Người ra quyết định cuối cùng, quan tâm việc cần phê duyệt, rủi ro lớn, cam kết với khách hàng và các điểm nghẽn liên đơn vị.",
    uuTien: "Ưu tiên: việc chờ duyệt hoặc ký, rủi ro tài chính - pháp lý, cam kết trễ hạn với khách, mâu thuẫn giữa các đơn vị.",
  },
  "quan-ly": {
    ten: "Trưởng / Phó đơn vị",
    moTa: "Quản lý một đơn vị, quan tâm tiến độ công việc của nhân sự mình, việc được giao cho đơn vị và các vướng mắc cần gỡ.",
    uuTien: "Ưu tiên: việc giao cho người trong đơn vị, deadline sắp tới, nhân sự đang bị tắc, yêu cầu từ đơn vị khác gửi sang.",
  },
  "kinh-doanh": {
    ten: "Kinh doanh / Chăm sóc khách hàng",
    moTa: "Làm việc với khách hàng, quan tâm đơn hàng, báo giá, hợp đồng, khiếu nại và tiến độ trả kết quả cho khách.",
    uuTien: "Ưu tiên: yêu cầu của khách, báo giá và hợp đồng, hạn trả kết quả, khiếu nại, cơ hội bán hàng mới.",
  },
  "ky-thuat": {
    ten: "Kỹ thuật / Thử nghiệm / Vận hành",
    moTa: "Phụ trách chuyên môn kỹ thuật, quan tâm mẫu thử, thiết bị, phương pháp, sự cố kỹ thuật và tiến độ xử lý.",
    uuTien: "Ưu tiên: sự cố thiết bị, mẫu cần xử lý, sai lệch kết quả, yêu cầu kỹ thuật mới, lịch bảo trì và hiệu chuẩn.",
  },
  "hanh-chinh": {
    ten: "Hành chính / Nhân sự / Văn thư",
    moTa: "Phụ trách văn bản, nhân sự, hậu cần nội bộ; quan tâm yêu cầu phát hành, thủ tục, lịch họp, chế độ nhân sự.",
    uuTien: "Ưu tiên: yêu cầu phát hành và đóng dấu, thủ tục hồ sơ, lịch họp và sự kiện, đề nghị về nhân sự, mua sắm nội bộ.",
  },
  "ke-toan": {
    ten: "Kế toán / Tài chính",
    moTa: "Phụ trách tiền, hoá đơn, công nợ; quan tâm thanh toán, xuất hoá đơn, tạm ứng và sai lệch số liệu.",
    uuTien: "Ưu tiên: đề nghị thanh toán và tạm ứng, xuất hoặc điều chỉnh hoá đơn, công nợ quá hạn, sai lệch số liệu.",
  },
  "chat-luong": {
    ten: "Chất lượng / ISO / Pháp chế",
    moTa: "Giám sát tuân thủ quy trình và pháp lý; quan tâm sự không phù hợp, khiếu nại, thay đổi quy định và hồ sơ ISO.",
    uuTien: "Ưu tiên: điểm không phù hợp, khiếu nại, thay đổi quy định và tiêu chuẩn, hồ sơ cần rà soát, rủi ro tuân thủ.",
  },
  "tuy-chinh": {
    ten: "Tự viết (nâng cao)",
    moTa: "",
    uuTien: "",
  },
};

// ===== Doc / ghi cau hinh =====
function readCfg() {
  try {
    return JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeCfg(cfg) {
  fs.mkdirSync(path.dirname(CFG_PATH), { recursive: true });
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2));
}

// Bo dau tieng Viet de so khop ma don vi
function khongDau(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

// Tu suy ra ten + don vi tu ten hien thi Zalo, vd "Pgl Mr Kiên Ttđc"
export function suyRaTuTenZalo(displayName) {
  const kq = { hoTen: "", maDonVi: "", donVi: "", vaiTroGoiY: "" };
  if (!displayName) return kq;

  const tu = String(displayName).trim().split(/\s+/);
  const boQua = new Set(["pgl", "pgc", "pg", "mr", "ms", "mrs", "anh", "chi"]);
  const conLai = tu.filter((t) => !boQua.has(khongDau(t)));

  if (conLai.length >= 2) {
    const ma = khongDau(conLai[conLai.length - 1]);
    if (DON_VI[ma]) {
      kq.maDonVi = ma;
      kq.donVi = DON_VI[ma];
      kq.vaiTroGoiY = GOI_Y_VAI_TRO[ma] || "quan-ly";
      kq.hoTen = conLai.slice(0, -1).join(" ");
      return kq;
    }
  }
  kq.hoTen = conLai.join(" ");
  return kq;
}

// Ho so cua 1 tai khoan. Chua co thi tao ban nhap tu ten Zalo.
export function getProfile(uid, displayName = "") {
  const cfg = readCfg();
  const saved = cfg.profiles?.[uid];
  if (saved) return { ...saved, daLuu: true };

  const goi = suyRaTuTenZalo(displayName);
  return {
    daLuu: false,
    hoTen: goi.hoTen || displayName || "",
    chucDanh: "",
    donVi: goi.donVi || "",
    maDonVi: goi.maDonVi || "",
    vaiTro: goi.vaiTroGoiY || "quan-ly",
    quanTam: [],
    huongDanRieng: "",
  };
}

export function saveProfile(uid, data) {
  if (!uid) throw new Error("Thiếu mã tài khoản.");
  const cfg = readCfg();
  cfg.profiles = cfg.profiles || {};
  cfg.profiles[uid] = {
    hoTen: String(data.hoTen || "").slice(0, 100),
    chucDanh: String(data.chucDanh || "").slice(0, 120),
    donVi: String(data.donVi || "").slice(0, 120),
    maDonVi: String(data.maDonVi || "").slice(0, 20),
    vaiTro: VAI_TRO[data.vaiTro] ? data.vaiTro : "quan-ly",
    quanTam: Array.isArray(data.quanTam) ? data.quanTam.slice(0, 12).map((x) => String(x).slice(0, 60)) : [],
    huongDanRieng: String(data.huongDanRieng || "").slice(0, 2000),
    capNhat: Date.now(),
  };
  writeCfg(cfg);
  return { ...cfg.profiles[uid], daLuu: true };
}

// ===== Dung chi dan cho AI tu ho so =====
export function buildSystemPrompt(profile) {
  const p = profile || {};
  const vt = VAI_TRO[p.vaiTro] || VAI_TRO["quan-ly"];
  const ten = p.hoTen || "người dùng";
  const chuc = [p.chucDanh, p.donVi].filter(Boolean).join(" — ");

  const dong = [];
  dong.push("Bạn là thư ký AI riêng của " + ten + (chuc ? " (" + chuc + ")" : "") + ".");
  dong.push("Nhiệm vụ DUY NHẤT: đọc log tin nhắn Zalo (nhóm và cá nhân) rồi bóc tách thông tin THEO ĐÚNG GÓC NHÌN và trách nhiệm của người này.");
  if (vt.moTa) dong.push("Bối cảnh vai trò: " + vt.moTa);
  if (vt.uuTien) dong.push(vt.uuTien);
  if (p.quanTam && p.quanTam.length) dong.push("Đặc biệt để ý các chủ đề: " + p.quanTam.join(", ") + ".");
  if (p.huongDanRieng && p.huongDanRieng.trim()) dong.push("Yêu cầu riêng của người dùng: " + p.huongDanRieng.trim());
  dong.push("Tuyệt đối không bịa thông tin không có trong log, không bình luận lan man.");
  dong.push("");
  dong.push('Phân loại thành đúng 4 mục sau, theo thứ tự ưu tiên. Mục nào không có thì ghi "Không có".');
  dong.push("1. CẦN TÔI PHÊ DUYỆT / QUYẾT ĐỊNH: việc đang chờ " + ten + " duyệt, cho ý kiến, ký, hoặc chốt phương án.");
  dong.push("2. LIÊN QUAN TRỰC TIẾP ĐẾN TÔI: được nhắc tên, được giao việc, hoặc được hỏi trực tiếp.");
  dong.push("3. ĐIỂM NGHẼN: việc đang tắc, sự cố, khiếu nại — kể cả không trực tiếp liên quan.");
  dong.push("4. CHỈ CẦN BIẾT: thông báo, cập nhật chung, thông tin tham khảo.");
  dong.push("");
  dong.push("Với mỗi ý: ghi ngắn gọn, kèm (tên nhóm hoặc người nhắn) và người liên quan, có hạn chót thì ghi rõ.");
  dong.push("Trả về DUY NHẤT một đoạn HTML gồm 4 mục (dùng <h3> cho tiêu đề mục và <ul><li> cho nội dung). Không kèm giải thích ngoài HTML.");

  return dong.join("\n");
}
