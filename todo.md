# Episode 9: M-Mode & Privileged CSRs

Machine level CSRs (and context switching back in to the swing!)

*Goals*:

- **Understand**  the M-Mode CSRs and how they relate to traps
- **Understand**  what kind of code we need to write for the system in order to set everything up
- **Start**       with the first exception: Unaligned memory access

## Follow up business

- Added `AUIPC` Instruction (git show 1454ca3)
- Actually limit Register64 to 64-bit values
- Pass `pc` through every stage (so that we can actually track which instruction caused a fault)

- Worked on the C code setup for the system
  - Global variables can now be properly initialised at start up
  - Involves linker script, boot files in asm and C
  - A sketch of the vector table, which is integral to making traps work

## Agenda

- Look at the various M-Mode CSRs in the code and spec
  - Information about the CPU capabilities, manufacturer, version, etc
  - Various registers to hold data when interrupts or exceptions (traps) are taken
  - Some memory mapped registers for timers

- Take a look at how we're going to set up the vector table
  - Memory map
  - C code

- Start implementing and testing a trap!
  - Unaligned memory accesses
  - The first run will likely not be optimal, but let's just start somewhere!
