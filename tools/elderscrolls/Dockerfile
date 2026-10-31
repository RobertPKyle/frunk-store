FROM emscripten/emsdk:4.0.10
# em-dosbox builds with GNU Autotools; its version.py runs as "python"
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends autoconf automake python-is-python3 >/dev/null && rm -rf /var/lib/apt/lists/*
# Emscripten's SDL2 port, built once into the image's cache
RUN printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -sUSE_SDL=2 -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
