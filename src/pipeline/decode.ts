import { Register32 } from "../register32";
import { bit, boolToInt, signExtend32, slice32 } from "../util";
import { InstructionFetch } from "./fetch";
import { PipelineStage } from "./pipeline-stage";

export interface DecodeParams {
  shouldStall: () => boolean;
  getInstructionValuesIn: () => ReturnType<InstructionFetch['getInstructionValuesOut']>;
  regFile: Array<Register32>;
}

export class Decode extends PipelineStage {
  private instruction = this.regs.addRegister('instruction');
  private opcode = this.regs.addRegister('opcode');
  private rd = this.regs.addRegister('rd');
  private funct3 = this.regs.addRegister('funct3');
  private rs1 = this.regs.addRegister('rs1');
  private rs2 = this.regs.addRegister('rs2');
  private funct7 = this.regs.addRegister('funct7');
  private shamt = this.regs.addRegister('shamt');

  private isAluOperation = this.regs.addRegister('isAluOperation');
  private isStore = this.regs.addRegister('isStore');
  private isLoad = this.regs.addRegister('isLoad');
  private isJump = this.regs.addRegister('isJump');
  private isLUI = this.regs.addRegister('isLUI');
  private isBranch = this.regs.addRegister('isBranch');
  private isJAL = this.regs.addRegister('isJAL');
  private isSystem = this.regs.addRegister('isSystem');
  private imm32 = this.regs.addRegister('imm32');
  private pc = this.regs.addRegister('pc');
  private pcPlus4 = this.regs.addRegister('pcPlus4');
  private csrAddress = this.regs.addRegister('csrAddress');
  private csrSource = this.regs.addRegister('csrSource');
  private csrShouldWrite = this.regs.addRegister('csrShouldWrite');
  private csrShouldRead = this.regs.addRegister('csrShouldRead');

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
      this.isStore.value  = boolToInt(this.opcode.nextValue === 0b0100011);
      this.isLoad.value   = boolToInt(this.opcode.nextValue === 0b0000011);
      this.isLUI.value    = boolToInt(this.opcode.nextValue === 0b0110111);
      this.isBranch.value = boolToInt(this.opcode.nextValue === 0b1100011);
      this.isJAL.value    = boolToInt(this.opcode.nextValue === 0b1101111);
      this.isSystem.value = boolToInt(this.opcode.nextValue === 0b1110011);
      const isJALR        = boolToInt(this.opcode.nextValue === 0b1100111);

      this.isJump.value = this.isJAL.nextValue | isJALR;

      const i = this.instruction.nextValue;

      this.csrAddress.value = i >>> 20;
      const zImm = rs1Address;
      const isIntegerCsr = (this.funct3.nextValue & 0b100) === 0b100;
      const isCsrrw = (this.funct3.nextValue & 0b11) === 0b01;

      this.csrSource.value = isIntegerCsr ? zImm : this.rs1.nextValue;
      this.csrShouldWrite.value = boolToInt(isCsrrw || (!isCsrrw && rs1Address !== 0));
      this.csrShouldRead.value = boolToInt(!isCsrrw || (isCsrrw && this.rd.nextValue !== 0));

      const sImm = signExtend32(12, (((i >> 25) & 0x7f) << 5) | ((i >> 7) & 0x1f));
      const iImm = signExtend32(12, i >>> 20);
      const uImm = (i >>> 12) << 12;
      const jImm = signExtend32(21, (bit(31, i, 20) | slice32(19, 12, i, 19) | bit(20, i, 11) | slice32(30, 21, i, 10)) << 1);
      const bImm = signExtend32(13, (bit(31, i, 12) | bit(7, i, 11) | slice32(30, 25, i, 10) | slice32(11, 8, i, 4)) << 1);

      if (this.isStore.nextValue) {
        this.imm32.value = sImm;
      } else if (this.isAluOperation.nextValue || this.isLoad.nextValue) {
        this.imm32.value = iImm;
      } else if (this.isLUI.nextValue) {
        this.imm32.value = uImm;
      } else if (this.isJAL.nextValue) {
        this.imm32.value = jImm;
      } else if (this.isBranch.nextValue) {
        this.imm32.value = bImm;
      } else if (isJALR) {
        this.imm32.value = slice32(11, 1, iImm, 11);
      } else if (this.isSystem.nextValue) {
        // no op
      } else {
        throw new Error('Not implemented');
      }
    }
  }

  latchNext() {
    this.regs.latchNext();
  }

  getDecodedValuesOut() {
    return this.regs.getValuesObject<
      | 'instruction'
      | 'opcode'
      | 'rd'
      | 'funct3'
      | 'rs1'
      | 'rs2'
      | 'funct7'
      | 'shamt'
      | 'isAluOperation'
      | 'isStore'
      | 'isLoad'
      | 'isJump'
      | 'isLUI'
      | 'isBranch'
      | 'isJAL'
      | 'csr'
      | 'imm32'
      | 'pc'
      | 'pcPlus4'
      | 'isSystem'
      | 'csrAddress'
      | 'csrSource'
      | 'csrShouldWrite'
      | 'csrShouldRead'
    >();
  }
}
