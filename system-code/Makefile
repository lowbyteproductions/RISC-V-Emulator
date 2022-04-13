################ Commands ###############
CC=riscv32-unknown-elf-gcc
OBJCOPY=riscv32-unknown-elf-objcopy
MKDIR=mkdir -p

############## Directories ##############
BUILD_DIR=build
OBJ_DIR=obj
SRC_DIR=src
INC_DIR=inc

################# Flags #################
INCLUDE=-I ./$(INC_DIR)
CFLAGS=-ffreestanding -nostdlib
OBJCOPY_FLAGS=-O binary
LINKER_FLAGS=-T

################# Files #################
SRC_FILES=$(shell find $(SRC_DIR) -name *.c -or -name *.S | sed 's/src\///')
WO_EXT=$(basename $(SRC_FILES))
O_FILES=$(WO_EXT:%=$(BUILD_DIR)/%.o)

LINKER_SCRIPT=link.ld

all: $(BUILD_DIR)/main.bin

$(BUILD_DIR)/main.bin : $(BUILD_DIR)/main.elf
	$(OBJCOPY) $(OBJCOPY_FLAGS) -j .text $? $(BUILD_DIR)/main.code
	$(OBJCOPY) $(OBJCOPY_FLAGS) -j .data $? $(BUILD_DIR)/main.data
	cat $(BUILD_DIR)/main.code $(BUILD_DIR)/main.data > $(BUILD_DIR)/main.bin

$(BUILD_DIR)/main.elf : $(O_FILES)
	$(CC) $(LINKER_FLAGS) $(LINKER_SCRIPT) $(CFLAGS) $< -o $@

$(BUILD_DIR)/%.o : $(SRC_DIR)/$(SRC_FILES)
	$(MKDIR) $(dir $@)
	$(CC) $(INCLUDE) -c $(CCFLAGS) $< -o $@

.PHONY: clean all
clean:
	rm -rf build/*
