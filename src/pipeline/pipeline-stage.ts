import { RegisterBank } from "../reigster-bank";

export abstract class PipelineStage {
  regs = new RegisterBank();
  abstract compute(): void;
  abstract latchNext(): void;
}
