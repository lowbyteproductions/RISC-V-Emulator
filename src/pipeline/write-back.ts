import { Register32 } from "../register32";
import { MemoryAccess } from "./memory-access";
import { PipelineStage } from "./pipeline-stage";

export interface WriteBackParams {
  shouldStall: () => boolean;
  getMemoryAccessValuesIn: () => ReturnType<MemoryAccess['getMemoryAccessValuesOut']>;
  regFile: Array<Register32>;
  resetSignal: () => number;
}

export class WriteBack extends PipelineStage {
  private shouldStall: WriteBackParams['shouldStall'];
  private getMemoryAccessValuesIn: WriteBackParams['getMemoryAccessValuesIn'];
  private regFile: WriteBackParams['regFile'];
  private resetSignal: WriteBackParams['resetSignal'];

  constructor(params: WriteBackParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getMemoryAccessValuesIn = params.getMemoryAccessValuesIn;
    this.regFile = params.regFile;
    this.resetSignal = params.resetSignal;
  }

  compute() {
    if (this.resetSignal()) {
      this.reset();
    } else if (!this.shouldStall()) {
      const {writebackValue, rd, writebackValueValid} = this.getMemoryAccessValuesIn();

      if (writebackValueValid) {
        this.regFile[rd].value = writebackValue;
      }
    }
  }

  latchNext() {}
}
