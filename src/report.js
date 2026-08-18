// report.js — CLI: bao cao theo khoang thoi gian bang cau lenh tieng Viet.
// Vi du: node src/report.js "bao cao tu 00:00 ngay 17/08/2026 den 11:30 ngay 17/08/2026"
import { runRangeReport } from "./reportCore.js";

// Boc 2 moc thoi gian: "HH:mm ... DD/MM/YYYY" x2 (moc dau = tu, moc sau = den)
function parseRange(text) {
  const times = [...text.matchAll(/(\d{1,2}):(\d{2})/g)];
  const dates = [...text.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
  if (times.length < 2 || dates.length < 2) return null;

  const mk = (t, d) =>
    new Date(Number(d[3]), Number(d[2]) - 1, Number(d[1]), Number(t[1]), Number(t[2]), 0, 0);
  const from = mk(times[0], dates[0]);
  const to = mk(times[1], dates[1]);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return null;
  return { from, to };
}

async function main() {
  const prompt = process.argv.slice(2).join(" ").trim();
  const range = parseRange(prompt);
  if (!range) {
    console.log("Khong hieu khoang thoi gian. Vi du dung:");
    console.log('  node src/report.js "bao cao tu 00:00 ngay 17/08/2026 den 11:30 ngay 17/08/2026"');
    process.exit(1);
  }

  console.log(`Khoang: ${range.from.toLocaleString("vi-VN")} -> ${range.to.toLocaleString("vi-VN")}`);
  const r = await runRangeReport(range.from, range.to, { email: true });
  if (!r.ok) {
    console.log(r.note);
    return;
  }
  if (r.enriched) console.log(`Da doc noi dung ${r.enriched} dinh kem.`);
  console.log(`Da tom tat ${r.count} tin nhan.`);
  console.log("Da luu bao cao:", r.file);
  console.log(r.mailed ? "Da gui email." : "(Chua cau hinh SMTP -> chua gui email.)");
}

main().catch((err) => {
  console.error("Loi bao cao:", err);
  process.exit(1);
});
