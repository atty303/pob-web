/**
 * @author Ray Martone
 * @copyright Copyright (c) 2019-2022 Ray Martone
 * @license MIT
 * @description log adapter that provides level based filtering and tagging
 */

/**
 * Useful for implementing a log event hadnelr
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  TRACE = "TRACE",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  OFF = "OFF",
}

/**
 * union
 */
export type LogLevelStr = "DEBUG" | "TRACE" | "INFO" | "WARN" | "ERROR" | "OFF";

/**
 * Level where `ERROR > WARN > INFO`.
 */
enum Level {
  DEBUG = 1,
  TRACE = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5,
  OFF = 6,
}

export type LogCallback = (level: LogLevelStr, tag: string, message: unknown, optionalParams: unknown[]) => void;

export const tag: Record<string, string> = {};

export class Log {
  /**
   * init assigns tags a level or they default to INFO
   * _tagToLevel hash that maps tags to their level
   */
  protected readonly _tagToLevel: Record<string, Level> = {};

  /**
   * callback that supports logging whatever way works best for you!
   */
  protected _callback?: LogCallback;

  /**
   * init
   * @param config? JSON that assigns tags levels. If uninitialized,
   *    a tag's level defaults to INFO where ERROR > WARN > INFO.
   * @param callback? supports logging whatever way works best for you
   *  - style terminal output with chalk
   *  - send JSON to a cloud logging service like Splunk
   *  - log strings and objects to the browser console
   *  - combine any of the above based on your app's env
   * @return {this} supports chaining
   */
  init(config?: Record<string, string>, callback?: LogCallback): this {
    for (const k in config) {
      this._tagToLevel[k] = Level[config[k] as LogLevelStr] || 1;
    }

    if (callback !== undefined) {
      this._callback = callback;
    }

    for (const key in this._tagToLevel) {
      tag[key] = key;
    }
    return this;
  }

  /**
   * Writes an error to the log
   * @param tag string categorizes a message
   * @param message object to log
   * @param optionalParams optional list of objects to log
   */
  error<T extends string>(tag: T, message: unknown, ...optionalParams: unknown[]): void {
    this.log(Level.ERROR, tag, message, optionalParams);
  }

  /**
   * Writes a warning to the log
   * @param tag string categorizes a message
   * @param message object to log
   * @param optionalParams optional list of objects to log
   */
  warn<T extends string>(tag: T, message: unknown, ...optionalParams: unknown[]): void {
    this.log(Level.WARN, tag, message, optionalParams);
  }

  /**
   * Writes info to the log
   * @param tag string categorizes a message
   * @param message object to log
   * @param optionalParams optional list of objects to log
   */
  info<T extends string>(tag: T, message: unknown, ...optionalParams: unknown[]): void {
    this.log(Level.INFO, tag, message, optionalParams);
  }

  /**
   * Writes trace to the log
   * @param tag string categorizes a message
   * @param message object to log
   * @param optionalParams optional list of objects to log
   */
  trace<T extends string>(tag: T, message: unknown, ...optionalParams: unknown[]): void {
    this.log(Level.TRACE, tag, message, optionalParams);
  }

  /**
   * Writes debug to the log
   * @param tag string categorizes a message
   * @param message object to log
   * @param optionalParams optional list of objects to log
   */
  debug<T extends string>(tag: T, message: unknown, ...optionalParams: unknown[]): void {
    this.log(Level.DEBUG, tag, message, optionalParams);
  }

  private log<T extends string>(level: Level, tag: T, message: unknown, optionalParams: unknown[]): void {
    if (this._callback && level >= (this._tagToLevel[tag] ?? Level.DEBUG)) {
      this._callback(<LogLevelStr>Level[level], tag, message, optionalParams);
    }
  }
}

/** singleton Log instance */
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
    kvfs: "INFO",
    subscript: "INFO",
    backend: "DEBUG",
  },
  (level, tag, msg, params) => {
    logger[level as keyof typeof logger](tag, msg, params);
  },
);
