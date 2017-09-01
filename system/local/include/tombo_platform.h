#if defined(A2O_EMSCRIPTEN)

extern char* getTomboApiServerUrl(void);
extern char* getUserJwt(void);
extern char* getApplicationId(void);

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
    char* chars = getTomboApiServerUrl();
    NSString *str = [NSString stringWithUTF8String:chars];
    free(chars);
    return str;
}

static inline NSString* getUserJwtString(void)
{
    char* chars = getUserJwt();
    NSString *str = [NSString stringWithUTF8String:chars];
    free(chars);
    return str;
}

static inline NSString* getApplicationIdString(void)
{
    char* chars = getApplicationId();
    NSString *str = [NSString stringWithUTF8String:chars];
    free(chars);
    return str;
}
