#include "lobject.h"

/* Fail the production build as well as tests if the compact ABI changes. */
#ifdef LUA_NANTRICK
_Static_assert(sizeof(void *) == 4, "Compact Lua values require 32-bit pointers");
_Static_assert(sizeof(int) == 4 && sizeof(double) == 8, "Compact Lua values require 32-bit tags and doubles");
_Static_assert(LUA_IEEEENDIAN == 0, "The wasm32 compact layout requires little-endian doubles");
_Static_assert(sizeof(TValue) == 8, "Compact Lua values must occupy 8 bytes");
#endif
