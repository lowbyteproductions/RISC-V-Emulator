import { MemoryMap, SystemInterface } from '../system-interface';
import { Register32 } from './../register32';
import { MemoryAccessWidth } from './memory-access';
import { PipelineStage } from "./pipeline-stage";

export interface InstructionFetchParams {
  bus: SystemInterface;
  shouldStall: () => boolean;
}

export class InstructionFetch extends PipelineStage {
  private pc = new Register32(MemoryMap.ProgramROMStart);
  private instruction = new Register32(0);

  private bus: InstructionFetchParams['bus'];
  private shouldStall: InstructionFetchParams['shouldStall'];

  constructor(params: InstructionFetchParams) {
    super();
    this.bus = params.bus;
    this.shouldStall = params.shouldStall;
  }

  compute() {
    if (!this.shouldStall()) {
      this.instruction.value = this.bus.read(this.pc.value, MemoryAccessWidth.Word);
      this.pc.value += 4;
    }
  }

  latchNext() {
    this.instruction.latchNext();
    this.pc.latchNext();
  }

  getInstructionOut() { return this.instruction.value; }
}
