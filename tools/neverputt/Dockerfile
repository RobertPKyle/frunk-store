FROM emscripten/emsdk:4.0.10
# What Neverball's web build needs: gl4es (OpenGL 1.x calls on WebGL), at the
# commit Neverball's own emscripten/Dockerfile pins, and Emscripten's SDL2,
# SDL2_ttf, libpng and libjpeg ports, built once into the image's cache.
# pkg-config, zip and imagemagick are for the course compile and the data package.
ENV GL4ES_COMMIT=c9895df34cd466c23bc60c2bd3db3d87e98fcbe7
ENV GL4ES_DIR=/opt/gl4es
RUN export DEBIAN_FRONTEND=noninteractive && apt-get update -y && apt-get install -y pkg-config zip imagemagick && \
    git clone --no-tags --single-branch https://github.com/ptitSeb/gl4es.git "$GL4ES_DIR" && \
    cd "$GL4ES_DIR" && git checkout "$GL4ES_COMMIT" && mkdir build && cd build && \
    emcmake cmake .. -DCMAKE_BUILD_TYPE=Release -DNOX11=ON -DNOEGL=ON -DSTATICLIB=ON && make -j"$(nproc)" && \
    printf 'int main(void) { return 0; }\n' > /tmp/a.c && \
    emcc /tmp/a.c -O2 -sUSE_SDL=2 -sUSE_SDL_TTF=2 -sUSE_LIBPNG=1 -sUSE_LIBJPEG=1 -o /tmp/a.js && \
    rm -f /tmp/a.* && chmod -R a+rwX /emsdk/upstream/emscripten/cache
