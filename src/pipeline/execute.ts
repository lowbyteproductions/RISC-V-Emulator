import { boolToInt, untwos } from './../util';
import { twos } from '../util';
import { Decode } from "./decode";
import { PipelineStage } from "./pipeline-stage";

export interface ExecuteParams {
  shouldStall: () => boolean;
  getDecodedValuesIn: () => ReturnType<Decode['getDecodedValuesOut']>;
  resetSignal: () => number;
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
  private resetSignal: ExecuteParams['resetSignal'];

  private aluResult = this.regs.addRegister('aluResult');
  private rd = this.regs.addRegister('rd');
  private isStore = this.regs.addRegister('isStore');
  private isLoad = this.regs.addRegister('isLoad');
  private isLUI = this.regs.addRegister('isLUI');
  private isAUIPC = this.regs.addRegister('isAUIPC');
  private isJump = this.regs.addRegister('isJump');
  private isAluOperation = this.regs.addRegister('isAluOperation');
  private imm32 = this.regs.addRegister('imm32');
  private funct3 = this.regs.addRegister('funct3');
  private rs1 = this.regs.addRegister('rs1');
  private rs2 = this.regs.addRegister('rs2');
  private branchAddress = this.regs.addRegister('branchAddress');
  private branchValid = this.regs.addRegister('branchValid');
  private pc = this.regs.addRegister('pc');
  private pcPlus4 = this.regs.addRegister('pcPlus4');
  private instruction = this.regs.addRegister('instruction');
  private isSystem = this.regs.addRegister('isSystem');
  private csrAddress = this.regs.addRegister('csrAddress');
  private csrSource = this.regs.addRegister('csrSource');
  private csrShouldWrite = this.regs.addRegister('csrShouldWrite');
  private csrShouldRead = this.regs.addRegister('csrShouldRead');

  constructor(params: ExecuteParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getDecodedValuesIn = params.getDecodedValuesIn;
    this.resetSignal = params.resetSignal;
  }

  compute() {
    if (this.resetSignal()) {
      this.reset();
    } else if (!this.shouldStall()) {
      const decoded = this.getDecodedValuesIn();

      const {imm32} = decoded;

      this.rd.value = decoded.rd;
      this.isAUIPC.value = decoded.isAUIPC;
      this.isAluOperation.value = decoded.isAluOperation;
      this.isStore.value = decoded.isStore;
      this.isLoad.value = decoded.isLoad;
      this.isLUI.value = decoded.isLUI;
      this.isJump.value = decoded.isJump;
      this.isSystem.value = decoded.isSystem;
      this.imm32.value = decoded.imm32;
      this.funct3.value = decoded.funct3;
      this.rs1.value = decoded.rs1;
      this.rs2.value = decoded.rs2;
      this.pc.value = decoded.pc;
      this.pcPlus4.value = decoded.pcPlus4;
      this.instruction.value = decoded.instruction;
      this.csrAddress.value = decoded.csrAddress;
      this.csrShouldRead.value = decoded.csrShouldRead;
      this.csrShouldWrite.value = decoded.csrShouldWrite;
      this.csrSource.value = decoded.csrSource;

      const isRegisterOp = Boolean((decoded.opcode >> 5) & 1);
      const isAlternate = Boolean((decoded.instruction >> 30) & 1);

      const branchBase = (decoded.isJAL | decoded.isBranch | decoded.isAUIPC) ? decoded.pc : decoded.rs1;
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
    this.regs.latchNext();
  }

  getExecutionValuesOut() {
    return this.regs.getValuesObject<
      | 'aluResult'
      | 'rd'
      | 'isStore'
      | 'isLoad'
      | 'isLUI'
      | 'isAUIPC'
      | 'isJump'
      | 'isAluOperation'
      | 'imm32'
      | 'funct3'
      | 'rs1'
      | 'rs2'
      | 'branchAddress'
      | 'branchValid'
      | 'pc'
      | 'pcPlus4'
      | 'instruction'
      | 'isSystem'
      | 'csrAddress'
      | 'csrSource'
      | 'csrShouldWrite'
      | 'csrShouldRead'
    >();
  }
}
