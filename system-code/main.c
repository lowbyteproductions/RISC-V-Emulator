#define WRITE_TO(addr, value) (*((volatile unsigned int*)(addr)) = value)
#define RAM_START 0x20000000

const unsigned int someGlobal[] = {1, 2, 3, 4, 5};

int fortyTwoWithSideEffects() {
  WRITE_TO(RAM_START, 0x30040f00);

  return 42;
}

int main() {
  int result = fortyTwoWithSideEffects();
  WRITE_TO(RAM_START + 0x04, result + someGlobal[1]);

  // Loop forever
  while (1) {}

  return 0;
}
