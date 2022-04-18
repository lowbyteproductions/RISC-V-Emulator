import {Register64} from '../register64'
import {toHexString} from '../util';

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

export enum CSRMMode {
  misa      =	0x301,
  mvendorid =	0xF11,
  marchid   =	0xF12,
  mimpid    =	0xF13,
  mhartid   =	0xF14,
  mstatus   =	0x300,
  mtvec     =	0x305,
  mie       =	0x304,
  mip       =	0x344,
  mcause    =	0x342,
  mepc      =	0x341,
  mscratch  =	0x340,
  mtval     =	0x343,
};

const MSTATUS_MASK = (1 << 3) | (1 << 7);

export class CSRInterface {
  /* User mode registers */
  cycles = new Register64();
  instret = new Register64();

  /* Machine mode registers */

  // Some of these registers will be written from outside sources, so it might make sense to convert them to
  // registers

  // Encodes CPU capabilities, top 2 bits encode width (XLEN), bottom 26 encode extensions
  misa      = 0x40000100;
  // JEDEC manufacturer ID
  mvendorid = 0;
  // Microarchitecture ID
  marchid   = 0;
  // Processor version
  mimpid    = 0;
  // Hart ID
  mhartid   = 0;
  // Various specific flags and settings, including global interrupt enable, and a lot of noop bits (for us)
  mstatus   = 0;
  // Encodes the base trap vector address + mode (table or single handler)
  mtvec     = 0x10000004 | 1;
  // Interrupt enable / disable
  mie       = 0x00000888;
  // Interrupt-pending
  mip       = 0;
  // Trap cause. Top bit set = interrupt, reset = exception - reset indicates the type
  mcause    = 0;
  // Exception Program Counter
  mepc      = 0;
  // General use reg for M-Mode, mostly used to hold a pointer context space apparently
  mscratch  = 0;
  // Trap-value register, can hold the address of a faulting instruction
  mtval     = 0;

  // This register will just map to the cycles register
  /* mtime = 0*/
  // (Not a CSR) Memory-mapped 64-bit reg, with a writable value. When mtime == mtimecmp, a timer interrupt fires
  mtimecmp  = new Register64();

  compute() {
    this.cycles.value += 1n;
    this.cycles.getNextValueHigh()
  }

  latchNext() {
    this.cycles.latchNext();
    this.instret.latchNext();
  }

  read(address: number) {
    switch (address) {
      // User Level
      case 0xc00: return this.cycles.getValueLow();
      case 0xc01: return this.cycles.getValueLow();
      case 0xc02: return this.instret.getValueLow();
      case 0xc80: return this.cycles.getValueHigh();
      case 0xc81: return this.cycles.getValueHigh();
      case 0xc82: return this.instret.getValueHigh();

      // Machine Mode
      case 0x301: return this.misa;
      case 0xf11: return this.mvendorid;
      case 0xf12: return this.marchid;
      case 0xf13: return this.mimpid;
      case 0xf14: return this.mhartid;
      case 0x300: return this.mstatus;
      case 0x305: return this.mtvec;
      case 0x304: return this.mie;
      case 0x344: return this.mip;
      case 0x342: return this.mcause;
      case 0x341: return this.mepc;
      case 0x340: return this.mscratch;
      case 0x343: return this.mtval;
    }

    throw new Error(`Unknown CSR: 0x${toHexString(address, 3)}`);
  }

  write(address: number, value: number) {
    const isReadOnly = address >> 10;
    const permission = (address >> 8) & 0b11;

    if (isReadOnly !== 0) {
      throw new Error('CSR Write: Attempt to write a read-only register');
    }

    switch (address) {
      case CSRMMode.mstatus: {
        this.mstatus = value & MSTATUS_MASK;
        return;
      }
      case CSRMMode.mie: {
        this.mie = value;
        return;
      }
      case CSRMMode.mip: {
        this.mip = value;
        return;
      }
      case CSRMMode.mcause: {
        this.mcause = value;
        return;
      }
      case CSRMMode.mepc: {
        this.mepc = value;
        return;
      }
      case CSRMMode.mscratch: {
        this.mscratch = value;
        return;
      }
      case CSRMMode.mtval: {
        this.mtval = value;
        return;
      }
    }
  }
}
