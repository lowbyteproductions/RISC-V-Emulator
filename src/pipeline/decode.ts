import { Register32 } from "../register32";
import { bit, boolToInt, signExtend32, slice32 } from "../util";
import { InstructionFetch } from "./instruction-fetch";
import { PipelineStage } from "./pipeline-stage";

export interface DecodeParams {
  shouldStall: () => boolean;
  getInstructionValuesIn: () => ReturnType<InstructionFetch['getInstructionValuesOut']>;
  regFile: Array<Register32>;
}

export class Decode extends PipelineStage {
  private instruction = new Register32(0);
  private opcode = new Register32(0);
  private rd = new Register32(0);
  private funct3 = new Register32(0);
  private rs1 = new Register32(0);
  private rs2 = new Register32(0);
  private funct7 = new Register32(0);
  private shamt = new Register32(0);

  private isAluOperation = new Register32(0);
  private isStore = new Register32(0);
  private isLoad = new Register32(0);
  private isJump = new Register32(0);
  private isLUI = new Register32(0);
  private imm32 = new Register32(0);
  private branchAddress = new Register32(0);
  private pc = new Register32(0);
  private pcPlus4 = new Register32(0);

  private regFile: DecodeParams['regFile'];

  private shouldStall: DecodeParams['shouldStall'];
  private getInstructionValuesIn: DecodeParams['getInstructionValuesIn'];

  constructor(params: DecodeParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getInstructionValuesIn = params.getInstructionValuesIn;
    this.regFile = params.regFile;
  }

  compute() {
    if (!this.shouldStall()) {
      const {instruction, pc, pcPlus4} = this.getInstructionValuesIn();

      this.pc.value = pc;
      this.pcPlus4.value = pcPlus4;

      this.instruction.value = instruction;
      this.opcode.value = this.instruction.nextValue & 0x7f;
      this.rd.value = (this.instruction.nextValue >> 7) & 0x1f;
      this.funct3.value = (this.instruction.nextValue >> 12) & 0x07;
      this.funct7.value = (this.instruction.nextValue >>> 25) & 0x7f;
      const rs1Address = (this.instruction.nextValue >> 15) & 0x1f;
      const rs2Address = (this.instruction.nextValue >> 20) & 0x1f;
      this.shamt.value = rs2Address;

      this.rs1.value = rs1Address === 0 ? 0 : this.regFile[rs1Address].value;
      this.rs2.value = rs2Address === 0 ? 0 : this.regFile[rs2Address].value;

      this.isAluOperation.value = boolToInt((this.opcode.nextValue & 0b1011111) === 0b0010011);
      this.isStore.value = boolToInt(this.opcode.nextValue === 0b0100011);
      this.isLoad.value  = boolToInt(this.opcode.nextValue === 0b0000011);
      this.isLUI.value   = boolToInt(this.opcode.nextValue === 0b0110111);
      const isJAL        = boolToInt(this.opcode.nextValue === 0b1101111);
      const isJALR       = boolToInt(this.opcode.nextValue === 0b1100111);

      this.isJump.value = isJAL | isJALR;

      const i = this.instruction.nextValue;

      const sImm = signExtend32(12, (((i >> 25) & 0x7f) << 5) | ((i >> 7) & 0x1f));
      const iImm = signExtend32(12, i >>> 20);
      const uImm = (i >>> 12) << 12;
      const jImm = signExtend32(21, (bit(31, i, 20) | slice32(19, 12, i, 19) | bit(20, i, 11) | slice32(30, 21, i, 10)) << 1);

      if (this.isStore.nextValue) {
        this.imm32.value = sImm;
      } else if (this.isAluOperation.nextValue || this.isLoad.nextValue) {
        this.imm32.value = iImm;
      } else if (this.isLUI.nextValue) {
        this.imm32.value = uImm;
      } else if (isJAL) {
        this.imm32.value = jImm;
        this.branchAddress.value = pc + jImm;
      } else if (isJALR) {
        this.imm32.value = iImm;
        this.branchAddress.value = this.rs1.nextValue + slice32(11, 1, iImm, 11);
      } else {
        throw new Error('Not implemented');
      }
    }
  }

  latchNext() {
    this.instruction.latchNext();
    this.opcode.latchNext();
    this.rd.latchNext();
    this.funct3.latchNext();
    this.rs1.latchNext();
    this.rs2.latchNext();
    this.funct7.latchNext();
    this.shamt.latchNext();

    this.isAluOperation.latchNext();
    this.isStore.latchNext();
    this.isLoad.latchNext();
    this.isLUI.latchNext();
    this.isJump.latchNext();
    this.imm32.latchNext();
    this.branchAddress.latchNext();
    this.pc.latchNext();
    this.pcPlus4.latchNext();
  }

  getDecodedValuesOut() {
    return {
      instruction: this.instruction.value,
      opcode: this.opcode.value,
      rd: this.rd.value,
      funct3: this.funct3.value,
      rs1: this.rs1.value,
      rs2: this.rs2.value,
      funct7: this.funct7.value,
      shamt: this.shamt.value,

      isAluOperation: this.isAluOperation.value,
      isStore: this.isStore.value,
      isLoad: this.isLoad.value,
      isLUI: this.isLUI.value,
      isJump: this.isJump.value,
      imm32: this.imm32.value,
      branchAddress: this.branchAddress.value,
      pc: this.pc.value,
      pcPlus4: this.pcPlus4.value,
    }
  }
}
