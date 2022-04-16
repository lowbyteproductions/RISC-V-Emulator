# Memory Map

0000_0000 - 0fff_ffff: Unused
1000_0000 - 1fff_ffff: Program ROM (mirrored)
2000_0000 - 2fff_ffff: Program RAM (mirrored)
3000_0000 - 3fff_ffff: Memory mapped control registers

## Trap Vector Table

1000_0000: Interrupt Table
1000_002c: Exception Table
1000_0058: End of Table

(see Privileged spec p37)

## Control Registers

3000_0000: mtime low
3000_0004: mtime high
3000_0008: mtimecmp low
3000_000c: mtimecmp high
