// login.js — Dang nhap Zalo MOT LAN bang QR, luu session de tai su dung.
// Chay: npm run login  (quet QR bang Zalo tren dien thoai)
import { Zalo } from "zca-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_PATH = path.join(__dirname, "..", "data", "session.json");

async function main() {
  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });

  const zalo = new Zalo({ selfListen: false });
  console.log("Dang mo QR... Mo Zalo tren dien thoai > Quet ma QR.");

  const api = await zalo.loginQR();

  const cookie = api.getCookie();
  const ctx = api.getContext();

  fs.writeFileSync(
    SESSION_PATH,
    JSON.stringify(
      {
        cookie: cookie.toJSON(),
        imei: ctx.imei,
        userAgent: ctx.userAgent,
      },
      null,
      2
    )
  );

  console.log("Da luu session vao", SESSION_PATH);
  console.log("Gio co the chay: npm start");
  process.exit(0);
}

main().catch((err) => {
  console.error("Loi dang nhap:", err);
  process.exit(1);
});
