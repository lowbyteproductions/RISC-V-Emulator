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

import {BreakpointDebug, debugObj, DebugOutput} from './debug';

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

  debug = new BreakpointDebug(pc => this.onBreakpoint(pc));

  trap = new Trap({
    csr: this.csr,
    beginTrap: () => Boolean(
        this.MEM.getMemoryAccessValuesOut().trap
      | this.DE.getDecodedValuesOut().trap
    ),
    beginTrapReturn: () => Boolean(this.DE.getDecodedValuesOut().returnFromTrap)
  });

  IF = new InstructionFetch({
    shouldStall: () => (this.pipelineState.value !== PipelineState.InstructionFetch) || Boolean(this.trapStall),
    getBranchAddress: () => this.EX.getExecutionValuesOut().branchAddress,
    getBranchAddressValid: () => Boolean(this.EX.getExecutionValuesOut().branchValid),
    bus: this.bus,
    resetSignal: () => this.trap.flush.value
  });

  DE: Decode = new Decode({
    shouldStall: () => (this.pipelineState.value !== PipelineState.Decode) || Boolean(this.trapStall),
    getInstructionValuesIn: () => this.IF.getInstructionValuesOut(),
    regFile: this.regFile,
    resetSignal: () => this.trap.flush.value
  });

  EX: Execute = new Execute({
    shouldStall: () => (this.pipelineState.value !== PipelineState.Execute) || Boolean(this.trapStall),
    getDecodedValuesIn: () => this.DE.getDecodedValuesOut(),
    resetSignal: () => this.trap.flush.value
  });

  MEM = new MemoryAccess({
    shouldStall: () => (this.pipelineState.value !== PipelineState.MemoryAccess) || Boolean(this.trapStall),
    getExecutionValuesIn: () => this.EX.getExecutionValuesOut(),
    bus: this.bus,
    csr: this.csr,
    resetSignal: () => this.trap.flush.value
  });

  WB = new WriteBack({
    shouldStall: () => (this.pipelineState.value !== PipelineState.WriteBack) || Boolean(this.trapStall),
    regFile: this.regFile,
    getMemoryAccessValuesIn: () => this.MEM.getMemoryAccessValuesOut(),
    resetSignal: () => this.trap.flush.value
  });

  onBreakpoint(pc: number) {
    debugger;
  }

  compute() {
    const memValues = this.MEM.getMemoryAccessValuesOut();
    const decodeValues = this.DE.getDecodedValuesOut();
    this.mret = this.DE.getDecodedValuesOut().returnFromTrap;
    this.trapStall = boolToInt(this.cpuState.value === CPUState.Trap) | memValues.trap | decodeValues.trap | this.mret;

    if (this.trapStall && this.cpuState.value === CPUState.Pipeline) {
      this.cpuState.value = CPUState.Trap;

      const trapValues = (memValues.trap)
        ? memValues
      : (decodeValues.trap)
        ? decodeValues
      : null;

      if (trapValues) {
        this.trap.mcause.value = trapValues.mcause;
        this.trap.mepc.value = trapValues.mepc;
        this.trap.mtval.value = trapValues.mtval;
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

  onInstructionFetch() {
    const pc = this.IF.pc.nextValue; // Look at the next value, since the current isn't latched yet
    debugObj.pc = pc;
    this.debug.onInstructionFetch(pc);
  }

  cycle() {
    this.compute();
    this.latchNext();
  }
}

const main = async () => {
  const rv = new RV32ISystem();

  const binPath = path.join(__dirname, '..', 'system-code', 'build', 'main.bin');
  const elfPath = path.join(__dirname, '..', 'system-code', 'build', 'main.elf');

  const file = await fs.readFile(binPath);
  const debugInfo = await getELFDebugInfo(elfPath);
  const program = new Uint32Array(file.buffer);

  debugObj.level = 'error';
  rv.debug.loadDebugInfo(debugInfo, elfPath);
  rv.rom.load(program);

  debugger;
  rv.debug.addBreakpointByName('_start');
  // rv.debug.setStepMode(true);

  while (true) {
    rv.cycle();
  }
}

main();
