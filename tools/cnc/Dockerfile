FROM emscripten/emsdk:4.0.10
# Vanilla Conquer needs a newer CMake than the image's
RUN pip3 install --no-cache-dir cmake==3.31.6
# Emscripten's SDL2 port, built once into the image's cache
RUN printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -sUSE_SDL=2 -lopenal -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
