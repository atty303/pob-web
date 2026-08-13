#pragma once

#include <stdbool.h>

void dpi_render_init(const char *mode);
bool dpi_is_aware(void);
double dpi_get_scale(double system_scale);
void dpi_set_override_percent(int percent);
int dpi_get_override_percent(void);
double dpi_scale_coordinate(double value, double system_scale);
int dpi_round_coordinate(double value, double system_scale);
int dpi_ceil_extent(double value, double system_scale);
int dpi_scale_font_height(double height, double system_scale);
int dpi_cursor_coordinate(double css_coordinate, double system_scale);
