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

export enum BranchType {
  BEQ   = 0b000,
  BNE  = 0b001,
  BLT  = 0b100,
  BGE  = 0b101,
  BLTU = 0b110,
  BGEU = 0b111,
}

export class Execute extends PipelineStage {
  private shouldStall: ExecuteParams['shouldStall'];
  private getDecodedValuesIn: ExecuteParams['getDecodedValuesIn'];

  private aluResult = new Register32(0);
  private rd = new Register32(0);
  private isStore = new Register32(0);
  private isLoad = new Register32(0);
  private isLUI = new Register32(0);
  private isJump = new Register32(0);
  private isAluOperation = new Register32(0);
  private imm32 = new Register32(0);
  private funct3 = new Register32(0);
  private rs1 = new Register32(0);
  private rs2 = new Register32(0);
  private branchAddress = new Register32(0);
  private branchValid = new Register32(0);
  private pcPlus4 = new Register32(0);

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
      this.isJump.value = decoded.isJump;
      this.imm32.value = decoded.imm32;
      this.funct3.value = decoded.funct3;
      this.rs1.value = decoded.rs1;
      this.rs2.value = decoded.rs2;
      this.pcPlus4.value = decoded.pcPlus4;

      const isRegisterOp = Boolean((decoded.opcode >> 5) & 1);
      const isAlternate = Boolean((decoded.instruction >> 30) & 1);

      const branchBase = (decoded.isJAL | decoded.isBranch) ? decoded.pc : decoded.rs1;
      this.branchAddress.value = branchBase + decoded.imm32;

      let addResult = 0;
      if (isRegisterOp) {
        addResult = twos(isAlternate
          ? decoded.rs1 - decoded.rs2
          : decoded.rs1 + decoded.rs2);
      } else {
        addResult = twos(decoded.rs1 + imm32);
      }

      const sllResult = twos(isRegisterOp
        ? decoded.rs1 << decoded.rs2
        : decoded.rs1 << decoded.shamt);

      const sltResult = twos(isRegisterOp
        ? Number(untwos(decoded.rs1) < untwos(decoded.rs2))
        : Number(untwos(decoded.rs1) < untwos(imm32)));

      const sltuResult = twos(isRegisterOp
        ? Number(decoded.rs1 < decoded.rs2)
        : Number(decoded.rs1 < imm32));

      const xorResult = twos(isRegisterOp
        ? decoded.rs1 ^ decoded.rs2
        : decoded.rs1 ^ imm32);

      const srResult = twos(isRegisterOp
        ? isAlternate
          ? decoded.rs1 >> decoded.rs2
          : decoded.rs1 >>> decoded.rs2
        : decoded.rs1 >>> decoded.shamt);

      const orResult = twos(isRegisterOp
        ? decoded.rs1 | decoded.rs2
        : decoded.rs1 | imm32);

      const andResult = twos(isRegisterOp
        ? decoded.rs1 & decoded.rs2
        : decoded.rs1 & imm32);

      const eqResult = Number(decoded.rs1 === decoded.rs2);
      const neqResult = (~eqResult) & 1;
      const gteResult = (~sltResult) & 1;
      const gteuResult = (~sltuResult) & 1;

      switch (decoded.funct3) {
        case ALUOperation.ADD: this.aluResult.value = addResult; break;
        case ALUOperation.SLL: this.aluResult.value = sllResult; break;
        case ALUOperation.SLT: this.aluResult.value = sltResult; break;
        case ALUOperation.SLTU: this.aluResult.value = sltuResult; break;
        case ALUOperation.XOR: this.aluResult.value = xorResult; break;
        case ALUOperation.SR: this.aluResult.value = srResult; break;
        case ALUOperation.OR: this.aluResult.value = orResult; break;
        case ALUOperation.AND: this.aluResult.value = andResult; break;
      }

      let branchConditionMet = 0;
      switch (decoded.funct3) {
        case BranchType.BEQ: branchConditionMet = eqResult; break;
        case BranchType.BNE: branchConditionMet = neqResult; break;
        case BranchType.BLT: branchConditionMet = sltResult; break;
        case BranchType.BLTU: branchConditionMet = sltuResult; break;
        case BranchType.BGE: branchConditionMet = gteResult; break;
        case BranchType.BGEU: branchConditionMet = gteuResult; break;
      }
      this.branchValid.value = decoded.isJump | (decoded.isBranch & branchConditionMet);
    }
  }

  latchNext() {
    this.aluResult.latchNext();
    this.rd.latchNext();
    this.isAluOperation.latchNext();
    this.isStore.latchNext();
    this.isLoad.latchNext();
    this.isLUI.latchNext();
    this.isJump.latchNext();
    this.imm32.latchNext();
    this.funct3.latchNext();
    this.rs1.latchNext();
    this.rs2.latchNext();
    this.pcPlus4.latchNext();
    this.branchAddress.latchNext();
    this.branchValid.latchNext();
  }

  getExecutionValuesOut() {
    return {
      aluResult: this.aluResult.value,
      rd: this.rd.value,
      isAluOperation: this.isAluOperation.value,
      isStore: this.isStore.value,
      isLoad: this.isLoad.value,
      isLUI: this.isLUI.value,
      isJump: this.isJump.value,
      imm32: this.imm32.value,
      funct3: this.funct3.value,
      rs1: this.rs1.value,
      rs2: this.rs2.value,
      pcPlus4: this.pcPlus4.value,
      branchAddress: this.branchAddress.value,
      branchValid: this.branchValid.value,
    }
  }
}
