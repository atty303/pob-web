import { Log, LogLevel } from "missionlog";

export { tag } from "missionlog";

const logger = {
  [LogLevel.ERROR]: (tag, msg, params) =>
    console.error(`%c${tag}%c`, "background:red;border-radius:5px;padding:0 4px;", "", msg, ...params),
  [LogLevel.WARN]: (tag, msg, params) =>
    console.warn(`%c${tag}%c`, "color:black;background:yellow;border-radius:5px;padding:0 4px;", "", msg, ...params),
  [LogLevel.INFO]: (tag, msg, params) =>
    console.info(`%c${tag}%c`, "background:green;border-radius:5px;padding:0 4px;", "", msg, ...params),
  [LogLevel.DEBUG]: (tag, msg, params) =>
    console.debug(`%c${tag}%c`, "color:black;background:grey;border-radius:5px;padding:0 4px;", "", msg, ...params),
  [LogLevel.TRACE]: (tag, msg, params) =>
    console.trace(`%c${tag}%c`, "color:black;background:cyan;border-radius:5px;padding:0 4px;", "", msg, ...params),
} as Record<LogLevel, (tag: string, msg: unknown, params: unknown[]) => void>;

export const log = new Log().init(
  {
    pob: "DEBUG",
    vfs: "DEBUG",
  },
  (level, tag, msg, params) => {
    logger[level as keyof typeof logger](tag, msg, params);
  },
);
