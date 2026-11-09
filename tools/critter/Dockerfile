FROM emscripten/emsdk:4.0.10
# What Critical Mass's web build needs, built once into the image's cache:
# Emscripten's SDL2, SDL2_mixer (Ogg Vorbis), SDL2_image (PNG), zlib and
# libpng ports. zip packs the game's data.
RUN export DEBIAN_FRONTEND=noninteractive && apt-get update -y && apt-get install -y zip && \
    printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -sUSE_SDL=2 -sUSE_SDL_MIXER=2 -sUSE_SDL_IMAGE=2 "-sSDL2_IMAGE_FORMATS=[\"png\"]" -sUSE_ZLIB=1 -sUSE_LIBPNG=1 -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
