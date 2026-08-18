// accountScan.js — Ra soat tai khoan Zalo: ho so, so nhom, tin chua doc, tin moi ghi nhan.
// Chay ngay sau khi ket noi va lap lai theo chu ky (mac dinh 5 phut).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dateKey } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MSG_DIR = path.join(__dirname, "..", "data", "messages");

// Dem tin da thu hom nay va tin moi ke tu moc sinceTs
function countCaptured(sinceTs) {
  const f = path.join(MSG_DIR, `${dateKey()}.jsonl`);
  if (!fs.existsSync(f)) return { today: 0, newSince: 0 };
  const lines = fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
  let newSince = 0;
  if (sinceTs) {
    for (const line of lines) {
      try {
        if (JSON.parse(line).ts > sinceTs) newSince++;
      } catch {
        /* bo qua dong hong */
      }
    }
  }
  return { today: lines.length, newSince };
}

// Quet 1 lan. Tra ve object ket qua; loi tung phan thi ghi nhan phan do la null, khong sap ca cum.
export async function scanAccount(api, prevScanTs) {
  const result = {
    scannedAt: Date.now(),
    profile: null,
    groupCount: null,
    unreadMarkGroups: null,
    unreadMarkUsers: null,
    capturedToday: 0,
    newSinceLastScan: 0,
    errors: [],
  };

  // Ho so tai khoan (ten, sdt, avatar)
  try {
    const info = await api.fetchAccountInfo();
    const p = info?.profile || {};
    result.profile = {
      name: p.displayName || p.zaloName || "",
      zaloName: p.zaloName || "",
      phone: p.phoneNumber || "",
      avatar: p.avatar || "",
    };
  } catch (e) {
    result.errors.push("ho so: " + e.message);
  }

  // So nhom dang tham gia (that, tu server Zalo)
  try {
    const g = await api.getAllGroups();
    result.groupCount = Object.keys(g?.gridVerMap || {}).length;
  } catch (e) {
    result.errors.push("nhom: " + e.message);
  }

  // Hoi thoai duoc danh dau chua doc (unread mark)
  try {
    const u = await api.getUnreadMark();
    result.unreadMarkGroups = (u?.data?.convsGroup || []).length;
    result.unreadMarkUsers = (u?.data?.convsUser || []).length;
  } catch (e) {
    result.errors.push("chua doc: " + e.message);
  }

  const cap = countCaptured(prevScanTs);
  result.capturedToday = cap.today;
  result.newSinceLastScan = cap.newSince;

  return result;
}
