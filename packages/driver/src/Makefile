LUA_SRC=../lua

CFLAGS=-O3 -flto -I$(LUA_SRC) -Wall $(SYSCFLAGS) $(MYCFLAGS)
LDFLAGS=-O3 -flto

LIBS= $(SYSLIBS) $(MYLIBS)

LUA_A= $(LUA_SRC)/liblua.a

LIB_O=

BINARY_T=driver.mjs
BINARY_O=driver.o
BINARY_ARGS=-s WASM -s MODULARIZE

BINARY_FILES=driver.wasm $(BINARY_T)

ALL_O= $(LIB_O) $(BINARY_O)
ALL_T= $(BINARY_T)

default: all

all: $(ALL_T)

o: $(ALL_O)

$(BINARY_T): $(LUA_A) $(ALL_O)
	$(CC)  -o $@ $(LDFLAGS) $(LIB_O) $(BINARY_O) $(LUA_A) $(LIBS) $(BINARY_ARGS)
