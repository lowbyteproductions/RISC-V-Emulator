import { MMIODevice } from './../system-interface';

export const ROMSize = 1024 * 1024;

export class ROMDevice implements MMIODevice {
  private rom = new Uint32Array(ROMSize / 4);

  read(address: number) {
    return this.rom[address & ((ROMSize / 4) - 1)];
  }

  write(address: number, value: number) {
    // Do nothing, you can't write to ROM
  }

  load(data: Uint32Array) {
    for (let i = 0; i < (ROMSize / 4); i++) {
      if (i >= data.length) {
        this.rom[i] = 0xffffffff;
      } else {
        this.rom[i] = data[i];
      }
    }
  }
}
