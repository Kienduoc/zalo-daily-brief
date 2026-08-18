// make-ico.mjs — Ghep cac PNG thanh 1 file .ico da kich thuoc
import fs from "fs";
import path from "path";

const dir = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const sizes = [16, 24, 32, 48, 64, 128, 256];
const imgs = sizes.map((s) => ({ size: s, data: fs.readFileSync(path.join(dir, `zk-${s}.png`)) }));

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);          // reserved
header.writeUInt16LE(1, 2);          // type = icon
header.writeUInt16LE(imgs.length, 4);

const entries = [];
let offset = 6 + imgs.length * 16;
for (const im of imgs) {
  const e = Buffer.alloc(16);
  e.writeUInt8(im.size >= 256 ? 0 : im.size, 0); // width (0 = 256)
  e.writeUInt8(im.size >= 256 ? 0 : im.size, 1); // height
  e.writeUInt8(0, 2);                 // so mau trong bang mau
  e.writeUInt8(0, 3);                 // reserved
  e.writeUInt16LE(1, 4);              // color planes
  e.writeUInt16LE(32, 6);             // bits per pixel
  e.writeUInt32LE(im.data.length, 8); // kich thuoc du lieu
  e.writeUInt32LE(offset, 12);        // vi tri du lieu
  entries.push(e);
  offset += im.data.length;
}

const ico = Buffer.concat([header, ...entries, ...imgs.map((i) => i.data)]);
fs.writeFileSync(path.join(dir, "zk.ico"), ico);
console.log(`Da tao zk.ico (${imgs.length} kich thuoc, ${ico.length} bytes)`);
