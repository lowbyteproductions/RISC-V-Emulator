.globl _start

_start:
  # Set stack pointer to 0x203ffffc
  lui  sp, 0x20400
  addi sp, sp, -4

  # Jump to the main program
  j main
