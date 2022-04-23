import { CSRInterface } from "../csr";
import { RegisterBank } from "../reigster-bank";

export enum MCause {
  // Interrupts
  UserSoftwareInterrupt = 0x8000_0000,
  SupervisorSoftwareInterrupt,
  Reserved0,
  MachineSoftwareInterrupt,
  UserTimerInterrupt,
  SupervisorTimerInterrupt,
  Reserved1,
  MachineTimerInterrupt,
  UserExternalInterrupt,
  SupervisorExternalInterrupt,
  Reserved2,
  MachineExternalInterrupt,

  // Exceptions
  InstructionAddressMisaligned = 0x0000_0000,
  InstructionAccessFault,
  IllegalInstruction,
  Breakpoint,
  LoadAddressMisaligned,
  LoadAccessFault,
  StoreAMOAddressMisaligned,
  StoreAMOAccessFault,
  EnvironmentCallFromUMode,
  EnvironmentCallFromSMode,
  Reserved3,
  EnvironmentCallFromMMode,
  InstructionPageFault,
  LoadPageFault,
  Reserved4,
  StoreAMOPageFault,
}

export type TrapParams = {
  csr: CSRInterface;
  setPc: (pc: number) => void;
  returnToPipelineMode: () => void;
}

export enum TrapState {
  Idle,
  SetCSRJump,
  ReturnFromTrap,
  SetPc,
}

export class Trap {
  regs = new RegisterBank();

  csr: TrapParams['csr'];
  setPc: TrapParams['setPc'];
  returnToPipelineMode: TrapParams['returnToPipelineMode'];

  state = this.regs.addRegister('state', TrapState.Idle);

  mepc = this.regs.addRegister('mepc');
  mcause = this.regs.addRegister('mcause');
  mtval = this.regs.addRegister('mtval');

  pcToSet = this.regs.addRegister('pcToSet');

  constructor(params: TrapParams) {
    this.csr = params.csr;
    this.setPc = params.setPc;
    this.returnToPipelineMode = params.returnToPipelineMode;
  }

  trapException(mepc: number, mcause: number, mtval: number) {
    this.mepc.value = mepc;
    this.mcause.value = mcause;
    this.mtval.value = mtval;

    this.state.value = TrapState.SetCSRJump;
  }

  trapReturn() {
    this.state.value = TrapState.ReturnFromTrap;
  }

  compute() {
    switch (this.state.value) {
      case TrapState.Idle: {
        // Do nothing
        return;
      }

      case TrapState.SetCSRJump: {
        this.csr.mepc = this.mepc.value;
        this.csr.mcause = this.mcause.value;
        this.csr.mtval = this.mtval.value;

        const index = this.mcause.value & 0x7fff_ffff;
        const isInterrupt = this.mcause.value & 0x8000_0000;
        const offset = isInterrupt ? 0 : 48;

        const addr = (this.csr.mtvec & 0xfffffffc) + offset + (index << 2);

        this.setPc(addr);
        this.returnToPipelineMode();

        this.state.value = TrapState.Idle;

        return;
      }

      case TrapState.SetPc: {
        this.setPc(this.pcToSet.value);
        this.returnToPipelineMode();
        this.state.value = TrapState.Idle;
        return;
      }

      case TrapState.ReturnFromTrap: {
        this.pcToSet.value = this.csr.mepc;
        this.state.value = TrapState.SetPc;
        return;
      }
    }
  }

  latchNext() {
    this.regs.latchNext();
  }
}

