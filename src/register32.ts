enum RegIndex {
  Value = 0,
  Next  = 1
}

export class Register32 {
  private _value = new Uint32Array(2);
  private defaultValue = 0;

  constructor(value = 0) {
    this._value[RegIndex.Value] = this._value[RegIndex.Next] = value;
    this.defaultValue = value;
  }

  get value() {
    return this._value[RegIndex.Value];
  }

  get nextValue() {
    return this._value[RegIndex.Next];
  }

  set value(v: number) {
    this._value[RegIndex.Next] = v;
  }

  latchNext() {
    this._value[RegIndex.Value] = this._value[RegIndex.Next];
  }

  reset() {
    this._value[RegIndex.Next] = this.defaultValue;
    this._value[RegIndex.Value] = this.defaultValue;
  }
}
