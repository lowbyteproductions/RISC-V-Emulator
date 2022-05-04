#include "stdint.h"

#define WRITE_TO(addr, value) (*((volatile uint32_t*)(addr)) = (value))
#define RAM_START 0x20000000

uint32_t otherGlobal = 42;

int main() {
  WRITE_TO(RAM_START + 0x100, otherGlobal);

  asm("ecall");
  asm("ebreak");

  // Loop forever
  while (1) {}

  return 0;
}
