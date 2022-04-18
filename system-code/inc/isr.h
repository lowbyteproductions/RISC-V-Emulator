#ifndef SILICA_ISR_H
#define SILICA_ISR_H

typedef void (*ISRFunction)(void);

#define ISR(ISR_TYPE) void __attribute__((interrupt)) ISR_TYPE(void)
#define VECTOR_TABLE(NAME) static const ISRFunction NAME[] __attribute__((section (".vectortable"))) =

#define UserSoftwareInterrupt       vector_int_0
#define SupervisorSoftwareInterrupt vector_int_1
#define Reserved0                   vector_int_2
#define MachineSoftwareInterrupt    vector_int_3
#define UserTimerInterrupt          vector_int_4
#define SupervisorTimerInterrupt    vector_int_5
#define Reserved1                   vector_int_6
#define MachineTimerInterrupt       vector_int_7
#define UserExternalInterrupt       vector_int_8
#define SupervisorExternalInterrupt vector_int_9
#define Reserved2                   vector_int_10
#define MachineExternalInterrupt    vector_int_11
#define InstructionAddressMisaligned  vect_exc_0
#define InstructionAccessFault        vect_exc_1
#define IllegalInstruction            vect_exc_2
#define Breakpoint                    vect_exc_3
#define LoadAddressMisaligned         vect_exc_4
#define LoadAccessFault               vect_exc_5
#define StoreAMOAddressMisaligned     vect_exc_6
#define StoreAMOAccessFault           vect_exc_7
#define EnvironmentCallFromUMode      vect_exc_8
#define EnvironmentCallFromSMode      vect_exc_9
#define Reserved3                     vect_exc_10
#define EnvironmentCallFromMMode      vect_exc_11
#define InstructionPageFault          vect_exc_12
#define LoadPageFault                 vect_exc_13
#define Reserved4                     vect_exc_14
#define StoreAMOPageFault             vect_exc_15


#endif