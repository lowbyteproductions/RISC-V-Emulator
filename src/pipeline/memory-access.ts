import { Register32 } from "../register32";
import { SystemInterface } from "../system-interface";
import { twos } from "../util";
import { Execute } from "./execute";
import { PipelineStage } from "./pipeline-stage";

export interface MemoryAccessParams {
  shouldStall: () => boolean;
  getExecutionValuesIn: () => ReturnType<Execute['getExecutionValuesOut']>;
  bus: SystemInterface;
}

export enum MemoryAccessWidth {
  Byte      = 0b000,
  HalfWord  = 0b001,
  Word      = 0b010,
}

export class MemoryAccess extends PipelineStage {
  private shouldStall: MemoryAccessParams['shouldStall'];
  private getExecutionValuesIn: MemoryAccessParams['getExecutionValuesIn'];
  private bus: MemoryAccessParams['bus'];

  private aluResult = new Register32(0);
  private rd = new Register32(0);
  private isAluOperation = new Register32(0);

  constructor(params: MemoryAccessParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getExecutionValuesIn = params.getExecutionValuesIn;
    this.bus = params.bus;
  }

  compute() {
    if (!this.shouldStall()) {
      const {aluResult, rd, isAluOperation, isStore, imm32, rs1, rs2, funct3} = this.getExecutionValuesIn();

      this.aluResult.value = aluResult;
      this.rd.value = rd;
      this.isAluOperation.value = isAluOperation;

      if (isStore) {
        // TODO: This should be done in the ALU
        const addr = twos(imm32 + rs1);

        switch (funct3) {
          case MemoryAccessWidth.Byte: {
            this.bus.write(addr, rs2 & 0xff, MemoryAccessWidth.Byte);
            break;
          }

          case MemoryAccessWidth.HalfWord: {
            this.bus.write(addr, rs2 & 0xffff, MemoryAccessWidth.HalfWord);
            break;
          }

          case MemoryAccessWidth.Word: {
            this.bus.write(addr, rs2, MemoryAccessWidth.Word);
            break;
          }
        }
      }
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
