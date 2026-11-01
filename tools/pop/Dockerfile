FROM emscripten/emsdk:4.0.10
# Emscripten's SDL2 and SDL2_image (PNG) ports, built once into the image's cache
RUN printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -fwasm-exceptions -sSUPPORT_LONGJMP=wasm -sUSE_SDL=2 -sUSE_SDL_IMAGE=2 -sSDL2_IMAGE_FORMATS='["png"]' -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
