# Episode 10: Exceptional Trap Handling

*Goals*:

- **Build** the whole flow of the "Load address misaligned" trap

## Follow up business

- 0x10000000: j _start
  - git show 509785f
  - Even before the vector table, we need to ensure that the CPU knows where to find the code
  - This instruction should always be the first thing!

- Added some levelled-up debugging
  - git show 012d363
  - Disassembly now visible when stepping!
  - Comes directly from the ELF via objdump
  - Basically gained the ability to set breakpoints on functions for free

## Agenda

- Can detect in the memory access stage
- Stall (flush) the pipeline (set state to trap)

- Trap module reads pc, current instruction, cause
  - Sets those CSRs (directly)
  - Loads the jump address from the table
  - Sets the pc (plus 4 in this case)
  - Sets the state to fetch

- Implement the `mret` instruction
  - Recognise the pattern in decode stage
  - Signal to trap (transfers machine state to trap again)
  - Trap places `mepc` back in `pc`, resets pipeline

- In the handler
  - Disable interrupts
  - Save the context to the stack
  - Read mtval (instruction)
  - Determine what kind of read to do (16/32 bit)
  - Make the two reads
  - Determine which register to write to
  - Switch statement with asm blocks writing to the specified register
  - Enable interrupts
  - Return from interrupt
