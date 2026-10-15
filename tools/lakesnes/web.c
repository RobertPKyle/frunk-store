// WebAssembly entry points for LakeSnes (snes/, MIT), used by
// apps/retro/snes.js. One emulated console per module. Built by
// tools/build-snes.mjs.

#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

#include "snes/snes.h"
#include "snes/ppu.h"

static Snes* snes = NULL;
// One frame as RGBA, 512 wide (hi-res modes use every column), up to 239 lines
static uint8_t screen[512 * 4 * 239];
static int16_t samples[2 * 1000];

EMSCRIPTEN_KEEPALIVE uint8_t* lake_alloc(int size) { return malloc(size); }
EMSCRIPTEN_KEEPALIVE void lake_free(uint8_t* p) { free(p); }

// Loads a game; returns 0 on failure, 1 for NTSC (60 Hz), 2 for PAL (50 Hz)
EMSCRIPTEN_KEEPALIVE int lake_load(const uint8_t* data, int length) {
  if (!snes) snes = snes_init();
  if (!snes_loadRom(snes, data, length)) return 0;
  return snes->palTiming ? 2 : 1;
}

EMSCRIPTEN_KEEPALIVE void lake_reset(void) { snes_reset(snes, true); }

// Buttons: 0 B, 1 Y, 2 Select, 3 Start, 4 Up, 5 Down, 6 Left, 7 Right,
// 8 A, 9 X, 10 L, 11 R
EMSCRIPTEN_KEEPALIVE void lake_button(int player, int button, int pressed) {
  snes_setButtonState(snes, player, button, pressed);
}

// Runs one frame and copies it to the screen buffer; returns the number of
// lines (224, or 239 when the game uses overscan)
EMSCRIPTEN_KEEPALIVE int lake_frame(void) {
  snes_runFrame(snes);
  Ppu* ppu = snes->ppu;
  int lines = ppu->frameOverscan ? 239 : 224;
  // The PPU keeps even and odd fields; outside interlace, show the latest
  int field = ppu->frameInterlace || ppu->evenFrame ? 0 : 239;
  for (int y = 0; y < lines; y++) {
    const uint8_t* src = &ppu->pixelBuffer[(y + field) * 2048];
    uint8_t* dst = &screen[y * 2048];
    for (int x = 0; x < 2048; x += 4) {
      dst[x] = src[x + 2];
      dst[x + 1] = src[x + 1];
      dst[x + 2] = src[x];
      dst[x + 3] = 255;
    }
  }
  return lines;
}

EMSCRIPTEN_KEEPALIVE uint8_t* lake_screen(void) { return screen; }

// Fills and returns count stereo samples (interleaved int16)
EMSCRIPTEN_KEEPALIVE int16_t* lake_samples(int count) {
  if (count > 1000) count = 1000;
  snes_setSamples(snes, samples, count);
  return samples;
}

// Battery saves: size, then copy out / in
EMSCRIPTEN_KEEPALIVE int lake_battery_size(void) { return snes_saveBattery(snes, NULL); }
EMSCRIPTEN_KEEPALIVE void lake_battery_save(uint8_t* out) { snes_saveBattery(snes, out); }
EMSCRIPTEN_KEEPALIVE int lake_battery_load(uint8_t* data, int size) { return snes_loadBattery(snes, data, size); }

// Snapshots, for picking up where the player left off
EMSCRIPTEN_KEEPALIVE int lake_state_size(void) { return snes_saveState(snes, NULL); }
EMSCRIPTEN_KEEPALIVE void lake_state_save(uint8_t* out) { snes_saveState(snes, out); }
EMSCRIPTEN_KEEPALIVE int lake_state_load(uint8_t* data, int size) { return snes_loadState(snes, data, size); }
