#ifndef SILICA_ISR_H
#define SILICA_ISR_H

typedef void (*ISRFunction)(void);

#define ISR(ISR_TYPE) void __attribute__((interrupt)) ISR_TYPE(void)
#define VECTOR_TABLE(NAME) static const ISRFunction NAME[] __attribute__((section (".vectortable"))) =

#define ISR_U_SOFTWARE_INT                vector_int_0
#define ISR_S_SOFTWARE_INT                vector_int_1
#define ISR_M_SOFTWARE_INT                vector_int_3
#define ISR_U_TIMER_INT                   vector_int_4
#define ISR_S_TIMER_INT                   vector_int_5
#define ISR_M_TIMER_INT                   vector_int_7
#define ISR_U_EXTERNAL_INT                vector_int_8
#define ISR_S_EXTERNAL_INT                vector_int_9
#define ISR_M_EXTERNAL_INT                vector_int_11
#define ISR_INSTRUCTION_MISALIGNED        vector_ex_0
#define ISR_INSTRUCTION_ACCESS_FAULT      vector_ex_1
#define ISR_ILLEGAL_INSTRUCTION           vector_ex_2
#define ISR_BREAKPOINT                    vector_ex_3
#define ISR_LOAD_ADDRESS_MISALIGNED       vector_ex_4
#define ISR_LOAD_ACCESS_FAULT             vector_ex_5
#define ISR_STORE_AMO_ADDRESS_MISALIGNED  vector_ex_6
#define ISR_STORE_AMO_ACCESS_FAULT        vector_ex_7
#define ISR_ENVIRONMENT_CALL_FROM_U_MODE  vector_ex_8
#define ISR_ENVIRONMENT_CALL_FROM_S_MODE  vector_ex_9
#define ISR_ENVIRONMENT_CALL_FROM_M_MODE  vector_ex_11

#endif