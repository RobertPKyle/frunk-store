// WebAssembly entry points for Gearlynx (GPL-3.0-or-later), used by
// apps/retro/lynx-worker.js. One emulated Atari Lynx per module. Built by
// tools/build-gearlynx.mjs, with tools/gearlynx/gearlynx-web.patch.
//
// The Lynx starts every cartridge from Atari's 512-byte boot ROM, which
// isn't free to hand out. In its place this loads a stand-in of its own:
// its routines are one instruction each, a write to the unused Mikey
// register 0xFD97, which the patch passes to rom_call() here, and this does
// the work in C, the way Handy's high-level boot ROM does (K. Wilkins, zlib
// license; libretro-handy lynx/system.cpp, HLE_BIOS_*). Homebrew in the .o
// format needs no boot ROM; Gearlynx starts it itself.
//
// This file is part of the Gearlynx build for frunk.store and, like
// Gearlynx, is under the GNU General Public License, version 3 or later.

#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

#include "gearlynx.h"
#include "sd_card_filesystem.h"

// Set, this keeps Gearlynx's log (log.h) out of the browser's console; the
// desktop app sets it when it talks over stdio
bool g_mcp_stdio_mode = true;

void (*g_glynx_rom_hook)(void) = NULL;

// No SD card or Game Drive files here: the cartridge is all there is
class NoSdCard : public SdCardFileSystem {
public:
  bool IsAvailable() const override { return false; }
  bool IsValidRootPath(const char*) const override { return false; }
  bool GetFileInfo(const char*, bool&, u32&) override { return false; }
  bool CreateSizedFile(const char*, u32) override { return false; }
  bool OpenFile(const char*, bool&, u32&) override { return false; }
  void CloseFile() override {}
  s64 ReadFile(u32, void*, u32) override { return -1; }
  bool WriteFile(u32, const void*, u32) override { return false; }
  bool ReadDirectory(const char*, std::vector<SdCardFileSystemEntry>&) override { return false; }
};
SdCardFileSystem* CreateSdCardFileSystem() { return new NoSdCard(); }

static GearlynxCore* core = NULL;
// Big enough for the picture either way round
static u8 screen[GLYNX_SCREEN_WIDTH * GLYNX_SCREEN_HEIGHT * 4];
static s16 samples[GLYNX_AUDIO_BUFFER_SIZE * 4];
static int sample_count = 0;
static GLYNX_Runtime_Info info;

// ---------- the stand-in boot ROM ($FE00-$FFFF) ----------

// Where the boot ROM's routines start; games call the first to pick a block
// of the cartridge
enum { SELECT_BLOCK = 0xFE00, BOOT = 0xFE19, LOAD = 0xFE4A, RESET = 0xFF80, RTI_AT = 0xFFF0 };

static void make_rom(u8* rom) {
  // RTS everywhere, so a call to a routine this doesn't have returns at once
  memset(rom, 0x60, GLYNX_BIOS_SIZE);
  for (int at : { SELECT_BLOCK, BOOT, LOAD, RESET }) {
    u8* p = rom + (at - 0xFE00);
    p[0] = 0x8D; p[1] = 0x97; p[2] = 0xFD;   // STA $FD97
  }
  rom[RTI_AT - 0xFE00] = 0x40;   // RTI, for interrupts that come before a game sets its own vectors
  const u16 vectors[3] = { RTI_AT, RESET, RTI_AT };   // NMI, reset, IRQ at $FFFA
  for (int i = 0; i < 3; i++) {
    rom[0x1FA + i * 2] = vectors[i] & 0xFF;
    rom[0x1FB + i * 2] = vectors[i] >> 8;
  }
}

// Shifts a block number into the cartridge's address register, leaving the
// byte counter at the start of the block
static void select_block(u8 block) {
  Media* media = core->GetMedia();
  for (int bit = 7; bit >= 0; bit--) {
    media->ShiftRegisterBit((block >> bit) & 1);
    media->ShiftRegisterStrobe(true);
    media->ShiftRegisterStrobe(false);
  }
}

// Reads the encrypted loader from where the cartridge is, decrypts it to
// the address at $05-$06 and runs it from $0200, as the boot ROM does
static void load_and_run() {
  Media* media = core->GetMedia();
  u8* ram = core->GetMemory()->GetRAM();
  u16 to = ram[5] | (ram[6] << 8);
  u8 encrypted[256], plain[256];
  encrypted[0] = media->ReadBank0();
  int blocks = 0x100 - encrypted[0];
  if (blocks > 5) blocks = 5;   // the most a loader has; 51 bytes each
  for (int i = 1; i < 1 + 51 * blocks; i++) encrypted[i] = media->ReadBank0();
  media->DecryptLoader(plain, encrypted, 51);
  for (int i = 0; i < 50 * blocks; i++) ram[(u16)(to + i)] = plain[i];
  core->GetM6502()->GetState()->PC.SetValue(0x0200);
}

// Power on: clear the RAM, start the timers and display the way the boot
// ROM leaves them (as Gearlynx does for homebrew), then load block 0's loader
static void boot() {
  memset(core->GetMemory()->GetRAM(), 0, 0x10000);
  Mikey* mikey = core->GetMikey();
  mikey->Write<true>(0xFD00, 0x9E);   // TIM0BKUP: a line every 159 ticks
  mikey->Write<true>(0xFD01, 0x18);   // TIM0CTLA: reload, count
  mikey->Write<true>(0xFD08, 0x68);   // TIM2BKUP: 105 lines a frame
  mikey->Write<true>(0xFD09, 0x1F);   // TIM2CTLA: reload, count, linked to timer 0
  mikey->Write<true>(0xFD92, 0x09);   // DISPCTL: colour, display on
  mikey->Write<true>(0xFD93, 0x29);   // PBKUP
  u8* ram = core->GetMemory()->GetRAM();
  ram[5] = 0x00; ram[6] = 0x02;
  select_block(0);
  load_and_run();
}

// The CPU wrote $FD97 from one of the routines; it has already moved past
// the STA, so the routine is the address three bytes back
static void rom_call() {
  M6502::M6502_State* cpu = core->GetM6502()->GetState();
  switch ((u16)(cpu->PC.GetValue() - 3)) {
    case SELECT_BLOCK: select_block(cpu->A.GetValue()); break;   // then the RTS
    case BOOT: case RESET: boot(); break;
    case LOAD: load_and_run(); break;
  }
}

extern "C" {

EMSCRIPTEN_KEEPALIVE u8* gl_alloc(int size) { return (u8*)malloc(size); }
EMSCRIPTEN_KEEPALIVE void gl_free(u8* p) { free(p); }

// Loads a game: .lnx, .lyx (no header) or .o (homebrew). Returns 0 on
// failure, else 1.
EMSCRIPTEN_KEEPALIVE int gl_load(const u8* data, int length, const char* name) {
  if (!core) {
    core = new GearlynxCore();
    core->Init(GLYNX_PIXEL_RGBA8888);
    u8 rom[GLYNX_BIOS_SIZE];
    make_rom(rom);
    core->LoadBiosFromBuffer(rom, GLYNX_BIOS_SIZE);   // reports a bad checksum, as it isn't Atari's
    g_glynx_rom_hook = rom_call;
  }
  if (!core->LoadROMFromBuffer(data, length, name)) return 0;
  core->GetRuntimeInfo(info);
  return 1;
}

EMSCRIPTEN_KEEPALIVE void gl_reset(void) { core->ResetROM(true); }

// Keys (GLYNX_Keys): 0x01 A, 0x02 B, 0x04 Option 2, 0x08 Option 1, 0x10
// Right, 0x20 Left, 0x40 Down, 0x80 Up, 0x100 Pause. The Lynx has one player.
EMSCRIPTEN_KEEPALIVE void gl_button(int player, int key, int pressed) {
  if (player) return;
  if (pressed) core->KeyPressed((GLYNX_Keys)key);
  else core->KeyReleased((GLYNX_Keys)key);
}

// Runs one frame, drawing it unless draw is 0 (to catch up when behind).
// Returns the picture's size as width << 16 | height: some games are played
// with the Lynx turned on its side.
EMSCRIPTEN_KEEPALIVE int gl_frame(int draw) {
  int count = 0;
  core->RunToVBlank(screen, samples + sample_count, &count, NULL, draw != 0);
  sample_count += count;
  if (sample_count > GLYNX_AUDIO_BUFFER_SIZE * 3) sample_count = GLYNX_AUDIO_BUFFER_SIZE * 3;
  core->GetRuntimeInfo(info);
  return (info.screen_width << 16) | info.screen_height;
}

// How long a frame lasts, in microseconds: each game sets the Lynx's
// refresh rate itself (most 60 or 75 Hz). 0 until it has.
EMSCRIPTEN_KEEPALIVE int gl_frame_us(void) { return (int)(info.frame_time * 1000.0f); }

// The last drawn frame, RGBA, as wide as gl_frame said
EMSCRIPTEN_KEEPALIVE u8* gl_screen(void) { return screen; }

// Sound since the last call: interleaved stereo int16 at 44100 Hz.
// gl_sample_count is the number of int16 values; gl_samples hands them over
// and starts afresh.
EMSCRIPTEN_KEEPALIVE int gl_sample_count(void) { return sample_count; }
EMSCRIPTEN_KEEPALIVE s16* gl_samples(void) { sample_count = 0; return samples; }

// The cartridge's EEPROM, where games save: size (0 when there's none), and
// where it lives
EMSCRIPTEN_KEEPALIVE int gl_battery_size(void) {
  s32 size = core->GetMedia()->GetSaveMemorySize();
  return core->GetMedia()->GetSaveMemoryPointer() && size > 0 ? size : 0;
}
EMSCRIPTEN_KEEPALIVE u8* gl_battery(void) { return core->GetMedia()->GetSaveMemoryPointer(); }

// Snapshots, for picking up where the player left off. gl_state_size is
// the size a snapshot needs now; gl_state_save returns the size written, or 0.
EMSCRIPTEN_KEEPALIVE int gl_state_size(void) {
  size_t size = 0;
  return core->GetMaxSaveStateSize(size) ? (int)size : 0;
}
EMSCRIPTEN_KEEPALIVE int gl_state_save(u8* out, int room) {
  size_t size = room;
  return core->SaveState(out, size) ? (int)size : 0;
}
EMSCRIPTEN_KEEPALIVE int gl_state_load(const u8* data, int size) { return core->LoadState(data, size) ? 1 : 0; }

}
