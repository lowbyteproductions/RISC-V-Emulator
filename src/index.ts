import { WriteBack } from './pipeline/write-back';
import { MemoryAccess } from './pipeline/memory-access';
import { InstructionFetch } from './pipeline/instruction-fetch';
import { toHexString } from './util';
import { SystemInterface } from './system-interface';
import { RAMDevice } from './system-interface/ram';
import { ROMDevice } from './system-interface/rom';
import { Decode } from './pipeline/decode';
import { Register32 } from './register32';
import { Execute } from './pipeline/execute';

enum State {
  InstructionFetch,
  Decode,
  Execute,
  MemoryAccess,
  WriteBack
}

class RVI32System {
  state = State.InstructionFetch;

  rom = new ROMDevice();
  ram = new RAMDevice();
  regFile = Array.from({ length: 32 }, () => new Register32());

  bus = new SystemInterface(this.rom, this.ram);

  IF = new InstructionFetch({
    shouldStall: () => this.state !== State.InstructionFetch,
    bus: this.bus,
  });

  DE = new Decode({
    shouldStall: () => this.state !== State.Decode,
    getInstructionIn: () => this.IF.getInstructionOut(),
    regFile: this.regFile
  });

  EX = new Execute({
    shouldStall: () => this.state !== State.Execute,
    getDecodedValuesIn: () => this.DE.getDecodedValuesOut()
  });

  MEM = new MemoryAccess({
    shouldStall: () => this.state !== State.MemoryAccess,
    getExecutionValuesIn: () => this.EX.getExecutionValuesOut()
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

  cycle() {
    this.compute();
    this.latchNext();

    switch (this.state) {
      case State.InstructionFetch: { this.state = State.Decode; break; }
      case State.Decode: { this.state = State.Execute; break; }
      case State.Execute: { this.state = State.MemoryAccess; break; }
      case State.MemoryAccess: { this.state = State.WriteBack; break; }
      case State.WriteBack: { this.state = State.InstructionFetch; break; }
    }
  }
}

const rv = new RVI32System();

rv.regFile[1].value = 0x80000000;
rv.regFile[2].value = 0x00000001;

rv.rom.load(new Uint32Array([
  //0000000 rs2 rs1 101 rd 0110011 SRL
  0b0100000_00010_00001_101_00011_0110011
]));


while (true) {
  rv.cycle();
}