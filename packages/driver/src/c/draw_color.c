#include "draw_color.h"

static const DrawColor indexed_colors[10] = {
    {0.0f, 0.0f, 0.0f, 1.0f},
    {1.0f, 0.0f, 0.0f, 1.0f},
    {0.0f, 1.0f, 0.0f, 1.0f},
    {0.0f, 0.0f, 1.0f, 1.0f},
    {1.0f, 1.0f, 0.0f, 1.0f},
    {1.0f, 0.0f, 1.0f, 1.0f},
    {0.0f, 1.0f, 1.0f, 1.0f},
    {1.0f, 1.0f, 1.0f, 1.0f},
    {0.7f, 0.7f, 0.7f, 1.0f},
    {0.4f, 0.4f, 0.4f, 1.0f},
};

static int hex_value(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    return -1;
}

static bool draw_color_read_escape_bounded(const char *text, size_t length, DrawColor *color) {
    if (length < 2 || text[0] != '^') return false;
    if (text[1] >= '0' && text[1] <= '9') {
        *color = indexed_colors[text[1] - '0'];
        return true;
    }
    if ((text[1] != 'x' && text[1] != 'X') || length < 8) return false;

    int hex[6];
    for (int i = 0; i < 6; i++) {
        hex[i] = hex_value(text[i + 2]);
        if (hex[i] < 0) return false;
    }
    color->r = ((hex[0] << 4) | hex[1]) / 255.0f;
    color->g = ((hex[2] << 4) | hex[3]) / 255.0f;
    color->b = ((hex[4] << 4) | hex[5]) / 255.0f;
    color->a = 1.0f;
    return true;
}

bool draw_color_read_escape(const char *text, DrawColor *color) {
    size_t length = 0;
    while (text[length]) length++;
    return draw_color_read_escape_bounded(text, length, color);
}

bool draw_color_read_last_escape(const char *text, size_t length, DrawColor *color) {
    bool found = false;
    for (size_t i = 0; i < length; i++) {
        DrawColor candidate;
        if (draw_color_read_escape_bounded(text + i, length - i, &candidate)) {
            *color = candidate;
            found = true;
        }
    }
    return found;
}
