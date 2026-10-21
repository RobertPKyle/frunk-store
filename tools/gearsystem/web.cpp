// WebAssembly entry points for Gearsystem (GPL-3.0-or-later), used by
// apps/retro/sms-worker.js. One emulated console per module. Built by
// tools/build-gearsystem.mjs.
//
// This file is part of the Gearsystem build for frunk.store and, like
// Gearsystem, is under the GNU General Public License, version 3 or later.

#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

#include "gearsystem.h"

// Set, this keeps Gearsystem's log (log.h) out of the browser's console; the
// desktop app sets it when it talks over stdio
bool g_mcp_stdio_mode = true;

static GearsystemCore* core = NULL;
static u8 screen[GS_RESOLUTION_MAX_WIDTH_WITH_OVERSCAN * GS_RESOLUTION_MAX_HEIGHT_WITH_OVERSCAN * 4];
static s16 samples[GS_AUDIO_BUFFER_SIZE * 2];
static int sample_count = 0;
static GS_RuntimeInfo info;

extern "C" {

EMSCRIPTEN_KEEPALIVE u8* gs_alloc(int size) { return (u8*)malloc(size); }
EMSCRIPTEN_KEEPALIVE void gs_free(u8* p) { free(p); }

// Loads a game. name's extension tells the console apart where the game
// itself can't: .gg Game Gear, .sg SG-1000, else Master System. Returns 0
// on failure, 1 for NTSC (60 Hz), 2 for PAL (50 Hz).
EMSCRIPTEN_KEEPALIVE int gs_load(const u8* data, int length, const char* name) {
  if (!core) {
    core = new GearsystemCore();
    core->Init(GS_PIXEL_RGBA8888);
  }
  if (!core->LoadROMFromBuffer(data, length, NULL, name)) return 0;
  core->GetRuntimeInfo(info);
  return info.region == Region_PAL ? 2 : 1;
}

EMSCRIPTEN_KEEPALIVE void gs_reset(void) { core->ResetROMPreservingRAM(); }

// Keys: 0x01 Up, 0x02 Down, 0x04 Left, 0x08 Right, 0x10 button 1,
// 0x20 button 2, 0x80 Start (Game Gear) or Pause (Master System)
EMSCRIPTEN_KEEPALIVE void gs_button(int player, int key, int pressed) {
  GS_Joypads pad = player ? Joypad_2 : Joypad_1;
  if (pressed) core->KeyPressed(pad, (GS_Keys)key);
  else core->KeyReleased(pad, (GS_Keys)key);
}

// Runs one frame, drawing it unless draw is 0 (to catch up when behind).
// Returns the picture's size as width << 16 | height: it can change while a
// game runs (Master System games may hide the left column or use 224 lines).
EMSCRIPTEN_KEEPALIVE int gs_frame(int draw) {
  int count = 0;
  core->RunToVBlank(screen, samples + sample_count, &count, NULL, draw != 0);
  sample_count += count;
  if (sample_count > GS_AUDIO_BUFFER_SIZE) sample_count = GS_AUDIO_BUFFER_SIZE;
  core->GetRuntimeInfo(info);
  return (info.screen_width << 16) | info.screen_height;
}

// The last drawn frame, RGBA, as wide as gs_frame said
EMSCRIPTEN_KEEPALIVE u8* gs_screen(void) { return screen; }

// Sound since the last call: interleaved stereo int16 at 44100 Hz.
// gs_sample_count is the number of int16 values; gs_samples hands them over
// and starts afresh.
EMSCRIPTEN_KEEPALIVE int gs_sample_count(void) { return sample_count; }
EMSCRIPTEN_KEEPALIVE s16* gs_samples(void) { sample_count = 0; return samples; }

// Battery saves: size (0 when the game has none), and where they live
EMSCRIPTEN_KEEPALIVE int gs_battery_size(void) {
  MemoryRule* rule = core->GetMemory()->GetCurrentRule();
  return rule && rule->PersistedRAM() ? (int)rule->GetRamSize() : 0;
}
EMSCRIPTEN_KEEPALIVE u8* gs_battery(void) { return core->GetMemory()->GetCurrentRule()->GetRamBanks(); }

// Snapshots, for picking up where the player left off. gs_state_size is
// the size a snapshot needs now; gs_state_save returns the size written, or 0.
EMSCRIPTEN_KEEPALIVE int gs_state_size(void) {
  size_t size = 0;
  return core->SaveState(NULL, size) ? (int)size : 0;
}
EMSCRIPTEN_KEEPALIVE int gs_state_save(u8* out, int room) {
  size_t size = room;
  return core->SaveState(out, size) ? (int)size : 0;
}
EMSCRIPTEN_KEEPALIVE int gs_state_load(const u8* data, int size) { return core->LoadState(data, size) ? 1 : 0; }

}
