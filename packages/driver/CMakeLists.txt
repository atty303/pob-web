cmake_minimum_required(VERSION 3.28)
project(driver)

#add_custom_command(
#        OUTPUT ${CMAKE_BINARY_DIR}/boot.c
#        COMMAND ${CMAKE_COMMAND} -E echo "Writing boot.lua to boot.c"
#        DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/boot.lua
#)
file(READ boot.lua file_content HEX)
string(REGEX REPLACE "(..)" "\\\\x\\1" c_string ${file_content})
file(WRITE ${CMAKE_BINARY_DIR}/boot.c "const char* boot_lua = \"${c_string}\";\n")

file(GLOB_RECURSE LUA_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/lua/*.c)
list(REMOVE_ITEM LUA_SOURCES ${CMAKE_CURRENT_SOURCE_DIR}/lua/lua.c)

include_directories(lua)
add_compile_options(-flto)

set(CMAKE_EXECUTABLE_SUFFIX ".mjs")

add_executable(${PROJECT_NAME}
        ${LUA_SOURCES}
        ${CMAKE_BINARY_DIR}/boot.c
        src/driver.c
        src/draw.c
        src/draw.h
)
#add_dependencies(${PROJECT_NAME} ${CMAKE_BINARY_DIR}/boot.c)
set_target_properties(${PROJECT_NAME}
        PROPERTIES
        LINK_FLAGS "-flto --preload-file ${PROJECT_SOURCE_DIR}/../../target/vfs@/ -s LZ4 -s MODULARIZE -s ENVIRONMENT=web,worker -s ALLOW_MEMORY_GROWTH -s EXPORTED_FUNCTIONS=[_init,_on_frame] -s FS_DEBUG"
        RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/dist
)
