import fs from "fs";
import path from "path";

const DATA_FILE = path.resolve("data", "stats.json");

export interface WorkerStats {
  username: string;
  totalTon: number;
  payouts: number;
}

interface Data {
  workers: Record<string, WorkerStats>;
}

function load(): Data {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    if (!fs.existsSync(DATA_FILE)) return { workers: {} };
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as Data;
  } catch {
    return { workers: {} };
  }
}

function save(data: Data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function recordPayout(username: string, ton: number) {
  const data = load();
  const key = username.replace("@", "").toLowerCase();
  const existing = data.workers[key];
  data.workers[key] = {
    username: username.startsWith("@") ? username : `@${username}`,
    totalTon: (existing?.totalTon ?? 0) + ton,
    payouts: (existing?.payouts ?? 0) + 1,
  };
  save(data);
}

export function getTopWorkers(limit = 100): WorkerStats[] {
  const data = load();
  return Object.values(data.workers)
    .filter((w) => w.totalTon > 0)
    .sort((a, b) => b.totalTon - a.totalTon)
    .slice(0, limit);
}
