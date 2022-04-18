#include "isr.h"
#include "stdint.h"

ISR(__defaultISR) {}

VECTOR_TABLE(vectorTable) {
  &__defaultISR, /* UserSoftwareInterrupt */
  &__defaultISR, /* SupervisorSoftwareInterrupt */
  &__defaultISR, /* Reserved0 */
  &__defaultISR, /* MachineSoftwareInterrupt */
  &__defaultISR, /* UserTimerInterrupt */
  &__defaultISR, /* SupervisorTimerInterrupt */
  &__defaultISR, /* Reserved1 */
  &__defaultISR, /* MachineTimerInterrupt */
  &__defaultISR, /* UserExternalInterrupt */
  &__defaultISR, /* SupervisorExternalInterrupt */
  &__defaultISR, /* Reserved2 */
  &__defaultISR, /* MachineExternalInterrupt */
  &__defaultISR, /* InstructionAddressMisaligned */
  &__defaultISR, /* InstructionAccessFault */
  &__defaultISR, /* IllegalInstruction */
  &__defaultISR, /* Breakpoint */
  &__defaultISR, /* LoadAddressMisaligned */
  &__defaultISR, /* LoadAccessFault */
  &__defaultISR, /* StoreAMOAddressMisaligned */
  &__defaultISR, /* StoreAMOAccessFault */
  &__defaultISR, /* EnvironmentCallFromUMode */
  &__defaultISR, /* EnvironmentCallFromSMode */
  &__defaultISR, /* Reserved3 */
  &__defaultISR, /* EnvironmentCallFromMMode */
  &__defaultISR, /* InstructionPageFault */
  &__defaultISR, /* LoadPageFault */
  &__defaultISR, /* Reserved4 */
  &__defaultISR, /* StoreAMOPageFault */
};
