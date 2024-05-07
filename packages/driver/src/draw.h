#ifndef DRIVER_DRAW_H
#define DRIVER_DRAW_H

extern void draw_begin();
extern void draw_get_buffer(void **data, size_t *size);
extern void draw_end();
extern void draw_set_color(float r, float g, float b, float a);
extern void draw_image(int image_handle, float x, float y, float w, float h);

#endif //DRIVER_DRAW_H
