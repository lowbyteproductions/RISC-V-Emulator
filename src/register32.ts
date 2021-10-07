export class Register32 {
  private _value = new Uint32Array(2);

  constructor(value = 0) {
    this._value[0] = this._value[1] = value;
  }

  get value() {
    return this._value[0];
  }

  set value(v: number) {
    this._value[1] = v;
  }

  latchNext() {
    this._value[0] = this._value[1];
  }

  getWorkingValue() {
    return this._value[1];
  }
}
