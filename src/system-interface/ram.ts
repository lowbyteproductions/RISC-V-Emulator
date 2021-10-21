import { MemoryAccessWidth } from '../pipeline/memory-access';
import { MMIODevice } from './../system-interface';

export const RAMSize = 1024 * 1024 * 4;

export class RAMDevice implements MMIODevice {
  private ram = new Uint32Array(RAMSize / 4);

  read(address: number, width: MemoryAccessWidth) {
    const addr = address >>> 2;
    const offset = address & 0b11;
    const value = this.ram[addr & ((RAMSize / 4) - 1)];

    switch (width) {
      case MemoryAccessWidth.Byte: {
        switch (offset) {
          case 0b00: return (value & 0xff000000) >>> 24;
          case 0b01: return (value & 0x00ff0000) >>> 16;
          case 0b10: return (value & 0x0000ff00) >>> 8;
          case 0b11: return (value & 0xff);
        }
      }

      case MemoryAccessWidth.HalfWord: {
        switch (offset & 0b10) {
          case 0b00: return (value & 0xffff0000) >>> 16;
          case 0b10: return (value & 0xffff);
        }
      }

      case MemoryAccessWidth.Word: return value;
    }
  }

  write(address: number, value: number, width: MemoryAccessWidth) {
    const addr = address >>> 2;
    const maskedAddr = addr & ((RAMSize / 4) - 1);
    const offset = address & 0b11;
    const currentValue = this.ram[maskedAddr];

    switch (width) {
      case MemoryAccessWidth.Byte: {
        switch (offset) {
          case 0b00: {
            this.ram[maskedAddr] = (currentValue & 0x00ffffff) | (value << 24);
            return;
          }
          case 0b01: {
            this.ram[maskedAddr] = (currentValue & 0xff00ffff) | (value << 16);
            return;
          }
          case 0b10: {
            this.ram[maskedAddr] = (currentValue & 0xffff00ff) | (value << 8);
            return;
          }
          case 0b11: {
            this.ram[maskedAddr] = (currentValue & 0xffffff00) | (value);
            return;
          }
        }
      }

      case MemoryAccessWidth.HalfWord: {
        switch (offset & 0b10) {
          case 0b00: {
            this.ram[maskedAddr] = (currentValue & 0x0000ffff) | (value << 16);
            return;
          }
          case 0b10: {
            this.ram[maskedAddr] = (currentValue & 0xffff0000) | (value);
            return;
          }
        }
      }

      case MemoryAccessWidth.Word: {
        this.ram[maskedAddr] = value;
        return;
      }
    }
  }
}
