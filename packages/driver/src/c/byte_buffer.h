#ifndef DRIVER_BYTE_BUFFER_H
#define DRIVER_BYTE_BUFFER_H

#include <stddef.h>
#include <stdint.h>

typedef struct {
    uint8_t *data;
    size_t size;
    size_t capacity;
} ByteBuffer;

void byte_buffer_append(ByteBuffer *buffer, const void *data, size_t size);
void byte_buffer_free(ByteBuffer *buffer);

#endif
