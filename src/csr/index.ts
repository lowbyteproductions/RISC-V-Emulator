import {Register64} from '../register64'

export enum CSRInstructionType {
  RW     = 0b01,
  RS     = 0b10,
  RC     = 0b11,

  CSRRW  = 0b001,
  CSRRS  = 0b010,
  CSRRC  = 0b011,
  CSRRWI = 0b101,
  CSRRSI = 0b110,
  CSRRCI = 0b111,
};

export class CSRInterface {
  cycles = new Register64();
  instret = new Register64();

  compute() {
    this.cycles.value += 1n;
  }

  latchNext() {
    this.cycles.latchNext();
    this.instret.latchNext();
  }

  read(address: number) {
    const isReadOnly = address >> 10;
    const permission = (address >> 8) & 0b11;

    if (permission !== 0) {
      throw new Error('CSR Read: Only user mode implemented');
    }

    switch (address) {
      case 0xC00: return this.cycles.getValueLow();
      case 0xC01: return this.cycles.getValueLow();
      case 0xC02: return this.instret.getValueLow();
      case 0xC80: return this.cycles.getValueHigh();
      case 0xC81: return this.cycles.getValueHigh();
      case 0xC82: return this.instret.getValueHigh();
    }

    return 0;
  }

  write(address: number, value: number) {
    const isReadOnly = address >> 10;
    const permission = (address >> 8) & 0b11;

    if (permission !== 0) {
      throw new Error('CSR Write: Only user mode implemented');
    }

    if (isReadOnly !== 0) {
      throw new Error('CSR Write: Attempt to write a read-only register');
    }
  }
}
