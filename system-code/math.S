# Basic math functions
.globl __mulsi3
__mulsi3:
  mv	a2,a0
  li	a0,0
  andi	a3,a1,1
  beqz	a3,__mulsi3+0x14
  add	a0,a0,a2
  srli	a1,a1,0x1
  slli	a2,a2,0x1
  bnez	a1,__mulsi3+0x8
  ret

.globl __divsi3
__divsi3:
  bltz	a0,__umodsi3+0x10
  bltz	a1,__umodsi3+0x20

.globl __udivsi3
__udivsi3:
  mv	a2,a1
  mv	a1,a0
  li	a0,-1
  beqz	a2,__udivsi3+0x44
  li	a3,1
  bgeu	a2,a1,__udivsi3+0x28
  blez	a2,__udivsi3+0x28
  slli	a2,a2,0x1
  slli	a3,a3,0x1
  bltu	a2,a1,__udivsi3+0x18
  li	a0,0
  bltu	a1,a2,__udivsi3+0x38
  sub	a1,a1,a2
  or	a0,a0,a3
  srli	a3,a3,0x1
  srli	a2,a2,0x1
  bnez	a3,__udivsi3+0x2c
  ret

.globl __umodsi3
__umodsi3:
  mv	t0,ra
  jal	ra,__udivsi3
  mv	a0,a1
  jr	t0
  neg	a0,a0
  bgez	a1,__umodsi3+0x24
  neg	a1,a1
  j	__udivsi3
  neg	a1,a1
  mv	t0,ra
  jal	ra,__udivsi3
  neg	a0,a0
  jr	t0

.globl __modsi3
__modsi3:
  mv	t0,ra
  bltz	a1,__modsi3+0x18
  bltz	a0,__modsi3+0x20
  jal	ra,__udivsi3
  mv	a0,a1
  jr	t0
  neg	a1,a1
  bgez	a0,__modsi3+0xc
  neg	a0,a0
  jal	ra,__udivsi3
  neg	a0,a1
  jr	t0
