#include "isr.h"

ISR(__defaultISR) {}

VECTOR_TABLE(vectorTable) {
  &__defaultISR, /* ISR_U_SOFTWARE_INT */
  &__defaultISR, /* ISR_S_SOFTWARE_INT */
  &__defaultISR, /* ISR_M_SOFTWARE_INT */
  &__defaultISR, /* ISR_U_TIMER_INT */
  &__defaultISR, /* ISR_S_TIMER_INT */
  &__defaultISR, /* ISR_M_TIMER_INT */
  &__defaultISR, /* ISR_U_EXTERNAL_INT */
  &__defaultISR, /* ISR_S_EXTERNAL_INT */
  &__defaultISR, /* ISR_M_EXTERNAL_INT */
  &__defaultISR, /* ISR_INSTRUCTION_MISALIGNED */
  &__defaultISR, /* ISR_INSTRUCTION_ACCESS_FAULT */
  &__defaultISR, /* ISR_ILLEGAL_INSTRUCTION */
  &__defaultISR, /* ISR_BREAKPOINT */
  &__defaultISR, /* ISR_LOAD_ADDRESS_MISALIGNED */
  &__defaultISR, /* ISR_LOAD_ACCESS_FAULT */
  &__defaultISR, /* ISR_STORE_AMO_ADDRESS_MISALIGNED */
  &__defaultISR, /* ISR_STORE_AMO_ACCESS_FAULT */
  &__defaultISR, /* ISR_ENVIRONMENT_CALL_FROM_U_MODE */
  &__defaultISR, /* ISR_ENVIRONMENT_CALL_FROM_S_MODE */
  &__defaultISR, /* ISR_ENVIRONMENT_CALL_FROM_M_MODE */
};
