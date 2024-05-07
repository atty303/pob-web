#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "draw.h"

typedef enum {
    DRAW_IMAGE = 1,
} DrawCommandType;

#pragma pack(push, 1)

typedef struct {
    uint8_t type;
    int image_handle;
    float x, y, w, h;
} DrawImageCommand;

#pragma pack(pop)

typedef struct {
    uint8_t *data;
    size_t size;
    size_t capacity;
} Buffer;

static Buffer st_buffer = {0};

static void draw_push(const void *data, size_t size) {
    if (st_buffer.size + size > st_buffer.capacity) {
        st_buffer.capacity = st_buffer.size + 65536;
        st_buffer.data = realloc(st_buffer.data, st_buffer.capacity);
    }
    memcpy(st_buffer.data + st_buffer.size, data, size);
    st_buffer.size += size;
}

void draw_begin() {
    st_buffer.data = NULL;
    st_buffer.size = 0;
    st_buffer.capacity = 0;
}

void draw_get_buffer(void **data, size_t *size) {
    *data = st_buffer.data;
    *size = st_buffer.size;
}

void draw_end() {
    free(st_buffer.data);
    st_buffer.data = NULL;
}

void draw_image(int image_handle, float x, float y, float w, float h) {
    DrawImageCommand cmd = {DRAW_IMAGE, image_handle, x, y, w, h};
    draw_push(&cmd, sizeof(cmd));
}
