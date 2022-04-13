#include "stdint.h"

#define WRITE_TO(addr, value) (*((volatile uint32_t*)(addr)) = (value))
#define RAM_START 0x20000000

uint32_t otherGlobal = 42;


void __attribute__((interrupt)) defaultHandler(void) {
  otherGlobal = 2;
}

int main() {
  int result;
  asm("rdcycle %0" : "=r"(result));

  WRITE_TO(RAM_START + 0x100, otherGlobal);

  // Loop forever
  while (1) {}

  return 0;
}
