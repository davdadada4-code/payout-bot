import { Context as TelegrafContext } from "telegraf";
import type { SessionData } from "./sessions.js";

export interface Context extends TelegrafContext {
  session: SessionData;
}
