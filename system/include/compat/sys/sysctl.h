#ifndef	_SYS_SYSCTL_H
#define	_SYS_SYSCTL_H

#ifdef __cplusplus
extern "C" {
#endif

#define __NEED_size_t
#include <bits/alltypes.h>

#define CTL_KERN 1
#define KERN_BOOTTIME 1

int sysctl (int *, int, void *, size_t *, void *, size_t);
int sysctlbyname(const char *name, void *oldp, size_t *oldlenp, void *newp, size_t newlen);

#ifdef __cplusplus
}
#endif

#endif
