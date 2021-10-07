export abstract class PipelineStage {
  abstract compute(): void;
  abstract latchNext(): void;
}
