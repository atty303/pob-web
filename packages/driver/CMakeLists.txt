cmake_minimum_required(VERSION 3.28)

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    project("driver-debug")
else()
    project("driver-release")
endif()

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

add_compile_options("-flto" "-g" "-gsource-map" "-sUSE_ZLIB")
set(CMAKE_EXECUTABLE_SUFFIX ".mjs")

add_executable(${PROJECT_NAME}
        ${LUA_SOURCES}
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
)

set(DRIVER_LINK_FLAGS
        "-flto"
        "-sUSE_ZLIB"
        "-sMODULARIZE"
        "-sSTACK_SIZE=131072"
        "-sASYNCIFY"
        "-sASYNCIFY_STACK_SIZE=131072"
        "-sENVIRONMENT=web"
        "-sALLOW_MEMORY_GROWTH"
        "-sWASMFS"
        "-sSTRICT"
        "-sINCOMING_MODULE_JS_API=[print,printErr]"
        "-sEXPORTED_FUNCTIONS=[_malloc,_init,_start,_on_frame,_on_key_down,_on_key_up,_on_char,_on_download_page_result]"
        "-sEXPORTED_RUNTIME_METHODS=cwrap,ccall,ERRNO_CODES,setValue,HEAPU8,Asyncify"
        "-sASYNCIFY_IMPORTS=js_wasmfs_node_read"
)
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(DRIVER_LINK_FLAGS "${DRIVER_LINK_FLAGS}" "-sASSERTIONS")
endif()
target_link_options(${PROJECT_NAME} PRIVATE ${DRIVER_LINK_FLAGS})

set_target_properties(${PROJECT_NAME}
        PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/dist
)
