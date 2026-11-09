FROM emscripten/emsdk:4.0.10
# Emscripten's SDL2, SDL2_image (PNG) and SDL2_mixer ports for Rocks'n'Diamonds,
# built once into the image's cache. ImageMagick makes the placeholder sheets
# and repaints the creature tiles in tools/build-rocks.mjs.
RUN export DEBIAN_FRONTEND=noninteractive && apt-get update -y && apt-get install -y imagemagick && \
    printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -sUSE_SDL=2 -sUSE_SDL_IMAGE=2 -sSDL2_IMAGE_FORMATS='["png"]' -sUSE_SDL_MIXER=2 -sSDL2_MIXER_FORMATS='["wav"]' -sUSE_ZLIB=1 -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
