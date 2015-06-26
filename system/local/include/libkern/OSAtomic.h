#ifndef __OSAtomic
#define __OSAtomic

#include <stdbool.h>
#include <stdint.h>

static __inline bool OSAtomicCompareAndSwapLong(long oldl, long newl, long volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldl, newl);
}

static __inline bool OSAtomicCompareAndSwapPtr(void *oldp, void *newp, void * volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldp, newp);
}

static __inline bool OSAtomicCompareAndSwapPtrBarrier(void *oldp, void *newp, void * volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldp, newp);
}

static __inline bool OSAtomicCompareAndSwap32Barrier(int32_t oldl, int32_t newl, int32_t volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldl, newl);
}

static __inline int32_t OSAtomicDecrement32(volatile int32_t *dst)
{
  return __sync_sub_and_fetch(dst, 1);
}

static __inline int32_t OSAtomicDecrement32Barrier(volatile int32_t *dst)
{
  return __sync_sub_and_fetch(dst, 1);
}

static __inline int32_t OSAtomicIncrement32(volatile int32_t *dst)
{
  return __sync_add_and_fetch(dst, 1);
}

static __inline int32_t OSAtomicIncrement32Barrier(volatile int32_t *dst)
{
  return __sync_add_and_fetch(dst, 1);
}

static __inline int32_t OSAtomicOr32(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_or_and_fetch(theValue, theMask);
}

static __inline int32_t OSAtomicOr32Barrier(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_or_and_fetch(theValue, theMask);
}

static __inline int32_t OSAtomicXor32(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_xor_and_fetch(theValue, theMask);
}

static __inline int32_t OSAtomicXor32Barrier(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_xor_and_fetch(theValue, theMask);
}

static __inline void OSMemoryBarrier() {
	    __sync_synchronize();
}

#include <unistd.h>

typedef int32_t OSSpinLock;
#define OS_SPINLOCK_INIT 0

static inline void OSSpinLockLock(volatile OSSpinLock *lock) {
	while (__sync_val_compare_and_swap(lock, 0, ~0) != 0) {
		sleep(0);
	}
}

static inline void OSSpinLockUnlock(volatile OSSpinLock *lock) {
	__sync_synchronize();
	*lock = 0;
}

static inline bool OSSpinLockTry(volatile OSSpinLock *lock) {
	return (__sync_val_compare_and_swap(lock, 0, ~0) == 0);
}

#endif
