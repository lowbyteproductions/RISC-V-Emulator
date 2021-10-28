#!/usr/bin/zsh

riscv32-unknown-elf-gcc -T link.ld -nostdlib bootloader.S main.c -o main
riscv32-unknown-elf-objcopy -O binary -j .text main main.bin
