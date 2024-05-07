file(READ boot.lua file_content HEX)
string(REGEX REPLACE "(..)" "\\\\x\\1" c_string ${file_content})
file(WRITE ${CMAKE_BINARY_DIR}/boot.c "const char* boot_lua = \"${c_string}\";\n")
