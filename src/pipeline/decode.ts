import { Register32 } from "../register32";
import { PipelineStage } from "./pipeline-stage";

export interface DecodeParams {
  shouldStall: () => boolean;
  getInstructionIn: () => number;
  regFile: Array<Register32>;
}

export class Decode extends PipelineStage {
  private instruction = 0;
  private instructionNext = 0;
  private opcode = 0;
  private opcodeNext = 0;
  private rd = 0;
  private rdNext = 0;
  private funct3 = 0;
  private funct3Next = 0;
  private rs1 = 0;
  private rs1Next = 0;
  private rs2 = 0;
  private rs2Next = 0;
  private imm11_0 = 0;
  private imm11_0Next = 0;
  private funct7 = 0;
  private funct7Next = 0;
  private shamt = 0;
  private shamtNext = 0;

  private regFile: DecodeParams['regFile'];

  private shouldStall: DecodeParams['shouldStall'];
  private getInstructionIn: DecodeParams['getInstructionIn'];

  constructor(params: DecodeParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getInstructionIn = params.getInstructionIn;
    this.regFile = params.regFile;
  }

  compute() {
    if (!this.shouldStall()) {
      this.instructionNext = this.getInstructionIn();
      this.opcodeNext = this.instructionNext & 0x7f;
      this.rdNext = (this.instructionNext >> 7) & 0x1f;
      this.funct3Next = (this.instructionNext >> 12) & 0x07;
      this.imm11_0Next = (this.instructionNext >>> 20) & 0xfff;
      this.funct7Next = (this.instructionNext >>> 25) & 0x7f;
      const rs1Address = (this.instructionNext >> 15) & 0x1f;
      const rs2Address = (this.instructionNext >> 20) & 0x1f;
      this.shamtNext = rs2Address;

      this.rs1Next = rs1Address === 0 ? 0 : this.regFile[rs1Address].value;
      this.rs2Next = rs2Address === 0 ? 0 : this.regFile[rs2Address].value;
    }
  }

  latchNext() {
    this.instruction = this.instructionNext;
    this.opcode = this.opcodeNext;
    this.rd = this.rdNext;
    this.funct3 = this.funct3Next;
    this.rs1 = this.rs1Next;
    this.rs2 = this.rs2Next;
    this.imm11_0 = this.imm11_0Next;
    this.funct7 = this.funct7Next;
    this.shamt = this.shamtNext;
  }

  getDecodedValuesOut() {
    return {
      instruction: this.instruction,
      opcode: this.opcode,
      rd: this.rd,
      funct3: this.funct3,
      rs1: this.rs1,
      rs2: this.rs2,
      imm11_0: this.imm11_0,
      funct7: this.funct7,
      shamt: this.shamt,
    }
  }
}
