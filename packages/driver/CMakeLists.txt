cmake_minimum_required(VERSION 3.28)

project("driver")

STRING (TOLOWER "${CMAKE_BUILD_TYPE}" CMAKE_BUILD_TYPE_LOWER)

option(POB_WASM_PROFILING "Keep Wasm function names and emit profiling symbols" OFF)

add_custom_command(
        OUTPUT ${CMAKE_BINARY_DIR}/boot.c
        COMMAND ${CMAKE_COMMAND} -E echo "Writing boot.lua to boot.c"
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_SOURCE_DIR}/boot.lua ${CMAKE_BINARY_DIR}/boot.lua
        COMMAND ${CMAKE_COMMAND} ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/gen_boot_c.cmake
        DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/boot.lua
)

file(GLOB_RECURSE LUA_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/../../vendor/lua/*.c)
list(REMOVE_ITEM LUA_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/../../vendor/lua/lua.c)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/../../vendor/lua)

add_compile_options("-flto" "-sUSE_ZLIB")
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_compile_options("-O0" "-g3" "-gsource-map")
endif()
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    add_compile_options("-O3")
endif()
if(POB_WASM_PROFILING)
    add_compile_options("-g" "-gsource-map")
endif()
set(CMAKE_EXECUTABLE_SUFFIX ".mjs")

add_executable(${PROJECT_NAME}
        ${LUA_SOURCES}
        ${CMAKE_CURRENT_SOURCE_DIR}/../../vendor/luautf8/lutf8lib.c
        ${CMAKE_BINARY_DIR}/boot.c
        src/c/driver.c
        src/c/draw.c
        src/c/draw.h
        src/c/image.c
        src/c/image.h
        src/c/fs.c
        src/c/fs.h
        src/c/util.c
        src/c/util.h
        src/c/wasmfs/nodefs.cpp
        src/c/wasmfs/nodefs.h
        src/c/wasmfs/nodefs_js.cpp
        src/c/sub.c
        src/c/sub.h
        src/c/lcurl.c
        src/c/lcurl.h
)

set(DRIVER_LINK_FLAGS
        "-flto"
        "--no-entry"
        "-sUSE_ZLIB"
        "-sMODULARIZE"
        "-sSTACK_SIZE=1MB"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH"
        "-sMALLOC=mimalloc"
        "-sWASMFS"
        "-sSTRICT"
        "-sINCOMING_MODULE_JS_API=[print,printErr]"
        "-sEXPORTED_RUNTIME_METHODS=cwrap,ccall,ERRNO_CODES,setValue,HEAPU8"
)
if(POB_WASM_PROFILING)
    set(DRIVER_LINK_FLAGS "${DRIVER_LINK_FLAGS}" "--emit-symbol-map" "--profiling-funcs")
endif()
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(DRIVER_LINK_FLAGS "${DRIVER_LINK_FLAGS}" "-sASSERTIONS=1" "-sSAFE_HEAP=1" "-sSTACK_OVERFLOW_CHECK=2")
endif()
target_link_options(${PROJECT_NAME} PRIVATE ${DRIVER_LINK_FLAGS})

set_target_properties(${PROJECT_NAME}
        PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/dist/${CMAKE_BUILD_TYPE_LOWER}
)
