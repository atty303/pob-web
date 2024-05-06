cmake_minimum_required(VERSION 3.28)
project(driver)

file(GLOB_RECURSE LUA_SOURCES lua/*.c)
list(REMOVE_ITEM LUA_SOURCES lua/lua.c)

include_directories(lua)

add_executable(${PROJECT_NAME} ${LURA_SOURCES} src/driver.c)
set(CMAKE_EXECUTABLE_SUFFIX ".mjs")
set_target_properties(${PROJECT_NAME}
        PROPERTIES LINK_FLAGS "--preload-file ${PROJECT_SOURCE_DIR}/../../target/vfs@/ -s MODULARIZE -s ENVIRONMENT=web -s ALLOW_MEMORY_GROWTH  -s EXPORTED_FUNCTIONS=\"['_init']\""
        RUNTIME_OUTPUT_DIRECTORY ${PROJECT_SOURCE_DIR}/dist
)