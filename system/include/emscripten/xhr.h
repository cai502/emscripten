extern int _xhr_create(void);
extern void _xhr_open(int xhr, const char *method, const char *url, int async, const char *user, const char *password);
extern void _xhr_clean(int xhr);
extern void _xhr_set_onload(int xhr, dispatch_queue_t queue, void *ctx, void func(void*));
extern void _xhr_set_onerror(int xhr, dispatch_queue_t queue, void *ctx, void func(void*));
extern void _xhr_set_request_header(int xhr, const char *key, const char *value);
extern void _xhr_send(int xhr, const char *data, int length);
extern int _xhr_get_ready_state(int xhr);
extern int _xhr_get_status(int xhr);
extern int _xhr_get_status_text(int xhr, void **text); // return length, text needs to be freed by caller 
extern int _xhr_get_response_text(int xhr, void **data); // return length, data needs to be freed by caller
extern int _xhr_get_all_response_headers(int xhr, void **data); // return length, data needs to be freed by caller
