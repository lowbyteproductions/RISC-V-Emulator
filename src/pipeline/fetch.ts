import { MemoryMap, SystemInterface } from '../system-interface';
import { MemoryAccessWidth } from './memory-access';
import { PipelineStage } from "./pipeline-stage";

export interface InstructionFetchParams {
  bus: SystemInterface;
  shouldStall: () => boolean;
  getBranchAddress: () => number;
  getBranchAddressValid: () => boolean;
}

export class InstructionFetch extends PipelineStage {
  private pc = this.regs.addRegister('pc', MemoryMap.ProgramROMStart);
  private pcPlus4 = this.regs.addRegister('pcPlus4', MemoryMap.ProgramROMStart);
  private instruction = this.regs.addRegister('instruction');

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
    this.regs.latchNext();
  }

  getInstructionValuesOut() {
    return this.regs.getValuesObject<
      | 'instruction'
      | 'pc'
      | 'pcPlus4'
    >();
  }
}
