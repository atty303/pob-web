cmake_minimum_required(VERSION 3.28)
project(driver)

add_custom_command(
        OUTPUT ${CMAKE_BINARY_DIR}/boot.c
        COMMAND ${CMAKE_COMMAND} -E echo "Writing boot.lua to boot.c"
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_SOURCE_DIR}/boot.lua ${CMAKE_BINARY_DIR}/boot.lua
        COMMAND ${CMAKE_COMMAND} ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/gen_boot_c.cmake
        DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/boot.lua
)

add_custom_command(
        OUTPUT ${CMAKE_BINARY_DIR}/vfs.c
        COMMAND ${CMAKE_COMMAND} -E echo "Writing vfs.tsv to vfs.c"
        COMMAND ${CMAKE_COMMAND} -E copy ${CMAKE_CURRENT_SOURCE_DIR}/../../target/fs.tsv ${CMAKE_BINARY_DIR}/vfs.tsv
        COMMAND ${CMAKE_COMMAND} ${CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/gen_vfs_c.cmake
        DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/../../target/fs.tsv
)

file(GLOB_RECURSE LUA_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/lua/*.c)
list(REMOVE_ITEM LUA_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/lua/lua.c)

include_directories(lua)
add_compile_options(-flto)

set(CMAKE_EXECUTABLE_SUFFIX ".mjs")

add_executable(${PROJECT_NAME}
        ${LUA_SOURCES}
        ${CMAKE_BINARY_DIR}/boot.c
        ${CMAKE_BINARY_DIR}/vfs.c
        src/driver.c
        src/draw.c
        src/draw.h
        src/image.c
        src/image.h
)
#add_dependencies(${PROJECT_NAME} ${CMAKE_BINARY_DIR}/boot.c)
set_target_properties(${PROJECT_NAME}
        PROPERTIES
        LINK_FLAGS "-flto --preload-file ${PROJECT_SOURCE_DIR}/../../target/vfs@/ -s LZ4 -s MODULARIZE -s ENVIRONMENT=web,worker -s ALLOW_MEMORY_GROWTH -s EXPORTED_FUNCTIONS=[_init,_on_frame] -s FS_DEBUG"
        RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/dist
)
