CC=riscv32-unknown-elf-gcc
OBJCOPY=riscv32-unknown-elf-objcopy

CFLAGS=-nostdlib
OBJCOPY_FLAGS=-O binary -j .text

LINKER_FLAGS=-T
LINKER_SCRIPT=link.ld
BOOTLOADER=bootloader.S
MATH_LIB=#math.S
PROGRAM=main.c

CODE_FILES=$(BOOTLOADER) $(MATH_LIB) $(PROGRAM)

all: main.bin

main.o: $(LINKER_SCRIPT) $(CODE_FILES)
ifeq (${NO_LINKER},true)
	$(CC) $(PROGRAM) -o $@
else
	$(CC) $(LINKER_FLAGS) $(LINKER_SCRIPT) $(CFLAGS) $(CODE_FILES) -o $@
endif

main.bin: main.o
	$(OBJCOPY) $(OBJCOPY_FLAGS) $? $@

.PHONY: clean
clean:
	rm -f *.o *.bin

