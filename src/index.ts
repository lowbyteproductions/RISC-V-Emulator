import { WriteBack } from './pipeline/write-back';
import { MemoryAccess, MemoryAccessWidth } from './pipeline/memory-access';
import { InstructionFetch } from './pipeline/fetch';
import { toHexString } from './util';
import { SystemInterface } from './system-interface';
import { RAMDevice } from './system-interface/ram';
import { ROMDevice } from './system-interface/rom';
import { Decode } from './pipeline/decode';
import { Register32 } from './register32';
import { Execute } from './pipeline/execute';
import { CSRInterface } from './csr';

import {debugObj} from './debug';

import * as fs from 'fs/promises';
import * as path from 'path';
import { ELFDebugInfo, getELFDebugInfo } from './debug/elf';
import { Trap } from './trap';

enum PipelineState {
  InstructionFetch,
  Decode,
  Execute,
  MemoryAccess,
  WriteBack
}

enum CPUState {
  Pipeline,
  Trap,
}

class RV32ISystem {
  pipelineState = PipelineState.InstructionFetch;
  cpuState = CPUState.Pipeline;

  rom = new ROMDevice();
  ram = new RAMDevice();
  regFile = Array.from({ length: 32 }, () => new Register32());

  bus = new SystemInterface(this.rom, this.ram);
  csr = new CSRInterface();
  trap = new Trap({
    csr: this.csr,
    returnToPipelineMode: () => {
      this.pipelineState = PipelineState.InstructionFetch;
      this.cpuState = CPUState.Pipeline;
    },
    setPc: (pc: number) => {
      // TODO: Fix this!
      this.IF.pc.value = pc;
      this.IF.pcPlus4.value = pc;
    }
  });

  private breakpoints = new Set<number>();
  private debugInfo: ELFDebugInfo;
  private stepMode = false;

  IF = new InstructionFetch({
    shouldStall: () => this.pipelineState !== PipelineState.InstructionFetch,
    getBranchAddress: () => this.EX.getExecutionValuesOut().branchAddress,
    getBranchAddressValid: () => Boolean(this.EX.getExecutionValuesOut().branchValid),
    bus: this.bus,
  });

  DE: Decode = new Decode({
    shouldStall: () => this.pipelineState !== PipelineState.Decode,
    getInstructionValuesIn: () => this.IF.getInstructionValuesOut(),
    regFile: this.regFile,
    trapReturn: () => {
      this.trap.trapReturn();
      this.cpuState = CPUState.Trap;
    }
  });

  EX: Execute = new Execute({
    shouldStall: () => this.pipelineState !== PipelineState.Execute,
    getDecodedValuesIn: () => this.DE.getDecodedValuesOut()
  });

  MEM = new MemoryAccess({
    shouldStall: () => this.pipelineState !== PipelineState.MemoryAccess,
    getExecutionValuesIn: () => this.EX.getExecutionValuesOut(),
    bus: this.bus,
    csr: this.csr,
    trap: (mepc, mcause, mtval) => {
      this.trap.trapException(mepc, mcause, mtval);
      this.cpuState = CPUState.Trap;
    }
  });

  WB = new WriteBack({
    shouldStall: () => this.pipelineState !== PipelineState.WriteBack,
    regFile: this.regFile,
    getMemoryAccessValuesIn: () => this.MEM.getMemoryAccessValuesOut()
  })

  compute() {
    this.IF.compute();
    this.DE.compute();
    this.EX.compute();
    this.MEM.compute();
    this.WB.compute();
    this.csr.compute();
    this.trap.compute();
  }

  latchNext() {
    this.IF.latchNext();
    this.DE.latchNext();
    this.EX.latchNext();
    this.MEM.latchNext();
    this.WB.latchNext();
    this.regFile.forEach(r => r.latchNext());
    this.csr.latchNext();
    this.trap.latchNext();
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

  loadDebugInfo(debugInfo: ELFDebugInfo) {
    this.debugInfo = debugInfo;
  }

  setStepMode(enabled: boolean) {
    this.stepMode = enabled;
  }

  onInstructionFetch() {
    const pc = this.IF.getInstructionValuesOut().pc;
    debugObj.pc = pc;

    let shouldBreak = false;

    if (this.stepMode || this.breakpoints.has(pc)) {
      this.stepMode = true;
      shouldBreak = true;
      debugObj.showDisassembly = true;
    }

    if (debugObj.showDisassembly) {
      if (this.debugInfo && pc in this.debugInfo.assemblyByAddress) {
        if (pc in this.debugInfo.functionNameByAddress) {
          console.log(`${this.debugInfo.functionNameByAddress[pc]}:`);
        }

        const ins = this.debugInfo.assemblyByAddress[pc];
        console.log(`${toHexString(pc, 8)}: ${ins.assembly}`);
      } else {
        console.log(`${toHexString(pc, 8)}: <info unavailable>`);
      }
    }

    if (shouldBreak) {
      debugger;
    }
  }

  cycle() {
    const currentState = this.cpuState;
    this.compute();
    this.latchNext();

    if (currentState === CPUState.Pipeline) {
      if (this.pipelineState === PipelineState.InstructionFetch) {
        this.onInstructionFetch();
      }

      switch (this.pipelineState) {
        case PipelineState.InstructionFetch: { this.pipelineState = PipelineState.Decode; break; }
        case PipelineState.Decode: { this.pipelineState = PipelineState.Execute; break; }
        case PipelineState.Execute: { this.pipelineState = PipelineState.MemoryAccess; break; }
        case PipelineState.MemoryAccess: { this.pipelineState = PipelineState.WriteBack; break; }
        case PipelineState.WriteBack: {
          this.pipelineState = PipelineState.InstructionFetch;
          this.csr.instret.value += 1n;
          break;
        }
      }
    }
  }
}

const main = async () => {
  const rv = new RV32ISystem();

  const file = await fs.readFile(path.join(__dirname, '..', 'system-code', 'build', 'main.bin'));
  const debugInfo = await getELFDebugInfo(path.join(__dirname, '..', 'system-code', 'build', 'main.elf'));
  const program = new Uint32Array(file.buffer);

  debugObj.level = 'error';
  rv.loadDebugInfo(debugInfo);
  rv.rom.load(program);

  rv.addBreakpointByName('_start');

  while (true) {
    rv.cycle();
  }
}

main();
