import { Register32 } from "../register32";
import { Execute } from "./execute";
import { PipelineStage } from "./pipeline-stage";

export interface MemoryAccessParams {
  shouldStall: () => boolean;
  getExecutionValuesIn: () => ReturnType<Execute['getExecutionValuesOut']>;
}

export class MemoryAccess extends PipelineStage {
  private shouldStall: MemoryAccessParams['shouldStall'];
  private getExecutionValuesIn: MemoryAccessParams['getExecutionValuesIn'];

  private aluResult = new Register32(0);
  private rd = new Register32(0);
  private isAluOperation = new Register32(0);

  constructor(params: MemoryAccessParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getExecutionValuesIn = params.getExecutionValuesIn;
  }

  compute() {
    if (!this.shouldStall()) {
      const {aluResult, rd, isAluOperation} = this.getExecutionValuesIn();

      this.aluResult.value = aluResult;
      this.rd.value = rd;
      this.isAluOperation.value = isAluOperation;
    }
  }

  latchNext() {
    this.aluResult.latchNext();
    this.rd.latchNext();
    this.isAluOperation.latchNext();
  }

  getMemoryAccessValuesOut() {
    return {
      aluResult: this.aluResult.value,
      rd: this.rd.value,
      isAluOperation: this.isAluOperation.value,
    }
  }
}
