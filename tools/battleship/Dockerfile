FROM emscripten/emsdk:4.0.10
# BattleShip needs CMake 3.24 or newer (the image has 3.22), Ninja, and Pillow
# for its build-time icon scripts.
RUN pip3 install --no-cache-dir cmake==3.31.6 ninja==1.11.1.4 pillow==11.3.0
RUN embuilder build sdl2-mt zlib && chmod -R a+rwX /emsdk/upstream/emscripten/cache
