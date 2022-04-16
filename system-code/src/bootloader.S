.globl _start

// Missing quite a bit here
_start:
  // Set stack pointer to 0x203ffffc
  lui  sp, 0x20400
  addi sp, sp, -4

  // Copy initialised globals to RAM
  call _copy_initialised_vars

  // Jump to the main program
_bootloader_jump:
  j main
