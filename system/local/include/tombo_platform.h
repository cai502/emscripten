#if defined(A2O_EMSCRIPTEN)

extern char* getTomboApiServerUrl(void);
extern char* getUserJwt(void);

#else // for unit test

#include <string.h>

char* getTomboApiServerUrl(void)
{
    const char url[] = "https://api.tombo.io";
    return strncpy((char*)malloc(sizeof(url)), url, sizeof(url));
}

char* getUserJwt(void)
{
    const char jwt[] = "dummy_jwt";
    return strncpy((char*)malloc(sizeof(jwt)), jwt, sizeof(jwt));
}

#endif

static inline NSString* getTomboAPIServerUrlString(void)
{
    char* server = getTomboApiServerUrl();
    NSString *url = [NSString stringWithUTF8String:server];
    free(server);
    return url;
}

static inline NSString* getUserJwtString(void)
{
    char* server = getUserJwt();
    NSString *url = [NSString stringWithUTF8String:server];
    free(server);
    return url;
}
