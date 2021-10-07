import { MMIODevice } from './../system-interface';

export const RAMSize = 1024 * 1024 * 4;

export class RAMDevice implements MMIODevice {
  private ram = new Uint32Array(RAMSize / 4);

  read(address: number) {
    return this.ram[address & ((RAMSize / 4) - 1)];
  }

  write(address: number, value: number) {
    this.ram[address & ((RAMSize / 4) - 1)] = value;
  }
}
