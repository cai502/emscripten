#include <sys/sysctl.h>
#include "syscall.h"
#include <assert.h>

int sysctl(int *name, int namelen, void *oldp, size_t *oldlenp, void *newp, size_t newlen)
{
    return syscall(SYS__sysctl, name, namelen, oldp, oldlenp, newp, newlen);
}

int sysctlbyname(const char *name, void *oldp, size_t *oldlenp, void *newp, size_t newlen)
{
    assert(0);
}
