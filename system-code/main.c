#define WRITE_TO(addr, value) (*((volatile unsigned int*)(addr)) = value)
#define RAM_START 0x20000000

int main() {
  int a = 10;

  while (a) {
    a--;
  }

  // Loop forever
  while (1) {}

  return 0;
}
