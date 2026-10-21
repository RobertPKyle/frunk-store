// WebAssembly entry points for Geargrafx (GPL-3.0-or-later), used by
// apps/retro/pce-worker.js. One emulated console per module, playing HuCard
// games (CD-ROM games need Hudson's System Card, which isn't free). Built
// by tools/build-geargrafx.mjs.
//
// This file is part of the Geargrafx build for frunk.store and, like
// Geargrafx, is under the GNU General Public License, version 3 or later.

#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

#include "geargrafx.h"

// Set, this keeps Geargrafx's log (log.h) out of the browser's console; the
// desktop app sets it when it talks over stdio
bool g_mcp_stdio_mode = true;

static GeargrafxCore* core = NULL;
// Big enough for the widest picture (1120 pixels, when a game mixes
// resolutions) at the most lines
static u8 screen[1176 * 263 * 4];
static s16 samples[GG_AUDIO_BUFFER_SIZE * 4];
static int sample_count = 0;
static GG_Runtime_Info info;

// Input is set by gg_button between frames, so there's nothing to pump
static void no_pump(void) {}

extern "C" {

EMSCRIPTEN_KEEPALIVE u8* gg_alloc(int size) { return (u8*)malloc(size); }
EMSCRIPTEN_KEEPALIVE void gg_free(u8* p) { free(p); }

// Loads a HuCard game. Returns 0 on failure, else 1.
EMSCRIPTEN_KEEPALIVE int gg_load(const u8* data, int length, const char* name) {
  if (!core) {
    core = new GeargrafxCore();
    core->Init(no_pump, GG_PIXEL_RGBA8888);
    // The 224 lines TVs showed, as the libretro core's "224p"
    core->GetHuC6260()->SetScanlineStart(11);
    core->GetHuC6260()->SetScanlineEnd(234);
    // Backup RAM (the Tennokoe Bank and CD-ROM unit's) is on in the desktop
    // and libretro builds, so games that save to it can
    core->GetMedia()->ForceBackupRAM(true);
  }
  return core->LoadHuCardFromBuffer(data, length, name) ? 1 : 0;
}

EMSCRIPTEN_KEEPALIVE void gg_reset(void) { core->ResetMedia(true); }

// Keys: 0x01 I, 0x02 II, 0x04 Select, 0x08 Run, 0x10 Up, 0x20 Right,
// 0x40 Down, 0x80 Left
EMSCRIPTEN_KEEPALIVE void gg_button(int player, int key, int pressed) {
  GG_Controllers pad = player ? GG_CONTROLLER_2 : GG_CONTROLLER_1;
  if (pressed) core->KeyPressed(pad, (GG_Keys)key);
  else core->KeyReleased(pad, (GG_Keys)key);
}

// Runs one frame, drawing it unless draw is 0 (to catch up when behind).
// Returns the picture's size as width << 16 | height: games can change it
// while they run.
EMSCRIPTEN_KEEPALIVE int gg_frame(int draw) {
  int count = 0;
  core->RunToVBlank(screen, samples + sample_count, &count, NULL, draw != 0);
  sample_count += count;
  if (sample_count > GG_AUDIO_BUFFER_SIZE * 3) sample_count = GG_AUDIO_BUFFER_SIZE * 3;
  core->GetRuntimeInfo(info);
  return (info.screen_width << 16) | info.screen_height;
}

// How wide the last picture looks on a TV, in pixels as tall as its lines,
// times 1000: the console's pixels aren't square, and a game that mixes
// resolutions gets a picture three times as wide
EMSCRIPTEN_KEEPALIVE int gg_display_width(void) {
  return (int)(1000.0f * info.screen_width / info.width_scale * info.pixel_aspect_ratio);
}

// The last drawn frame, RGBA, as wide as gg_frame said
EMSCRIPTEN_KEEPALIVE u8* gg_screen(void) { return screen; }

// Sound since the last call: interleaved stereo int16 at 44100 Hz.
// gg_sample_count is the number of int16 values; gg_samples hands them over
// and starts afresh.
EMSCRIPTEN_KEEPALIVE int gg_sample_count(void) { return sample_count; }
EMSCRIPTEN_KEEPALIVE s16* gg_samples(void) { sample_count = 0; return samples; }

// Backup RAM, where games save: size (0 when there's none), and where it lives
EMSCRIPTEN_KEEPALIVE int gg_battery_size(void) { return core->GetMemory()->GetBackupRAMSize(); }
EMSCRIPTEN_KEEPALIVE u8* gg_battery(void) { return core->GetMemory()->GetBackupRAM(); }

// Snapshots, for picking up where the player left off. gg_state_size is
// the size a snapshot needs now; gg_state_save returns the size written, or 0.
EMSCRIPTEN_KEEPALIVE int gg_state_size(void) {
  size_t size = 0;
  return core->SaveState(NULL, size) ? (int)size : 0;
}
EMSCRIPTEN_KEEPALIVE int gg_state_save(u8* out, int room) {
  size_t size = room;
  return core->SaveState(out, size) ? (int)size : 0;
}
EMSCRIPTEN_KEEPALIVE int gg_state_load(const u8* data, int size) { return core->LoadState(data, size) ? 1 : 0; }

}
