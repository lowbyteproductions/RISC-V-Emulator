import { boolToInt, untwos } from './../util';
import { twos } from '../util';
import { Register32 } from './../register32';
import { Decode } from "./decode";
import { PipelineStage } from "./pipeline-stage";

export interface ExecuteParams {
  shouldStall: () => boolean;
  getDecodedValuesIn: () => ReturnType<Decode['getDecodedValuesOut']>;
}

export enum ALUOperation {
  ADD   = 0b000,
  SLL   = 0b001,
  SLT   = 0b010,
  SLTU  = 0b011,
  XOR   = 0b100,
  SR    = 0b101,
  OR    = 0b110,
  AND   = 0b111,
}

export class Execute extends PipelineStage {
  private shouldStall: ExecuteParams['shouldStall'];
  private getDecodedValuesIn: ExecuteParams['getDecodedValuesIn'];

  private aluResult = new Register32(0);
  private rd = new Register32(0);
  private isStore = new Register32(0);
  private isLoad = new Register32(0);
  private isLUI = new Register32(0);
  private isAluOperation = new Register32(0);
  private imm32 = new Register32(0);
  private funct3 = new Register32(0);
  private rs1 = new Register32(0);
  private rs2 = new Register32(0);

  constructor(params: ExecuteParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getDecodedValuesIn = params.getDecodedValuesIn;
  }

  compute() {
    if (!this.shouldStall()) {
      const decoded = this.getDecodedValuesIn();

      const {imm32} = decoded;

      this.rd.value = decoded.rd;
      this.isAluOperation.value = decoded.isAluOperation;
      this.isStore.value = decoded.isStore;
      this.isLoad.value = decoded.isLoad;
      this.isLUI.value = decoded.isLUI;
      this.imm32.value = decoded.imm32;
      this.funct3.value = decoded.funct3;
      this.rs1.value = decoded.rs1;
      this.rs2.value = decoded.rs2;

      const isRegisterOp = Boolean((decoded.opcode >> 5) & 1);
      const isAlternate = Boolean((decoded.instruction >> 30) & 1);

      switch (decoded.funct3) {
        case ALUOperation.ADD: {
          if (isRegisterOp) {
            this.aluResult.value = isAlternate
              ? decoded.rs1 - decoded.rs2
              : decoded.rs1 + decoded.rs2;
          } else {
            this.aluResult.value = decoded.rs1 + imm32;
          }
          break;
        }

        case ALUOperation.SLL: {
          this.aluResult.value = isRegisterOp
            ? decoded.rs1 << decoded.rs2
            : decoded.rs1 << decoded.shamt;
          break;
        }

        case ALUOperation.SLT: {
          this.aluResult.value = isRegisterOp
            ? Number(untwos(decoded.rs1) < untwos(decoded.rs2))
            : Number(untwos(decoded.rs1) < untwos(imm32));
          break;
        }

        case ALUOperation.SLTU: {
          this.aluResult.value = isRegisterOp
            ? Number(decoded.rs1 < decoded.rs2)
            : Number(decoded.rs1 < imm32);
          break;
        }

        case ALUOperation.XOR: {
          this.aluResult.value = isRegisterOp
            ? decoded.rs1 ^ decoded.rs2
            : decoded.rs1 ^ imm32;
          break;
        }

        case ALUOperation.SR: {
          this.aluResult.value = isRegisterOp
            ? isAlternate
              ? decoded.rs1 >> decoded.rs2
              : decoded.rs1 >>> decoded.rs2
            : decoded.rs1 >>> decoded.shamt;
          break;
        }

        case ALUOperation.XOR: {
          this.aluResult.value = isRegisterOp
            ? decoded.rs1 | decoded.rs2
            : decoded.rs1 | imm32;
          break;
        }

        case ALUOperation.AND: {
          this.aluResult.value = isRegisterOp
            ? decoded.rs1 & decoded.rs2
            : decoded.rs1 & imm32;
          break;
        }
      }
    }
  }

  latchNext() {
    this.aluResult.latchNext();
    this.rd.latchNext();
    this.isAluOperation.latchNext();
    this.isStore.latchNext();
    this.isLoad.latchNext();
    this.isLUI.latchNext();
    this.imm32.latchNext();
    this.funct3.latchNext();
    this.rs1.latchNext();
    this.rs2.latchNext();
  }

  getExecutionValuesOut() {
    return {
      aluResult: this.aluResult.value,
      rd: this.rd.value,
      isAluOperation: this.isAluOperation.value,
      isStore: this.isStore.value,
      isLoad: this.isLoad.value,
      isLUI: this.isLUI.value,
      imm32: this.imm32.value,
      funct3: this.funct3.value,
      rs1: this.rs1.value,
      rs2: this.rs2.value,
    }
  }
}
