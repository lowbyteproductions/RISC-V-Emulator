enum RegIndex {
  Value = 0,
  Next  = 1
}

export class Register32 {
  private _value = new Uint32Array(2);

  constructor(value = 0) {
    this._value[RegIndex.Value] = this._value[RegIndex.Next] = value;
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
}
