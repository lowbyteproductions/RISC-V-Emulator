import { WriteBack } from './pipeline/write-back';
import { MemoryAccess } from './pipeline/memory-access';
import { InstructionFetch } from './pipeline/fetch';
import { boolToInt, toHexString } from './util';
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
import { RegisterBank } from './reigster-bank';

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
  regs = new RegisterBank();
  trapStall = 0; // This is acting as a combinational signal, not a reg
  mret = 0; // This is acting as a combinational signal, not a reg

  pipelineState = this.regs.addRegister('pipelineState', PipelineState.InstructionFetch);
  cpuState = this.regs.addRegister('cpuState', CPUState.Pipeline);

  rom = new ROMDevice();
  ram = new RAMDevice();
  regFile = Array.from({ length: 32 }, () => new Register32());

  bus = new SystemInterface(this.rom, this.ram);
  csr = new CSRInterface();
  trap = new Trap({
    csr: this.csr,
    beginTrap: () => Boolean(this.MEM.getMemoryAccessValuesOut().trap),
    beginTrapReturn: () => Boolean(this.DE.getDecodedValuesOut().returnFromTrap)
  });

  private breakpoints = new Set<number>();
  private debugInfo: ELFDebugInfo;
  private stepMode = false;

  IF = new InstructionFetch({
    shouldStall: () => (this.pipelineState.value !== PipelineState.InstructionFetch) || Boolean(this.trapStall),
    getBranchAddress: () => this.EX.getExecutionValuesOut().branchAddress,
    getBranchAddressValid: () => Boolean(this.EX.getExecutionValuesOut().branchValid),
    bus: this.bus,
  });

  DE: Decode = new Decode({
    shouldStall: () => (this.pipelineState.value !== PipelineState.Decode) || Boolean(this.trapStall),
    getInstructionValuesIn: () => this.IF.getInstructionValuesOut(),
    regFile: this.regFile
  });

  EX: Execute = new Execute({
    shouldStall: () => (this.pipelineState.value !== PipelineState.Execute) || Boolean(this.trapStall),
    getDecodedValuesIn: () => this.DE.getDecodedValuesOut()
  });

  MEM = new MemoryAccess({
    shouldStall: () => (this.pipelineState.value !== PipelineState.MemoryAccess) || Boolean(this.trapStall),
    getExecutionValuesIn: () => this.EX.getExecutionValuesOut(),
    bus: this.bus,
    csr: this.csr,
  });

  WB = new WriteBack({
    shouldStall: () => (this.pipelineState.value !== PipelineState.WriteBack) || Boolean(this.trapStall),
    regFile: this.regFile,
    getMemoryAccessValuesIn: () => this.MEM.getMemoryAccessValuesOut()
  })

  compute() {
    const memValues = this.MEM.getMemoryAccessValuesOut();
    this.mret = this.DE.getDecodedValuesOut().returnFromTrap;
    this.trapStall = boolToInt(this.cpuState.value === CPUState.Trap) | memValues.trap | this.mret;

    if (this.trapStall && this.cpuState.value === CPUState.Pipeline) {
      this.cpuState.value = CPUState.Trap;

      // TODO: Some sort of better multiplexer selector abstraction?
      if (memValues.trap) {
        this.trap.mcause.value = memValues.mcause;
        this.trap.mepc.value = memValues.mepc;
        this.trap.mtval.value = memValues.mtval;
      }

    } else if ((this.cpuState.value === CPUState.Trap) && this.trap.returnToPipelineMode.value) {
      this.cpuState.value = CPUState.Pipeline;
      this.pipelineState.value = PipelineState.InstructionFetch;

      if (this.trap.setPc.value) {
        this.IF.pc.value = this.trap.pcToSet.value;
        this.IF.pcPlus4.value = this.trap.pcToSet.value;
      }
    }

    if ((this.cpuState.value === CPUState.Pipeline) && this.mret) {
      this.cpuState.value = CPUState.Trap;
      this.pipelineState.value = PipelineState.InstructionFetch;
    }


    this.IF.compute();
    this.DE.compute();
    this.EX.compute();
    this.MEM.compute();
    this.WB.compute();
    this.csr.compute();
    this.trap.compute();

    if (this.cpuState.value === CPUState.Pipeline) {
      if (this.pipelineState.value === PipelineState.InstructionFetch) {
        this.onInstructionFetch();
      }

      switch (this.pipelineState.value) {
        case PipelineState.InstructionFetch: { this.pipelineState.value = PipelineState.Decode; break; }
        case PipelineState.Decode: { this.pipelineState.value = PipelineState.Execute; break; }
        case PipelineState.Execute: { this.pipelineState.value = PipelineState.MemoryAccess; break; }
        case PipelineState.MemoryAccess: { this.pipelineState.value = PipelineState.WriteBack; break; }
        case PipelineState.WriteBack: {
          this.pipelineState.value = PipelineState.InstructionFetch;
          this.csr.instret.value += 1n;
          break;
        }
      }
    }
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
    this.regs.latchNext();
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
    const pc = this.IF.pc.nextValue; // Look at the next value, since the current isn't latched yet
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
    this.compute();
    this.latchNext();
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
  rv.setStepMode(true);

  while (true) {
    rv.cycle();
  }
}

main();
