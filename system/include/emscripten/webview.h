extern int iframe_create(void);
extern void iframe_destroy(int id);
extern void iframe_setVisible(int id, int visible);
extern void iframe_setFrame(int id, int left, int top, int width, int height);
extern void iframe_loadUrl(int id, const char* url);
extern void iframe_loadString(int id, const char* str);
extern void iframe_stopLoading(int id);
extern void iframe_reload(int id);
extern void iframe_goBack(int id);
extern void iframe_goForward(int id);
extern char* iframe_evalJs(int id, const char* script);
