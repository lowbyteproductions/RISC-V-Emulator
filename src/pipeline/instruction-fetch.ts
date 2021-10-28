import { MemoryMap, SystemInterface } from '../system-interface';
import { Register32 } from './../register32';
import { MemoryAccessWidth } from './memory-access';
import { PipelineStage } from "./pipeline-stage";

export interface InstructionFetchParams {
  bus: SystemInterface;
  shouldStall: () => boolean;
  getBranchAddress: () => number;
  getBranchAddressValid: () => boolean;
}

export class InstructionFetch extends PipelineStage {
  private pc = new Register32(MemoryMap.ProgramROMStart);
  private pcPlus4 = new Register32(MemoryMap.ProgramROMStart);
  private instruction = new Register32(0);

  private bus: InstructionFetchParams['bus'];
  private getBranchAddress: InstructionFetchParams['getBranchAddress'];
  private getBranchAddressValid: InstructionFetchParams['getBranchAddressValid'];
  private shouldStall: InstructionFetchParams['shouldStall'];

  constructor(params: InstructionFetchParams) {
    super();
    this.bus = params.bus;
    this.shouldStall = params.shouldStall;
    this.getBranchAddress = params.getBranchAddress;
    this.getBranchAddressValid = params.getBranchAddressValid;
  }

  compute() {
    if (!this.shouldStall()) {
      this.pc.value = this.getBranchAddressValid() ? this.getBranchAddress() : this.pcPlus4.value;
      this.pcPlus4.value = this.pc.nextValue + 4;
      this.instruction.value = this.bus.read(this.pc.nextValue, MemoryAccessWidth.Word);
    }
  }

  latchNext() {
    this.instruction.latchNext();
    this.pc.latchNext();
    this.pcPlus4.latchNext();
  }

  getInstructionValuesOut() {
    return {
      instruction: this.instruction.value,
      pc: this.pc.value,
      pcPlus4: this.pcPlus4.value,
    };
  }
}
