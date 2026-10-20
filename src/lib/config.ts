import { promises as fs } from "fs";
import path from "path";
import type { AppConfig, SourceConfig } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

const defaultSource = (): SourceConfig => ({
  enabled: true,
  baseUrl: "",
  apiKey: "",
  username: "",
  password: "",
  companyId: "",
  dbName: "",
  crmDialect: "payamgostar",
  crmTypeKey: "",
  crmQuery: "",
  useMock: true,
  deviceSerial: "",
  integrationId: "",
  rsaPublicKeyXml: "",
  generationVersion: "101",
});

export function defaultConfig(): AppConfig {
  return {
    crm: {
      ...defaultSource(),
      baseUrl: "https://crm.payamgostar.com",
      crmDialect: "payamgostar",
    },
    helo: {
      ...defaultSource(),
      baseUrl: "http://127.0.0.1:8080/TncHoloo/api",
      dbName: "Holoo1",
    },
    sepidar: {
      ...defaultSource(),
      baseUrl: "http://127.0.0.1:7373",
      generationVersion: "101",
    },
  };
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return { ...defaultConfig(), ...JSON.parse(raw) };
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}
