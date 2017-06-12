#ifndef _MALLOC_MALLOC_H_
#define _MALLOC_MALLOC_H_

#include <stdlib.h>
#include <malloc.h>

#define PAGE_MAX_SIZE 4096

typedef void * malloc_zone_t;

static __inline malloc_zone_t malloc_default_zone(void) { return (malloc_zone_t)-1; }
static __inline void *malloc_zone_malloc(malloc_zone_t z, size_t size) { return malloc(size); }
static __inline void *malloc_zone_calloc(malloc_zone_t z, size_t size, size_t count) { return calloc(count, size); }
static __inline void *malloc_zone_realloc(malloc_zone_t z, void *p, size_t size) { return realloc(p, size); }
static __inline void malloc_zone_free(malloc_zone_t z, void *p) { free(p); }
static __inline malloc_zone_t malloc_zone_from_ptr(const void *p) { return (malloc_zone_t)-1; }
static __inline size_t malloc_size(const void *p) { return malloc_usable_size((void*)p); /* fixme invalid pointer check? */ }
static __inline void *malloc_zone_memalign(malloc_zone_t z, size_t size, size_t count) { return memalign(size, count); }

#endif
