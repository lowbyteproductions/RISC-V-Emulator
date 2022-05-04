# Episode 11: The last instructions!

*Goals*:

- **Implement** The rest of the remaining instructions
- **Configure** The `mstatus` register correctly
- **Implement** A reset mechanism
- **Maybe** The rest of the exception triggers?

## Follow up business

- bootloader.S -> crt0.S (88ba1fa)
  - https://en.wikipedia.org/wiki/Crt0

- Vector Table Simplification (dc4aae3)
  - Instead of being a table of addresses, it's now a table of jump instructions
  - This is more typical, but also allows for a simpler design
  - The Trap hardware no longer needs a reference to the system bus, and can get back to the pipeline sooner!

- Refactored the trap mechanism to use registers instead of function calls (91039ef)

## Agenda

- Build in a reset mechanism
  - Need it for all hardware modules, but especially for the pipeline
  - We should really bring the CPU up in a reset state, since that's the only true way to ensure all registers are really at their correct starting value
  - In the pipeline, we can use it prevent other branching conditions from affecting traps

- Take care of `mstatus`
  - Should begin in m-mode with the relevant bits set
  - Stack up the `xIE`/`xPIE` bits properly when entering/exiting a trap

- Implement `ECALL` and `EBREAK` instructions
  - These work pretty much the same as the exception handling for `Load Address Misaligned`
  - Both just cause exceptions to occur
  - For `EBREAK`, we can maybe set a flag in the RV32I class and go into step mode

- Implement `FENCE` as nop
  - Generic nop in the decode stage

- Implement more exception triggers?