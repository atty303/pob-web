#include "byte_buffer.h"
#include "draw_color.h"
#include "sub_serialization.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHECK(condition) \
    do { \
        if (!(condition)) { \
            fprintf(stderr, "CHECK failed: %s (%s:%d)\n", #condition, __FILE__, __LINE__); \
            exit(EXIT_FAILURE); \
        } \
    } while (0)

static void test_subscript_values_round_trip(void) {
    DataItem input[] = {
        {.type = TYPE_DOUBLE, .value.doubleValue = 123.5},
        {.type = TYPE_BOOLEAN, .value.intValue = 1},
        {.type = TYPE_STRING, .value.stringValue = "result"},
    };
    unsigned char *serialized;
    serialize(input, 3, &serialized);

    int count;
    DataItem *output = deserialize(serialized, &count);
    CHECK(count == 3);
    CHECK(output[0].type == TYPE_DOUBLE);
    CHECK(output[0].value.doubleValue == 123.5);
    CHECK(output[1].type == TYPE_BOOLEAN);
    CHECK(output[1].value.intValue == 1);
    CHECK(output[2].type == TYPE_STRING);
    CHECK(strcmp(output[2].value.stringValue, "result") == 0);

    free_deserialized_data(output, count);
    free(serialized);
}

static void test_large_buffer_append(void) {
    const size_t large_size = 65549;
    unsigned char *large = malloc(large_size);
    memset(large, 0x5a, large_size);
    const unsigned char suffix[] = {1, 2, 3, 4};
    ByteBuffer buffer = {0};

    byte_buffer_append(&buffer, large, large_size);
    byte_buffer_append(&buffer, suffix, sizeof(suffix));

    CHECK(buffer.size == large_size + sizeof(suffix));
    CHECK(buffer.capacity >= buffer.size);
    CHECK(memcmp(buffer.data, large, large_size) == 0);
    CHECK(memcmp(buffer.data + large_size, suffix, sizeof(suffix)) == 0);

    byte_buffer_free(&buffer);
    free(large);
}

static void check_color(DrawColor color, float r, float g, float b, float a) {
    CHECK(color.r == r);
    CHECK(color.g == g);
    CHECK(color.b == b);
    CHECK(color.a == a);
}

static void test_draw_color_escapes(void) {
    DrawColor color = {0};
    CHECK(draw_color_read_escape("^1", &color));
    check_color(color, 1.0f, 0.0f, 0.0f, 1.0f);
    CHECK(draw_color_read_escape("^xA1b2C3", &color));
    check_color(color, 161.0f / 255.0f, 178.0f / 255.0f, 195.0f / 255.0f, 1.0f);
    CHECK(draw_color_read_escape("^XA1B2C3", &color));
    CHECK(!draw_color_read_escape("^x12zz56", &color));
    CHECK(!draw_color_read_escape("plain", &color));

    color = (DrawColor){0};
    const char *text = "^1red ^x102030custom ^8gray";
    CHECK(draw_color_read_last_escape(text, strlen(text), &color));
    check_color(color, 0.7f, 0.7f, 0.7f, 1.0f);
    CHECK(!draw_color_read_last_escape("no escapes", 10, &color));
    CHECK(draw_color_read_last_escape("^1red^2", 5, &color));
    check_color(color, 1.0f, 0.0f, 0.0f, 1.0f);
}

int main(void) {
    test_subscript_values_round_trip();
    test_large_buffer_append();
    test_draw_color_escapes();
    return 0;
}
