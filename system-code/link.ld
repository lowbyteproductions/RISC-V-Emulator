/* Based on https://github.com/xenowing/xenowing/blob/master/sw/program/link.ld */

OUTPUT_ARCH("riscv")
ENTRY(_start)

PROVIDE(_max_program_size = 1m);

MEMORY
{
    PROGRAM_ROM (!r) : ORIGIN = 0x10000000, LENGTH = 0x100000
    RAM         (!r) : ORIGIN = 0x20000000, LENGTH = 0x400000
}

REGION_ALIAS("REGION_TEXT", PROGRAM_ROM);
REGION_ALIAS("REGION_RODATA", PROGRAM_ROM);
REGION_ALIAS("REGION_DATA", RAM);
REGION_ALIAS("REGION_BSS", RAM);
REGION_ALIAS("REGION_HEAP", RAM);
REGION_ALIAS("REGION_STACK", RAM);

PROVIDE(_stext = ORIGIN(REGION_TEXT));
PROVIDE(_stack_start = ORIGIN(REGION_STACK) + LENGTH(REGION_STACK));
PROVIDE(_stack_size = 8k);
PROVIDE(_heap_end = ORIGIN(REGION_HEAP) + LENGTH(REGION_HEAP) - _stack_size);

PROVIDE(_sprogram = ORIGIN(PROGRAM_RAM));
PROVIDE(_eprogram = ORIGIN(PROGRAM_RAM) + LENGTH(PROGRAM_RAM));

SECTIONS
{
    .text _stext :
    {
        KEEP(*(.init));
        *(.text .text.*);

        /* Pack .rodata in boot ROM as well as .text as it's read-only */
        *(.srodata .srodata.*);
        *(.rodata .rodata.*);
    } > REGION_TEXT


    .data : ALIGN(4)
    {
        _sidata = LOADADDR(.data);
        _sdata = .;
        *(.sdata .sdata.* .sdata2 .sdata2.*);
        *(.data .data.*);
        . = ALIGN(4);
        _edata = .;
    } > REGION_DATA AT > REGION_RODATA

    .bss (NOLOAD) :
    {
        _sbss = .;
        *(.sbss .sbss.* .bss .bss.*);
        . = ALIGN(4);
        _ebss = .;
    } > REGION_BSS
}
