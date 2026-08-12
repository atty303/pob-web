#include "dpi.h"

#include <math.h>
#include <string.h>

static bool st_dpi_aware = false;
static int st_override_percent = 0;

void dpi_render_init(const char *mode) {
    st_dpi_aware = mode != NULL && strcmp(mode, "DPI_AWARE") == 0;
}

bool dpi_is_aware(void) {
    return st_dpi_aware;
}

double dpi_get_scale(double system_scale) {
    if (!st_dpi_aware) return 1.0;
    if (st_override_percent > 0) return st_override_percent / 100.0;
    return system_scale > 0 ? system_scale : 1.0;
}

void dpi_set_override_percent(int percent) {
    st_override_percent = percent;
}

int dpi_get_override_percent(void) {
    return st_override_percent;
}

double dpi_scale_coordinate(double value, double system_scale) {
    return value * dpi_get_scale(system_scale);
}

int dpi_round_coordinate(double value, double system_scale) {
    return (int)lround(dpi_scale_coordinate(value, system_scale));
}

int dpi_ceil_extent(double value, double system_scale) {
    return (int)ceil(dpi_scale_coordinate(value, system_scale));
}

int dpi_scale_font_height(double height, double system_scale) {
    double scale = dpi_get_scale(system_scale);
    int scaled = (int)lround(height * scale);
    if (scaled <= 1) return 1;
    if (scaled % 2 != 0) scaled++;
    return scaled;
}
