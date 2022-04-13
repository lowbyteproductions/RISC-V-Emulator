/* Based on https://github.com/xenowing/xenowing/blob/master/sw/program/link.ld */

OUTPUT_ARCH("riscv")
ENTRY(_start)

/*
    Need to place a symbol at the end of the ROM
    Then in the bootloader, the memcopy needs to loop from the beginning of bss to the end
*/

PROVIDE(_max_program_size = 1m);

MEMORY
{
    PROGRAM_ROM (rx)  : ORIGIN = 0x10000000, LENGTH = 0x100000
    RAM         (rwx) : ORIGIN = 0x20000000, LENGTH = 0x400000
}

REGION_ALIAS("REGION_VECTOR", PROGRAM_ROM);
REGION_ALIAS("REGION_TEXT", PROGRAM_ROM);
REGION_ALIAS("REGION_RODATA", PROGRAM_ROM);
REGION_ALIAS("REGION_DATA", RAM);
REGION_ALIAS("REGION_BSS", RAM);
REGION_ALIAS("REGION_STACK", RAM);

PROVIDE(_stext = ORIGIN(REGION_TEXT));
PROVIDE(_stack_start = ORIGIN(RAM) + LENGTH(REGION_STACK) - 1);
PROVIDE(_stack_size = 8k);

SECTIONS
{
    .text _stext : ALIGN(4)
    {
        /* Vector Table */
        _svector = .;
        *(.vectortable .vectortable.*);
        _evector = .;

        KEEP(*(.init));
        /* Code */
        *(.text .text.*);

        /* Pack .rodata in boot ROM as well as .text as it's read-only */
        _srodata = .;
        *(.srodata .srodata.*);
        *(.rodata .rodata.*);
        _erodata = .;
        _program_end = .;
    } > REGION_TEXT

    .data :/* ALIGN(4) */
    {
        /* This should get set in the bootlaoder. Points to RAM + 2K, which is the range of immediates */
        PROVIDE( __global_pointer$ = . + (4K / 2) );

        _sdata = .;
        *(.sdata .sdata.* .sdata2 .sdata2.*);
        *(.data .data.*);

        . = ALIGN(4);
        _edata = .;
    } > REGION_DATA

    .bss (NOLOAD) :
    {
        . = ALIGN(4);
        _sbss = .;
        *(.sbss .sbss.* .bss .bss.*);
        . = ALIGN(4);
        _ebss = .;
    } > REGION_BSS
}
