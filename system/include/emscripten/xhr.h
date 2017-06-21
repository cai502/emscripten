#include <dispatch/queue.h>

#if defined(__cplusplus)
#define XHR_EXTERN extern "C"
#else
#define XHR_EXTERN extern
#endif

XHR_EXTERN int _xhr_create(void);
XHR_EXTERN void _xhr_open(int xhr, const char *method, const char *url, int async, const char *user, const char *password);
XHR_EXTERN void _xhr_clean(int xhr);
XHR_EXTERN void _xhr_abort(int xhr);
XHR_EXTERN void _xhr_set_onload(int xhr, dispatch_queue_t queue, void *ctx, void func(void*));
XHR_EXTERN void _xhr_set_onerror(int xhr, dispatch_queue_t queue, void *ctx, void func(void*));
XHR_EXTERN void _xhr_set_request_header(int xhr, const char *key, const char *value);
XHR_EXTERN void _xhr_set_with_credentials(int xhr, int with_credentials);
XHR_EXTERN void _xhr_set_timeout(int xhr, int timeout);
XHR_EXTERN void _xhr_send(int xhr, const void *data, int length);
XHR_EXTERN int _xhr_get_ready_state(int xhr);
XHR_EXTERN int _xhr_get_status(int xhr);
XHR_EXTERN int _xhr_get_status_text(int xhr, void **text); // return length, text needs to be freed by caller
XHR_EXTERN int _xhr_get_response_text(int xhr, void **data); // return length, data needs to be freed by caller
XHR_EXTERN int _xhr_get_all_response_headers(int xhr, void **data); // return length, data needs to be freed by caller

#undef XHR_EXTERN
