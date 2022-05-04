import { Register32 } from "./register32";

type RegisterValuesOut<KS extends string> = { [k in KS]: number }

export class RegisterBank {
  private registers: Record<string, Register32> = {};

  addRegister(name: string, initialValue = 0) {
    const reg = new Register32(initialValue);
    this.registers[name] = reg;
    return reg;
  }

  latchNext() {
    Object.values(this.registers).forEach(reg => reg.latchNext());
  }

  getValuesObject<KS extends string>() {
    return Object.entries(this.registers).reduce<Record<string, number>>((acc, [key, reg]) => {
      acc[key] = reg.value;
      return acc;
    }, {}) as RegisterValuesOut<KS>;
  }

  reset() {
    Object.values(this.registers).forEach(r => r.reset());
  }
}
