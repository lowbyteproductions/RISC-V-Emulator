import { CSRInstructionType, CSRInterface } from "../csr";
import { SystemInterface } from "../system-interface";
import { signExtend32, twos } from "../util";
import { Execute } from "./execute";
import { PipelineStage } from "./pipeline-stage";

export interface MemoryAccessParams {
  shouldStall: () => boolean;
  getExecutionValuesIn: () => ReturnType<Execute['getExecutionValuesOut']>;
  bus: SystemInterface;
  csr: CSRInterface;
}

export enum MemoryAccessWidth {
  Byte      = 0b000,
  HalfWord  = 0b001,
  Word      = 0b010,
}

export class MemoryAccess extends PipelineStage {
  private shouldStall: MemoryAccessParams['shouldStall'];
  private getExecutionValuesIn: MemoryAccessParams['getExecutionValuesIn'];
  private bus: MemoryAccessParams['bus'];
  private csr: MemoryAccessParams['csr'];

  private pc = this.regs.addRegister('pc');
  private writebackValue = this.regs.addRegister('writebackValue');
  private rd = this.regs.addRegister('rd');
  private writebackValueValid = this.regs.addRegister('writebackValueValid');

  constructor(params: MemoryAccessParams) {
    super();
    this.shouldStall = params.shouldStall;
    this.getExecutionValuesIn = params.getExecutionValuesIn;
    this.bus = params.bus;
    this.csr = params.csr;
  }

  compute() {
    if (!this.shouldStall()) {
      const {
        aluResult,
        rd,
        isAluOperation,
        isStore,
        imm32,
        rs1,
        rs2,
        funct3,
        isLoad,
        isLUI,
        isAUIPC,
        isJump,
        pc,
        pcPlus4,
        isSystem,
        csrShouldRead,
        csrShouldWrite,
        csrAddress,
        csrSource,
        branchAddress
      } = this.getExecutionValuesIn();

      this.writebackValue.value = aluResult;
      this.rd.value = rd;
      this.pc.value = pc;

      // TODO: This should be done in the ALU
      const addr = twos(imm32 + rs1);

      this.writebackValueValid.value = isLoad | isAluOperation | isLUI | isJump | isSystem | isAUIPC;

      if (isStore) {
        switch (funct3) {
          case MemoryAccessWidth.Byte: {
            this.bus.write(addr, rs2 & 0xff, MemoryAccessWidth.Byte);
            break;
          }

          case MemoryAccessWidth.HalfWord: {
            this.bus.write(addr, rs2 & 0xffff, MemoryAccessWidth.HalfWord);
            break;
          }

          case MemoryAccessWidth.Word: {
            this.bus.write(addr, rs2, MemoryAccessWidth.Word);
            break;
          }
        }
      } else if (isLoad) {
        const shouldSignExtend = (funct3 & 0b100) === 0;
        let value: number = 0;

        switch (funct3 & 0b011) {
          case MemoryAccessWidth.Byte: {
            value = this.bus.read(addr, MemoryAccessWidth.Byte);
            if (shouldSignExtend) {
              value = signExtend32(8, value);
            }
            break;
          }

          case MemoryAccessWidth.HalfWord: {
            value = this.bus.read(addr, MemoryAccessWidth.HalfWord);
            if (shouldSignExtend) {
              value = signExtend32(16, value);
            }
            break;
          }

          case MemoryAccessWidth.Word: {
            value = this.bus.read(addr, MemoryAccessWidth.Word);
            break;
          }
        }

        this.writebackValue.value = value;
      } else if (isLUI) {
        this.writebackValue.value = imm32;
      } else if (isJump) {
        this.writebackValue.value = pcPlus4;
      } else if (isSystem) {
        const csrValue = csrShouldRead
          ? this.csr.read(csrAddress)
          : 0;

        this.writebackValue.value = csrValue;

        switch (funct3 & 0b11) {
          case CSRInstructionType.RW: {
            if (csrShouldWrite) {
              this.csr.write(csrAddress, csrSource);
            }
            break;
          }

          case CSRInstructionType.RS: {
            if (csrShouldWrite) {
              this.csr.write(csrAddress, csrValue | csrSource);
            }
            break;
          }

          case CSRInstructionType.RC: {
            if (csrShouldWrite) {
              this.csr.write(csrAddress, twos(csrValue & ~csrSource));
            }
            break;
          }
        }
      } else if (isAUIPC) {
        this.writebackValue.value = branchAddress;
      }
    }
  }

  latchNext() {
    this.regs.latchNext();
  }

  getMemoryAccessValuesOut() {
    return this.regs.getValuesObject<
      | 'writebackValue'
      | 'rd'
      | 'writebackValueValid'
      | 'pc'
    >();
  }
}
