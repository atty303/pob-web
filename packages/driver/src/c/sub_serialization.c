#include "sub_serialization.h"

#include <stdlib.h>
#include <string.h>

size_t serialize(DataItem *data, size_t count, unsigned char **buffer) {
    size_t totalSize = sizeof(size_t);
    for (size_t i = 0; i < count; ++i) {
        totalSize += sizeof(DataType);
        switch (data[i].type) {
            case TYPE_DOUBLE:
                totalSize += sizeof(double);
                break;
            case TYPE_BOOLEAN:
                totalSize += sizeof(int);
                break;
            case TYPE_STRING:
                totalSize += sizeof(size_t) + (data[i].value.stringValue ? strlen(data[i].value.stringValue) + 1 : 0);
                break;
        }
    }

    *buffer = malloc(totalSize);
    unsigned char *ptr = *buffer;

    memcpy(ptr, &count, sizeof(size_t));
    ptr += sizeof(size_t);

    for (size_t i = 0; i < count; ++i) {
        memcpy(ptr, &data[i].type, sizeof(DataType));
        ptr += sizeof(DataType);
        switch (data[i].type) {
            case TYPE_DOUBLE:
                memcpy(ptr, &data[i].value.doubleValue, sizeof(double));
                ptr += sizeof(double);
                break;
            case TYPE_BOOLEAN:
                memcpy(ptr, &data[i].value.intValue, sizeof(int));
                ptr += sizeof(int);
                break;
            case TYPE_STRING: {
                size_t stringLen = data[i].value.stringValue ? strlen(data[i].value.stringValue) + 1 : 0;
                memcpy(ptr, &stringLen, sizeof(size_t));
                ptr += sizeof(size_t);
                if (stringLen > 0) {
                    memcpy(ptr, data[i].value.stringValue, stringLen);
                    ptr += stringLen;
                }
                break;
            }
        }
    }

    return totalSize;
}

DataItem *deserialize(const unsigned char *buffer, int *count) {
    const unsigned char *ptr = buffer;

    memcpy(count, ptr, sizeof(int));
    ptr += sizeof(int);

    DataItem *data = malloc(*count * sizeof(DataItem));
    for (int i = 0; i < *count; ++i) {
        memcpy(&data[i].type, ptr, sizeof(DataType));
        ptr += sizeof(DataType);
        switch (data[i].type) {
            case TYPE_DOUBLE:
                memcpy(&data[i].value.doubleValue, ptr, sizeof(double));
                ptr += sizeof(double);
                break;
            case TYPE_BOOLEAN:
                memcpy(&data[i].value.intValue, ptr, sizeof(int));
                ptr += sizeof(int);
                break;
            case TYPE_STRING: {
                size_t stringLen;
                memcpy(&stringLen, ptr, sizeof(size_t));
                ptr += sizeof(size_t);
                if (stringLen > 0) {
                    data[i].value.stringValue = malloc(stringLen);
                    memcpy((void *)data[i].value.stringValue, ptr, stringLen);
                    ptr += stringLen;
                } else {
                    data[i].value.stringValue = NULL;
                }
                break;
            }
        }
    }

    return data;
}

void free_deserialized_data(DataItem *data, int count) {
    for (int i = 0; i < count; ++i) {
        if (data[i].type == TYPE_STRING) {
            free((void *)data[i].value.stringValue);
        }
    }
    free(data);
}
