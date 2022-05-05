################ Commands ###############
CC			= riscv32-unknown-elf-gcc
OBJCOPY	= riscv32-unknown-elf-objcopy
MKDIR		= mkdir -p

############## Directories ##############
BUILD_DIR	= build
OBJ_DIR		= obj
SRC_DIR		= src
INC_DIR		= inc

################# Flags #################
INCLUDE				=-I ./$(INC_DIR)
CFLAGS				=-g -ffreestanding -nostdlib
OBJCOPY_FLAGS	=-O binary
LINKER_FLAGS	=-T

################# Files #################
C_SRC_FILES 	=  $(wildcard $(SRC_DIR)/*.c)
ASM_SRC_FILES =  $(wildcard $(SRC_DIR)/*.S)
O_FILES 			:= $(patsubst %.c, %.o, $(C_SRC_FILES)) $(patsubst %.S, %.o, $(ASM_SRC_FILES))
O_FILES 			:= $(patsubst src/%, build/%, $(O_FILES))

LINKER_SCRIPT=link.ld

# all:
# 	echo $(O_FILES)
all: $(BUILD_DIR)/main.bin

$(BUILD_DIR)/main.bin : $(BUILD_DIR)/main.elf
	$(OBJCOPY) $(OBJCOPY_FLAGS) -j .text $? $(BUILD_DIR)/main.code
	$(OBJCOPY) $(OBJCOPY_FLAGS) -j .data $? $(BUILD_DIR)/main.data
	cat $(BUILD_DIR)/main.code $(BUILD_DIR)/main.data > $(BUILD_DIR)/main.bin

$(BUILD_DIR)/main.elf : $(O_FILES)
	$(CC) $(LINKER_FLAGS) $(LINKER_SCRIPT) $(CFLAGS) $^ -o $@

$(BUILD_DIR)/%.o : $(SRC_DIR)/%.c
	$(MKDIR) $(dir $@)
	$(CC) $(INCLUDE) -c $(CFLAGS) $< -o $@

$(BUILD_DIR)/%.o : $(SRC_DIR)/%.S
	$(MKDIR) $(dir $@)
	$(CC) $(INCLUDE) -c $(CFLAGS) $< -o $@

.PHONY: clean all
clean:
	rm -rf build/*
