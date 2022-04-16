#include "stdint.h"

extern uint32_t _program_end;
extern uint32_t _sdata;
extern uint32_t _edata;

void _copy_initialised_vars() {
  uint32_t* romPtr = &_program_end;
  uint32_t* ramPtr = &_sdata;

  while (ramPtr < &_edata) {
    *ramPtr++ = *romPtr++;
  }
}
