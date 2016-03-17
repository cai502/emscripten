extern uint8_t *a2o_renderFontToBitmapBuffer(const char* fontName, int pointSize, const char* str, float a, float b, float c, float d, int *width, int *height, int *left, int *top);
extern void a2o_getFontMetrics(const char* fontName, int pointSize, int32_t *ascent, int32_t *descent, int32_t *capHeight, int32_t *xHeight);
extern int a2o_getTextWidth(const char* fontName,  int pointSize, const char* str);
extern int a2o_suggestLineBreak(const char* fontName,  int pointSize, const char* str, int start, float width);
