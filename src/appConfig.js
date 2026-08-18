// appConfig.js — Cau hinh thay doi luc chay (khong can sua .env, khong can khoi dong lai).
// Luu tai data/appconfig.json (thu muc data/ khong bao gio len git).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CFG_PATH = path.join(__dirname, "..", "data", "appconfig.json");

const VALID_PROVIDERS = ["claude-code", "codex", "openai"];

function readCfg() {
  try {
    return JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
  } catch {
    return {};
  }
}

// Nha cung cap AI hien tai: uu tien lua chon nguoi dung, roi den .env, mac dinh claude-code.
export function getProvider() {
  const cfg = readCfg();
  if (VALID_PROVIDERS.includes(cfg.llmProvider)) return cfg.llmProvider;
  const env = (process.env.LLM_PROVIDER || "").trim();
  return VALID_PROVIDERS.includes(env) ? env : "claude-code";
}

export function setProvider(provider) {
  if (!VALID_PROVIDERS.includes(provider)) throw new Error("Nhà cung cấp AI không hợp lệ: " + provider);
  fs.mkdirSync(path.dirname(CFG_PATH), { recursive: true });
  const cfg = readCfg();
  cfg.llmProvider = provider;
  fs.writeFileSync(CFG_PATH, JSON.stringify(cfg, null, 2));
  return provider;
}
