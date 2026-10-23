// Links TIC-80's prj2cart (build/tools/prj2cart.c) without its script
// engines: the project loader only needs each language's file extension
// and comment marker (src/api/*.c), and saving a cart never loads a PNG or
// unzips anything.
#include <stdlib.h>
#include "script.h"

#define L(n, ext, cmt) static const tic_script n = { .fileExtension = ext, .projectComment = cmt };
L(lua, ".lua", "--") L(moon, ".moon", "--") L(fnl, ".fnl", ";;") L(js, ".js", "//") L(wren, ".wren", "//")
L(rb, ".rb", "#") L(scm, ".scm", ";;") L(py, ".py", "#") L(nut, ".nut", "//") L(fth, ".fth", "\\")
L(janet, ".janet", "#") L(ms, ".ms", "//") L(yue, ".yue", "--") L(wasm, ".wasmp", "--")
static const tic_script* all[] = { &lua, &moon, &fnl, &js, &wren, &rb, &scm, &py, &nut, &fth, &janet, &ms, &yue, &wasm, NULL };
const tic_script** tic_scripts() { return all; }

typedef struct { void* data; int size; } stub_buf;
stub_buf png_decode(stub_buf b) { abort(); }
stub_buf png_create(int w, int h) { abort(); }
unsigned int tic_tool_unzip(void* dest, int destSize, const void* source, int size) { abort(); }
