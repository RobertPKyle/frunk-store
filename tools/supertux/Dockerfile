FROM emscripten/emsdk:4.0.10
# SuperTux and its dependencies build with a newer CMake than the image's
RUN pip3 install --no-cache-dir cmake==3.31.6
# Emscripten's ports the game uses, built once into the image's cache
RUN printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -fwasm-exceptions -sUSE_SDL=2 -sUSE_SDL_IMAGE=2 -sSDL2_IMAGE_FORMATS='["png","jpg"]' \
      -sUSE_VORBIS=1 -sUSE_OGG=1 -sUSE_FREETYPE=1 -sUSE_LIBPNG=1 -sUSE_ZLIB=1 -lopenal -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
