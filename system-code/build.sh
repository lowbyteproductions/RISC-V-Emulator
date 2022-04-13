#!/usr/bin/env bash

set -eu

################ Commands ###############
CC=riscv32-unknown-elf-gcc
OBJCOPY=riscv32-unknown-elf-objcopy
MKDIR="mkdir -p"

############## Directories ##############
BUILD_DIR=build
OBJ_DIR=obj
SRC_DIR=src
INC_DIR=inc

################# Flags #################
INCLUDE="-I ./$INC_DIR"
CFLAGS="-ffreestanding -nostdlib"
OBJCOPY_FLAGS="-O binary"
LINKER_FLAGS=-T

################# Files #################
SRC_FILES=`find $SRC_DIR -name *.c -or -name *.S | sed 's/src\///'`
LINKER_SCRIPT=link.ld

$MKDIR build

for FILE in $SRC_FILES; do
  $CC $INCLUDE -c $CFLAGS $SRC_DIR/$FILE -o $BUILD_DIR/$FILE.o
done

$CC $LINKER_FLAGS $LINKER_SCRIPT $CFLAGS $BUILD_DIR/*.o -o $BUILD_DIR/main.elf

$OBJCOPY $OBJCOPY_FLAGS -j .text $BUILD_DIR/main.elf $BUILD_DIR/main.code
$OBJCOPY $OBJCOPY_FLAGS -j .data $BUILD_DIR/main.elf $BUILD_DIR/main.data
cat $BUILD_DIR/main.code $BUILD_DIR/main.data > $BUILD_DIR/main.bin
