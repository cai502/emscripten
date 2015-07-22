#import <Foundation/NSObject.h>

@interface EAGLSharegroup : NSObject
@end
@interface EAGLContext : NSObject
+(EAGLContext*) currentContext;
@end

typedef NS_ENUM(NSUInteger, EAGLRenderingAPI) {
    kEAGLRenderingAPIOpenGLES1         = 1,
    kEAGLRenderingAPIOpenGLES2         = 2,
    kEAGLRenderingAPIOpenGLES3         = 3,
};
