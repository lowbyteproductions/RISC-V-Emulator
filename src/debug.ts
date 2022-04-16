type LogFn = (message: string) => void;
type LogLevel = 'none' | 'info' | 'debug' | 'error';
type Logger = Record<LogLevel, LogFn>;

export type DebugObj = {
  level: LogLevel;
  pc: number;
}
export const debugObj: DebugObj = {
  level: "debug",
  pc: 0,
};

export const setLogLevel = (level: LogLevel) => {
  debugObj.level = level;
};

export const log: Logger = {
  none: (_) => {},
  info: (message) => { debugObj.level === 'info' ? console.log(message) : void 0 },
  debug: (message) => { debugObj.level === 'info' || debugObj.level === 'debug' ? console.debug(message) : void 0 },
  error: (message) => { debugObj.level !== 'none' ? console.error(message) : void 0 },
};
