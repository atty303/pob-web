cmake_minimum_required(VERSION 3.28)

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(PROJECT_NAME "driver-debug")
else()
    set(PROJECT_NAME "driver-release")
endif()

project(${PROJECT_NAME})

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

set(ZLIB_ENABLE_TESTS OFF)
set(ZLIBNG_ENABLE_TESTS OFF)
set(WITH_GTEST OFF)
set(ZLIB_COMPAT ON)
set(BUILD_SHARED_LIBS OFF)
add_subdirectory(${CMAKE_CURRENT_SOURCE_DIR}/../../vendor/zlib-ng ${CMAKE_CURRENT_BINARY_DIR}/vendor/zlib-ng)

add_compile_options(-flto)

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
)

target_link_libraries(${PROJECT_NAME} PRIVATE $<TARGET_FILE:zlib>)
target_include_directories(${PROJECT_NAME} PRIVATE $<TARGET_PROPERTY:zlib,INCLUDE_DIRECTORIES>)

set(DRIVER_LINK_FLAGS "
    -flto -s MODULARIZE -s ASYNCIFY -s ENVIRONMENT=web,worker -s ALLOW_MEMORY_GROWTH\
    -s EXPORTED_FUNCTIONS=[_malloc,_init,_start,_on_frame,_on_key_down,_on_key_up,_on_char,_on_download_page_result] -s EXPORTED_RUNTIME_METHODS=cwrap,ccall,FS,PATH,ERRNO_CODES\
")
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    set(DRIVER_LINK_FLAGS "${DRIVER_LINK_FLAGS}\ -sASSERTIONS")
else()
    set(DRIVER_LINK_FLAGS "${DRIVER_LINK_FLAGS}\ -sASYNCIFY_IGNORE_INDIRECT")
endif()

set_target_properties(${PROJECT_NAME}
        PROPERTIES
        LINK_FLAGS "${DRIVER_LINK_FLAGS}"
        RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/dist
)
