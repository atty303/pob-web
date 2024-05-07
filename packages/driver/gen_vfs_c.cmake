file(READ vfs.tsv file_content HEX)
string(REGEX REPLACE "(..)" "\\\\x\\1" c_string ${file_content})
file(WRITE vfs.c "const char* VFS_TSV = \"${c_string}\";\n")
