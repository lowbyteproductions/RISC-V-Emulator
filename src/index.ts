import { WriteBack } from './pipeline/write-back';
import { MemoryAccess, MemoryAccessWidth } from './pipeline/memory-access';
import { InstructionFetch } from './pipeline/instruction-fetch';
import { toHexString } from './util';
import { SystemInterface } from './system-interface';
import { RAMDevice } from './system-interface/ram';
import { ROMDevice } from './system-interface/rom';
import { Decode } from './pipeline/decode';
import { Register32 } from './register32';
import { Execute } from './pipeline/execute';

import * as fs from 'fs/promises';
import * as path from 'path';

enum State {
  InstructionFetch,
  Decode,
  Execute,
  MemoryAccess,
  WriteBack
}

class RV32ISystem {
  state = State.InstructionFetch;

  rom = new ROMDevice();
  ram = new RAMDevice();
  regFile = Array.from({ length: 32 }, () => new Register32());

  bus = new SystemInterface(this.rom, this.ram);

  private breakpoints = new Set<number>();

  IF = new InstructionFetch({
    shouldStall: () => this.state !== State.InstructionFetch,
    getBranchAddress: () => this.EX.getExecutionValuesOut().branchAddress,
    getBranchAddressValid: () => Boolean(this.EX.getExecutionValuesOut().branchValid),
    bus: this.bus,
  });

  DE: Decode = new Decode({
    shouldStall: () => this.state !== State.Decode,
    getInstructionValuesIn: () => this.IF.getInstructionValuesOut(),
    regFile: this.regFile
  });

  EX: Execute = new Execute({
    shouldStall: () => this.state !== State.Execute,
    getDecodedValuesIn: () => this.DE.getDecodedValuesOut()
  });

  MEM = new MemoryAccess({
    shouldStall: () => this.state !== State.MemoryAccess,
    getExecutionValuesIn: () => this.EX.getExecutionValuesOut(),
    bus: this.bus
  });

  WB = new WriteBack({
    shouldStall: () => this.state !== State.WriteBack,
    regFile: this.regFile,
    getMemoryAccessValuesIn: () => this.MEM.getMemoryAccessValuesOut()
  })

  compute() {
    this.IF.compute();
    this.DE.compute();
    this.EX.compute();
    this.MEM.compute();
    this.WB.compute();
  }

  latchNext() {
    this.IF.latchNext();
    this.DE.latchNext();
    this.EX.latchNext();
    this.MEM.latchNext();
    this.WB.latchNext();
    this.regFile.forEach(r => r.latchNext());
  }

  addBreakpoint(address: number) {
    this.breakpoints.add(address);
  }

  removeBreakpoint(address: number) {
    this.breakpoints.delete(address);
  }

  cycle() {
    this.compute();
    this.latchNext();

    if (this.state === State.InstructionFetch) {
      const pc = this.IF.getInstructionValuesOut().pc;
      if (this.breakpoints.has(pc)) {
        debugger;
      }
    }

    switch (this.state) {
      case State.InstructionFetch: { this.state = State.Decode; break; }
      case State.Decode: { this.state = State.Execute; break; }
      case State.Execute: { this.state = State.MemoryAccess; break; }
      case State.MemoryAccess: { this.state = State.WriteBack; break; }
      case State.WriteBack: { this.state = State.InstructionFetch; break; }
    }
  }
}

const main = async () => {
  const rv = new RV32ISystem();

  const file = await fs.readFile(path.join(__dirname, '..', 'system-code', 'main.bin'));
  const program = new Uint32Array(file.buffer);

  rv.rom.load(program);

  rv.addBreakpoint(0x100000e4);

  while (true) {
    rv.cycle();
  }
}

main();
