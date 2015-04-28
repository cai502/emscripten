#ifndef __OSAtomic
#define __OSAtomic

__inline BOOL OSAtomicCompareAndSwapLong(long oldl, long newl, long volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldl, newl);
}

__inline BOOL OSAtomicCompareAndSwapPtr(void *oldp, void *newp, void * volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldp, newp);
}

__inline BOOL OSAtomicCompareAndSwapPtrBarrier(void *oldp, void *newp, void * volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldp, newp);
}

__inline BOOL OSAtomicCompareAndSwap32Barrier(int32_t oldl, int32_t newl, int32_t volatile *dst)
{
  return __sync_bool_compare_and_swap(dst, oldl, newl);
}

__inline int32_t OSAtomicDecrement32(volatile int32_t *dst)
{
  return __sync_fetch_and_sub(dst, 1);
}

__inline int32_t OSAtomicDecrement32Barrier(volatile int32_t *dst)
{
  return __sync_fetch_and_sub(dst, 1);
}

__inline int32_t OSAtomicIncrement32(volatile int32_t *dst)
{
  return __sync_fetch_and_add(dst, 1);
}

__inline int32_t OSAtomicIncrement32Barrier(volatile int32_t *dst)
{
  return __sync_fetch_and_add(dst, 1);
}

__inline int32_t OSAtomicOr32(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_fetch_and_or(theValue, theMask);
}

__inline int32_t OSAtomicOr32Barrier(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_fetch_and_or(theValue, theMask);
}

__inline int32_t OSAtomicXor32(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_fetch_and_xor(theValue, theMask);
}

__inline int32_t OSAtomicXor32Barrier(uint32_t theMask, volatile uint32_t *theValue)
{
  return __sync_fetch_and_xor(theValue, theMask);
}

__inline void OSMemoryBarrier() {
	    __sync_synchronize();
}

#include <unistd.h>

typedef int32_t OSSpinLock;
#define OS_SPINLOCK_INIT 0

inline void OSSpinLockLock(volatile OSSpinLock *lock) {
	while (__sync_val_compare_and_swap(lock, 0, ~0) != 0) {
		sleep(0);
	}
}

inline void OSSpinLockUnlock(volatile OSSpinLock *lock) {
	__sync_synchronize();
	*lock = 0;
}

inline BOOL OSSpinLockTry(volatile OSSpinLock *lock) {
	return (__sync_val_compare_and_swap(lock, 0, ~0) == 0);
}

#endif
