#include "text_width_cache.h"

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#define BUCKET_COUNT 4096

typedef struct TextWidthEntry {
    struct TextWidthEntry *hash_next;
    struct TextWidthEntry *hash_previous;
    struct TextWidthEntry *newer;
    struct TextWidthEntry *older;
    size_t length;
    uint32_t hash;
    int height;
    int font;
    int width;
    char text[];
} TextWidthEntry;

static TextWidthEntry *buckets[BUCKET_COUNT];
static TextWidthEntry *newest;
static TextWidthEntry *oldest;
static TextWidthCacheProfile profile;

#ifdef DRIVER_TESTING
int text_width_cache_fail_allocation;
#endif

static uint32_t key_hash(int height, int font, const char *text) {
    uint32_t hash = 2166136261u;
    for (const unsigned char *p = (const unsigned char *)text; *p; p++) {
        hash = (hash ^ *p) * 16777619u;
    }
    hash = (hash ^ (uint32_t)height) * 16777619u;
    return (hash ^ (uint32_t)font) * 16777619u;
}

static void unlink_recency(TextWidthEntry *entry) {
    if (entry->newer) entry->newer->older = entry->older;
    else newest = entry->older;
    if (entry->older) entry->older->newer = entry->newer;
    else oldest = entry->newer;
}

static void make_newest(TextWidthEntry *entry) {
    entry->newer = NULL;
    entry->older = newest;
    if (newest) newest->newer = entry;
    else oldest = entry;
    newest = entry;
}

static void evict_oldest(void) {
    TextWidthEntry *entry = oldest;
    unlink_recency(entry);
    if (entry->hash_previous) entry->hash_previous->hash_next = entry->hash_next;
    else buckets[entry->hash & (BUCKET_COUNT - 1)] = entry->hash_next;
    if (entry->hash_next) entry->hash_next->hash_previous = entry->hash_previous;
    profile.entries--;
    profile.text_bytes -= entry->length + 1;
    profile.allocated_bytes -= sizeof(*entry) + entry->length + 1;
    profile.evictions++;
    free(entry);
}

void text_width_cache_reset(bool enabled) {
    while (oldest) evict_oldest();
    memset(buckets, 0, sizeof(buckets));
    profile = (TextWidthCacheProfile){.enabled = enabled};
}

bool text_width_cache_get(int height, int font, const char *text, int *width) {
    profile.calls++;
    // The renderer's CSS font size is height - 2. Tiny/invalid CSS sizes can
    // retain the prior Canvas font, so keep their original JS measurement path.
    if (!profile.enabled || !text || height <= 2) {
        profile.bypasses++;
        return false;
    }
    uint32_t hash = key_hash(height, font, text);
    for (TextWidthEntry *entry = buckets[hash & (BUCKET_COUNT - 1)]; entry; entry = entry->hash_next) {
        if (entry->hash == hash && entry->height == height && entry->font == font && strcmp(entry->text, text) == 0) {
            *width = entry->width;
            if (entry != newest) {
                unlink_recency(entry);
                make_newest(entry);
            }
            profile.hits++;
            return true;
        }
    }
    profile.misses++;
    return false;
}

void text_width_cache_put(int height, int font, const char *text, int width) {
    if (!profile.enabled || !text || height <= 2) return;
    size_t length = strlen(text);
    if (length >= TEXT_WIDTH_CACHE_MAX_TEXT_BYTES) {
        profile.bypasses++;
        return;
    }
    while (profile.entries >= TEXT_WIDTH_CACHE_MAX_ENTRIES ||
           profile.text_bytes > TEXT_WIDTH_CACHE_MAX_TEXT_BYTES - (length + 1)) {
        evict_oldest();
    }
#ifdef DRIVER_TESTING
    TextWidthEntry *entry = text_width_cache_fail_allocation ? NULL : malloc(sizeof(*entry) + length + 1);
#else
    TextWidthEntry *entry = malloc(sizeof(*entry) + length + 1);
#endif
    if (!entry) {
        profile.bypasses++;
        return;
    }
    entry->length = length;
    entry->hash = key_hash(height, font, text);
    entry->height = height;
    entry->font = font;
    entry->width = width;
    memcpy(entry->text, text, length + 1);
    size_t bucket = entry->hash & (BUCKET_COUNT - 1);
    entry->hash_next = buckets[bucket];
    entry->hash_previous = NULL;
    if (entry->hash_next) entry->hash_next->hash_previous = entry;
    buckets[bucket] = entry;
    make_newest(entry);
    profile.entries++;
    profile.text_bytes += length + 1;
    profile.allocated_bytes += sizeof(*entry) + length + 1;
}

TextWidthCacheProfile text_width_cache_profile(void) {
    TextWidthCacheProfile result = profile;
    result.allocated_bytes += sizeof(buckets);
    return result;
}
