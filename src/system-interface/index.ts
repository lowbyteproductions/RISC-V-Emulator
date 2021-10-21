import { MemoryAccessWidth } from '../pipeline/memory-access';
import { toHexString } from './../util';
import { RAMDevice } from './ram';
import { ROMDevice } from "./rom";

export interface MMIODevice {
  read(address: number, width: MemoryAccessWidth): number;
  write(address: number, value: number, width: MemoryAccessWidth): void;
}

export enum MemoryMap {
  ProgramROMStart = 0x10000000,
  ProgramROMEnd   = 0x1fffffff,
  RAMStart        = 0x20000000,
  RAMEnd          = 0x2fffffff,
}

export class SystemInterface implements MMIODevice {
  private rom: ROMDevice;
  private ram: RAMDevice;

  constructor(rom: ROMDevice, ram: RAMDevice) {
    this.rom = rom;
    this.ram = ram;
  }

  read(address: number, width: MemoryAccessWidth) {
    if ((address & MemoryMap.ProgramROMStart) === MemoryMap.ProgramROMStart) {
      return this.rom.read(address & 0x0fffffff, width);
    }

    if ((address & MemoryMap.RAMStart) === MemoryMap.RAMStart) {
      return this.ram.read(address & 0x0fffffff, width);
    }

    return 0;
  }

  write(address: number, value: number, width: MemoryAccessWidth) {
    if ((address & MemoryMap.RAMStart) === MemoryMap.RAMStart) {
      return this.ram.write(address & 0x0fffffff, value, width);
    }
  }
}
