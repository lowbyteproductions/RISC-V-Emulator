#include "isr.h"

void __attribute__((interrupt)) __defaultISR(void) {}

VECTOR_TABLE(vectorTable) {
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR,
  &__defaultISR
};
