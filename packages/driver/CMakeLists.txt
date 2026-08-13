cmake_minimum_required(VERSION 3.28)

project("driver")

STRING (TOLOWER "${CMAKE_BUILD_TYPE}" CMAKE_BUILD_TYPE_LOWER)

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

add_compile_options("-flto" "-g" "-sUSE_ZLIB")
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    add_compile_options("-O0")
endif()
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    add_compile_options("-O3")
endif()
set(CMAKE_EXECUTABLE_SUFFIX ".mjs")

add_executable(${PROJECT_NAME}
        ${LUA_SOURCES}
        ${CMAKE_CURRENT_SOURCE_DIR}/../../vendor/luautf8/lutf8lib.c
        ${CMAKE_BINARY_DIR}/boot.c
        src/c/driver.c
        src/c/draw.c
        src/c/draw.h
        src/c/draw_color.c
        src/c/draw_color.h
        src/c/dpi.c
        src/c/dpi.h
        src/c/byte_buffer.c
        src/c/byte_buffer.h
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
        src/c/sub_serialization.c
        src/c/sub_serialization.h
        src/c/lcurl.c
        src/c/lcurl.h
)

enable_testing()
add_executable(driver_bridge_test
        test/c/bridge_test.c
        src/c/byte_buffer.c
        src/c/draw_color.c
        src/c/dpi.c
        src/c/sub_serialization.c
)
target_include_directories(driver_bridge_test PRIVATE src/c)
add_test(NAME driver_bridge_test COMMAND driver_bridge_test)

add_executable(driver_fs_integration_test
        ${LUA_SOURCES}
        test/c/fs_integration_test.c
        src/c/fs.c
        src/c/wasmfs/nodefs.cpp
        src/c/wasmfs/nodefs_js.cpp
)
target_include_directories(driver_fs_integration_test PRIVATE src/c)
target_link_options(driver_fs_integration_test PRIVATE
        "-sWASMFS"
        "-sMODULARIZE"
        "-sEXPORT_ES6"
        "-sENVIRONMENT=node"
        "-sEXPORTED_RUNTIME_METHODS=ERRNO_CODES,setValue,HEAPU8,stringToUTF8OnStack,stackSave,stackRestore"
)

set(DRIVER_LINK_FLAGS
        "-flto"
        "-Wl,--build-id=sha1"
        "--no-entry"
        "-sUSE_ZLIB"
        "-sMODULARIZE"
        "-sSTACK_SIZE=1MB"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH"
        "-sMALLOC=mimalloc"
        "-sWASMFS"
        "-sSTRICT"
        "-sEXPORTED_FUNCTIONS=_malloc,_free"
        "-sINCOMING_MODULE_JS_API=[print,printErr,wasmBinary]"
        "-sEXPORTED_RUNTIME_METHODS=cwrap,ccall,ERRNO_CODES,setValue,HEAPU8,stringToUTF8OnStack,stackSave,stackRestore"
)
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(DRIVER_LINK_FLAGS "${DRIVER_LINK_FLAGS}" "-g3" "-sASSERTIONS=1" "-sSAFE_HEAP=1" "-sSTACK_OVERFLOW_CHECK=2")
endif()
if(CMAKE_BUILD_TYPE STREQUAL "Release")
    set(DRIVER_LINK_FLAGS "${DRIVER_LINK_FLAGS}" "-gseparate-dwarf")
endif()
target_link_options(${PROJECT_NAME} PRIVATE ${DRIVER_LINK_FLAGS})

set_target_properties(${PROJECT_NAME}
        PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/dist/${CMAKE_BUILD_TYPE_LOWER}
)
