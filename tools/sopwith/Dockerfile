FROM emscripten/emsdk:4.0.10
# What SDL Sopwith's web build needs: autotools and pkg-config for its
# configure script, and Emscripten's SDL2 port, built once into the image's
# cache.
RUN export DEBIAN_FRONTEND=noninteractive && apt-get update -y && apt-get install -y autoconf automake pkg-config && \
    printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -sUSE_SDL=2 -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
