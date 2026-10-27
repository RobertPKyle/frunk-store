# fheroes2's Emscripten build (Makefile.emscripten) needs gettext for its
# translations, on top of emsdk
FROM emscripten/emsdk:4.0.10
RUN apt-get update && apt-get install -y --no-install-recommends gettext && rm -rf /var/lib/apt/lists/*
