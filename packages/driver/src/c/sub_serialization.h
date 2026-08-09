#ifndef DRIVER_SUB_SERIALIZATION_H
#define DRIVER_SUB_SERIALIZATION_H

#include <stddef.h>

typedef enum {
    TYPE_DOUBLE,
    TYPE_BOOLEAN,
    TYPE_STRING
} DataType;

typedef union {
    double doubleValue;
    int intValue;
    const char *stringValue;
} DataValue;

typedef struct {
    DataType type;
    DataValue value;
} DataItem;

size_t serialize(DataItem *data, size_t count, unsigned char **buffer);
DataItem *deserialize(const unsigned char *buffer, int *count);
void free_deserialized_data(DataItem *data, int count);

#endif
