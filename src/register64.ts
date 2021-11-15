export class Register64 {
  private _value = 0n;
  private _nextValue = 0n;

  constructor(value = 0n) {
    this._value = this._nextValue = value;
  }

  get value() {
    return this._value;
  }

  get nextValue() {
    return this._nextValue;
  }

  set value(v: bigint) {
    this._nextValue = v;
  }

  getValueLow() {
    return Number(this._value & 0xffffffffn);
  }

  getValueHigh() {
    return Number(this._value >> 32n);
  }

  getNextValueLow() {
    return Number(this._nextValue & 0xffffffffn);
  }

  getNextValueHigh() {
    return Number(this._nextValue >> 32n);
  }

  latchNext() {
    this._value = this._nextValue;
  }
}
