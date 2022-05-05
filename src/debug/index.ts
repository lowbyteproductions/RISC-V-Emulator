import { toHexString } from "../util";
import { addr2lineSync, ELFDebugInfo } from "./elf";

type LogFn = (message: string) => void;
type LogLevel = 'none' | 'info' | 'debug' | 'error';
type Logger = Record<LogLevel, LogFn>;

export enum DebugOutput {
  NoDisplay,
  Disassembly,
  SourceLineByLine
};

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

export type BreakpointFn = (pc: number) => void;

export class BreakpointDebug {
  private breakpoints = new Set<number>();
  private debugInfo: ELFDebugInfo;
  private stepMode = false;
  private elfPath: string;
  private onBreakpoint: BreakpointFn;
  private debugOutput = DebugOutput.Disassembly;

  constructor(onBreakpoint: BreakpointFn) {
    this.onBreakpoint = onBreakpoint;
  }

  setBreakpointMode(bm: DebugOutput) {
    this.debugOutput = bm;
  }

  onInstructionFetch(pc: number) {
    let shouldBreak = false;

    if (this.stepMode || this.breakpoints.has(pc)) {
      this.stepMode = true;
      shouldBreak = true;
      if (this.debugOutput === DebugOutput.NoDisplay) {
        this.debugOutput = DebugOutput.Disassembly;
      }
    }

    switch (this.debugOutput) {
      case DebugOutput.Disassembly: {
        if (this.debugInfo && pc in this.debugInfo.assemblyByAddress) {
          if (pc in this.debugInfo.functionNameByAddress) {
            console.log(`${this.debugInfo.functionNameByAddress[pc]}:`);
          }

          const ins = this.debugInfo.assemblyByAddress[pc];
          console.log(`${toHexString(pc, 8)}: ${ins.assembly}`);
        } else {
          console.log(`${toHexString(pc, 8)}: <info unavailable>`);
        }
        break;
      }

      case DebugOutput.SourceLineByLine: {
        if (this.debugInfo) {
          const codeLine = addr2lineSync(this.elfPath, pc);
          if (codeLine) {
            console.log(codeLine ? codeLine : `${toHexString(pc, 8)}: <info unavailable>`);
          }
        } else {
          console.log(`${toHexString(pc, 8)}: <info unavailable>`);
        }
        break;
      }
    }

    if (shouldBreak) this.onBreakpoint(pc);
  }

  addBreakpoint(address: number) {
    this.breakpoints.add(address);
  }

  addBreakpointByName(name: string, offset = 0) {
    if (!this.debugInfo) {
      throw new Error('No ELF debugging info loaded');
    }
    if (!(name in this.debugInfo.addressByFunctionName)) {
      throw new Error(`Cannot find function '${name}' in ELF debugging info`);
    }

    this.breakpoints.add(this.debugInfo.addressByFunctionName[name] + offset);
  }

  removeBreakpoint(address: number) {
    this.breakpoints.delete(address);
  }

  loadDebugInfo(debugInfo: ELFDebugInfo, elfPath) {
    this.debugInfo = debugInfo;
    this.elfPath = elfPath;
  }

  setStepMode(enabled: boolean) {
    this.stepMode = enabled;
  }
}
