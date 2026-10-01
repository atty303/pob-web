#ifndef DRIVER_TEXT_WIDTH_CACHE_H
#define DRIVER_TEXT_WIDTH_CACHE_H

#include <stdbool.h>
#include <stddef.h>

#define TEXT_WIDTH_CACHE_MAX_ENTRIES 4096
#define TEXT_WIDTH_CACHE_MAX_TEXT_BYTES (1024 * 1024)

typedef struct {
    size_t calls;
    size_t hits;
    size_t misses;
    size_t bypasses;
    size_t evictions;
    size_t entries;
    size_t text_bytes;
    size_t allocated_bytes;
    bool enabled;
} TextWidthCacheProfile;

/* Keys own their bytes: Lua strings may be collected between frames. Widths
 * are integer physical-pixel results, before division by the current DPI scale.
 * Text deliberately ends at the first NUL, matching the existing JS bridge.
 * Heights <= 2 bypass caching: the renderer's height - 2 CSS font may be invalid
 * and leave Canvas measuring with its prior font. */
void text_width_cache_reset(bool enabled);
bool text_width_cache_get(int height, int font, const char *text, int *width);
/* Insert only after a get miss; one Lua worker executes these synchronously. */
void text_width_cache_put(int height, int font, const char *text, int width);
TextWidthCacheProfile text_width_cache_profile(void);

#ifdef DRIVER_TESTING
extern int text_width_cache_fail_allocation;
#endif

#endif
