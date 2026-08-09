#include "byte_buffer.h"

#include <stdlib.h>
#include <string.h>

void byte_buffer_append(ByteBuffer *buffer, const void *data, size_t size) {
    if (buffer->size + size > buffer->capacity) {
        buffer->capacity = buffer->size + (size > 65536 ? size : 65536);
        buffer->data = realloc(buffer->data, buffer->capacity);
    }
    memcpy(buffer->data + buffer->size, data, size);
    buffer->size += size;
}

void byte_buffer_free(ByteBuffer *buffer) {
    free(buffer->data);
    *buffer = (ByteBuffer){0};
}
