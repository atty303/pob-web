#ifndef DRIVER_DRAW_COLOR_H
#define DRIVER_DRAW_COLOR_H

#include <stdbool.h>
#include <stddef.h>

typedef struct {
    float r, g, b, a;
} DrawColor;

extern bool draw_color_read_escape(const char *text, DrawColor *color);
extern bool draw_color_read_last_escape(const char *text, size_t length, DrawColor *color);

#endif // DRIVER_DRAW_COLOR_H
