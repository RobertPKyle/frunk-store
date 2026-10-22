/* WebAssembly entry points for clownmdemu (AGPL-3.0-or-later), used by
   apps/retro/md-worker.js. One emulated Mega Drive / Genesis per module,
   playing cartridges (the Mega CD add-on is left off). Built by
   tools/build-clownmdemu.mjs.

   The core hands over each line of the picture as palette indices and its
   sound as two streams (FM at about 53 kHz, PSG at about 224 kHz); this
   turns them into RGBA pixels and one stereo stream at 44100 Hz, the rate
   the page plays.

   This file is part of the clownmdemu build for frunk.store and, like
   clownmdemu, is under the GNU Affero General Public License, version 3 or
   later. */

#include <stdlib.h>
#include <string.h>
#include <emscripten.h>

#include "source/clownmdemu.h"

#define OUTPUT_RATE 44100

static ClownMDEmu emulator;
static ClownMDEmu_Callbacks callbacks;
static cc_bool ready = cc_false;
static cc_u16l *rom = NULL;

/* ---------- picture ---------- */

/* Big enough for the widest picture (320 pixels) at the most lines (480,
   in Interlace Mode 2) */
static unsigned char screen[320 * 480 * 4];
static unsigned int screen_width = 320, screen_height = 224;
static int drawing = 1;

/* RGBA for each of the core's colours: 64 palette entries in their normal,
   shadow and highlight brightness. The core only says when one changes, so
   snapshots keep this table too. */
static cc_u32l colours[16 * 4 * 3];

static void colour_updated(void *user_data, cc_u16f index, cc_u16f colour)
{
	/* 0BGR4444 */
	const cc_u32f red = colour & 0xF, green = (colour >> 4) & 0xF, blue = (colour >> 8) & 0xF;

	(void)user_data;
	colours[index] = 0xFF000000 | (blue * 0x11) << 16 | (green * 0x11) << 8 | (red * 0x11);
}

static void scanline_rendered(void *user_data, cc_u16f scanline, const cc_u8l *pixels, cc_u16f left, cc_u16f right, cc_u16f width, cc_u16f height)
{
	cc_u32l *out;
	cc_u16f x;

	(void)user_data;
	screen_width = width;
	screen_height = height;

	if (!drawing || scanline >= height || width > 320 || height > 480)
		return;

	out = (cc_u32l*)screen + scanline * width;

	for (x = left; x < right; ++x)
		out[x] = colours[pixels[x]];
}

/* ---------- controllers ---------- */

/* Held buttons for each player, one bit per ClownMDEmu_Button */
static unsigned int held[2];

static cc_bool input_requested(void *user_data, cc_u8f player, ClownMDEmu_Button button)
{
	(void)user_data;
	return player < 2 && (held[player] >> button & 1) != 0;
}

/* ---------- sound ---------- */

static cc_s16l fm[2048 * 2];    /* stereo, this frame's */
static size_t fm_count;
static cc_s16l psg[8192];       /* mono */
static size_t psg_count;
static cc_s16l samples[OUTPUT_RATE / 10 * 2];
static int sample_count = 0;
static cc_s32l previous[2];     /* the last mixed frame, to blend into the next */
static double position = 0;     /* where the next output sample falls, in mixed frames */
static double step;             /* mixed frames per output sample */

static void fm_audio(void *user_data, ClownMDEmu *clownmdemu, size_t frames, void (*generate)(ClownMDEmu*, cc_s16l*, size_t))
{
	(void)user_data;
	if (fm_count + frames > CC_COUNT_OF(fm) / 2)
		frames = CC_COUNT_OF(fm) / 2 - fm_count;
	generate(clownmdemu, fm + fm_count * 2, frames);
	fm_count += frames;
}

static void psg_audio(void *user_data, ClownMDEmu *clownmdemu, size_t frames, void (*generate)(ClownMDEmu*, cc_s16l*, size_t))
{
	(void)user_data;
	if (psg_count + frames > CC_COUNT_OF(psg))
		frames = CC_COUNT_OF(psg) - psg_count;
	generate(clownmdemu, psg + psg_count, frames);
	psg_count += frames;
}

/* No Mega CD, so these never make sound */
static void silent_audio(void *user_data, ClownMDEmu *clownmdemu, size_t frames, void (*generate)(ClownMDEmu*, cc_s16l*, size_t))
{
	(void)user_data; (void)clownmdemu; (void)frames; (void)generate;
}

static cc_s16l clamp(cc_s32l v) { return v > 0x7FFF ? 0x7FFF : v < -0x7FFF ? -0x7FFF : (cc_s16l)v; }

/* Mixes this frame's FM and PSG at the FM rate (each FM frame gets the
   average of the PSG samples it spans), then resamples that to 44100 Hz */
static void mix(void)
{
	static cc_s32l mixed[2049 * 2];
	size_t i, n = fm_count;

	if (n == 0)
		return;

	mixed[0] = previous[0];
	mixed[1] = previous[1];

	for (i = 0; i < n; ++i)
	{
		const size_t from = i * psg_count / n, to = (i + 1) * psg_count / n;
		cc_s32l sum = 0;
		size_t j;

		for (j = from; j < to; ++j)
			sum += psg[j];
		if (to > from)
			sum /= (cc_s32l)(to - from);
		sum /= CLOWNMDEMU_PSG_VOLUME_DIVISOR;

		mixed[(i + 1) * 2 + 0] = fm[i * 2 + 0] / CLOWNMDEMU_FM_VOLUME_DIVISOR + sum;
		mixed[(i + 1) * 2 + 1] = fm[i * 2 + 1] / CLOWNMDEMU_FM_VOLUME_DIVISOR + sum;
	}

	while (position < n && sample_count + 2 <= (int)CC_COUNT_OF(samples))
	{
		const size_t at = (size_t)position;
		const double t = position - at;

		samples[sample_count++] = clamp((cc_s32l)(mixed[at * 2 + 0] + (mixed[at * 2 + 2] - mixed[at * 2 + 0]) * t));
		samples[sample_count++] = clamp((cc_s32l)(mixed[at * 2 + 1] + (mixed[at * 2 + 3] - mixed[at * 2 + 1]) * t));
		position += step;
	}

	position -= n;
	if (position < 0)
		position = 0;
	previous[0] = mixed[n * 2 + 0];
	previous[1] = mixed[n * 2 + 1];
}

/* ---------- Mega CD (unused) ---------- */

static void cd_seeked(void *user_data, cc_u32f sector) { (void)user_data; (void)sector; }
static void cd_sector_read(void *user_data, cc_u16l *buffer) { (void)user_data; memset(buffer, 0, 2048); }
static cc_bool cd_track_seeked(void *user_data, cc_u16f track, ClownMDEmu_CDDAMode mode) { (void)user_data; (void)track; (void)mode; return cc_false; }
static size_t cd_audio_read(void *user_data, cc_s16l *buffer, size_t frames) { (void)user_data; (void)buffer; (void)frames; return 0; }
static cc_bool save_file_opened(void *user_data, const char *name) { (void)user_data; (void)name; return cc_false; }
static cc_s16f save_file_read(void *user_data) { (void)user_data; return -1; }
static void save_file_written(void *user_data, cc_u8f byte) { (void)user_data; (void)byte; }
static void save_file_closed(void *user_data) { (void)user_data; }
static cc_bool save_file_size(void *user_data, const char *name, size_t *size) { (void)user_data; (void)name; (void)size; return cc_false; }

/* ---------- region ---------- */

/* The regions a game is made for, from the region field of its header: old
   games list letters (J, U, E), newer ones a hex digit with a bit each for
   Japan (1), the Americas (4) and Europe (8). Returns those bits, or 0 when
   the field is empty or unreadable. */
#define REGION_JAPAN 1
#define REGION_AMERICAS 4
#define REGION_EUROPE 8

static int regions(const unsigned char *data, int length)
{
	int i, bits = 0;

	for (i = 0x1F0; i < 0x1F3 && i < length; ++i)
	{
		const int c = data[i];

		if (c == 'J') bits |= REGION_JAPAN;
		else if (c == 'U') bits |= REGION_AMERICAS;
		else if (c == 'E') bits |= REGION_EUROPE;
		else if (i == 0x1F0 && ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F')))
			return (c <= '9' ? c - '0' : c - 'A' + 10) & (REGION_JAPAN | REGION_AMERICAS | REGION_EUROPE);
	}

	return bits;
}

EMSCRIPTEN_KEEPALIVE unsigned char* md_alloc(int size) { return (unsigned char*)malloc(size); }
EMSCRIPTEN_KEEPALIVE void md_free(unsigned char *p) { free(p); }

/* Loads a cartridge. Returns 0 on failure, 1 for a 60 Hz game, 2 for a
   50 Hz (European only) one. */
EMSCRIPTEN_KEEPALIVE int md_load(const unsigned char *data, int length, const char *name)
{
	const int made_for = regions(data, length);
	/* Made only for 50 Hz European consoles, or only for Japanese ones */
	const cc_bool pal = made_for == REGION_EUROPE;
	const cc_bool japan = made_for == REGION_JAPAN;
	const size_t words = (size_t)(length + 1) / 2;
	size_t i;

	(void)name;

	if (length < 0x200 || length > 0x400000)
		return 0;

	if (!ready)
	{
		ClownMDEmu_InitialConfiguration configuration;

		memset(&configuration, 0, sizeof(configuration));
		configuration.general.region = CLOWNMDEMU_REGION_OVERSEAS;

		callbacks.user_data = NULL;
		callbacks.colour_updated = colour_updated;
		callbacks.scanline_rendered = scanline_rendered;
		callbacks.input_requested = input_requested;
		callbacks.fm_audio_to_be_generated = fm_audio;
		callbacks.psg_audio_to_be_generated = psg_audio;
		callbacks.pcm_audio_to_be_generated = silent_audio;
		callbacks.cdda_audio_to_be_generated = silent_audio;
		callbacks.cd_seeked = cd_seeked;
		callbacks.cd_sector_read = cd_sector_read;
		callbacks.cd_track_seeked = cd_track_seeked;
		callbacks.cd_audio_read = cd_audio_read;
		callbacks.save_file_opened_for_reading = save_file_opened;
		callbacks.save_file_read = save_file_read;
		callbacks.save_file_opened_for_writing = save_file_opened;
		callbacks.save_file_written = save_file_written;
		callbacks.save_file_closed = save_file_closed;
		callbacks.save_file_removed = save_file_opened;
		callbacks.save_file_size_obtained = save_file_size;
		callbacks.sound_chip_written = NULL;

		ClownMDEmu_Constant_Initialise();
		ClownMDEmu_Initialise(&emulator, &configuration, &callbacks);
		ready = cc_true;
	}

	free(rom);
	rom = (cc_u16l*)malloc(words * sizeof(cc_u16l));
	if (rom == NULL)
		return 0;
	/* The 68000 is big-endian; an odd last byte gets a zero after it */
	for (i = 0; i < words; ++i)
		rom[i] = data[i * 2] << 8 | (i * 2 + 1 < (size_t)length ? data[i * 2 + 1] : 0);

	emulator.configuration.region = japan ? CLOWNMDEMU_REGION_DOMESTIC : CLOWNMDEMU_REGION_OVERSEAS;
	emulator.configuration.tv_standard = pal ? CLOWNMDEMU_TV_STANDARD_PAL : CLOWNMDEMU_TV_STANDARD_NTSC;
	step = (double)(pal ? CLOWNMDEMU_FM_SAMPLE_RATE_PAL : CLOWNMDEMU_FM_SAMPLE_RATE_NTSC) / OUTPUT_RATE;

	memset(colours, 0, sizeof(colours));
	memset(screen, 0, sizeof(screen));
	held[0] = held[1] = 0;
	sample_count = 0;
	position = 0;
	previous[0] = previous[1] = 0;

	ClownMDEmu_SetCartridge(&emulator, rom, words);
	ClownMDEmu_HardReset(&emulator, cc_true, cc_false);
	return pal ? 2 : 1;
}

/* The console's reset button: the game starts over, and its save stays */
EMSCRIPTEN_KEEPALIVE void md_reset(void) { ClownMDEmu_SoftReset(&emulator, cc_true, cc_false); }

/* Keys are one bit per ClownMDEmu_Button: 0x01 up, 0x02 down, 0x04 left,
   0x08 right, 0x10 A, 0x20 B, 0x40 C, 0x80 X, 0x100 Y, 0x200 Z,
   0x400 Start, 0x800 Mode */
EMSCRIPTEN_KEEPALIVE void md_button(int player, int key, int pressed)
{
	if (player < 0 || player > 1)
		return;
	if (pressed) held[player] |= key;
	else held[player] &= ~key;
}

/* Runs one frame, drawing it unless draw is 0 (to catch up when behind).
   Returns the picture's size as width << 16 | height: games can change it
   while they run. */
EMSCRIPTEN_KEEPALIVE int md_frame(int draw)
{
	drawing = draw;
	/* The core adds its sound to what's in the buffers */
	memset(fm, 0, fm_count * 2 * sizeof(*fm));
	memset(psg, 0, psg_count * sizeof(*psg));
	fm_count = psg_count = 0;
	ClownMDEmu_Iterate(&emulator);
	mix();
	return (int)(screen_width << 16 | screen_height);
}

/* How wide the last picture looks on a TV, in pixels as tall as its lines:
   the 256-pixel mode fills the same width as the 320-pixel one, and
   Interlace Mode 2 doubles the lines */
EMSCRIPTEN_KEEPALIVE int md_display_width(void) { return screen_height > 300 ? 640 : 320; }

/* The last drawn frame, RGBA, as wide as md_frame said */
EMSCRIPTEN_KEEPALIVE unsigned char* md_screen(void) { return screen; }

/* Sound since the last call: interleaved stereo int16 at 44100 Hz.
   md_sample_count is the number of int16 values; md_samples hands them over
   and starts afresh. */
EMSCRIPTEN_KEEPALIVE int md_sample_count(void) { return sample_count; }
EMSCRIPTEN_KEEPALIVE cc_s16l* md_samples(void) { sample_count = 0; return samples; }

/* Battery-backed cartridge RAM, where games save: size (0 when there's
   none), and where it lives */
EMSCRIPTEN_KEEPALIVE int md_battery_size(void)
{
	return emulator.state.external_ram.non_volatile ? (int)emulator.state.external_ram.size : 0;
}
EMSCRIPTEN_KEEPALIVE unsigned char* md_battery(void) { return (unsigned char*)emulator.state.external_ram.buffer; }

/* Snapshots, for picking up where the player left off: the core's state
   and the colour table, after a tag with their size. md_state_save returns
   the size written, or 0. */
typedef struct Snapshot
{
	char tag[4];
	cc_u32l size;
	ClownMDEmu_StateBackup state;
	cc_u32l colours[16 * 4 * 3];
} Snapshot;

EMSCRIPTEN_KEEPALIVE int md_state_size(void) { return sizeof(Snapshot); }

EMSCRIPTEN_KEEPALIVE int md_state_save(unsigned char *out, int room)
{
	Snapshot *s = (Snapshot*)out;

	if (room < (int)sizeof(Snapshot))
		return 0;
	memcpy(s->tag, "CMDS", 4);
	s->size = sizeof(Snapshot);
	ClownMDEmu_SaveState(&emulator, &s->state);
	memcpy(s->colours, colours, sizeof(colours));
	return sizeof(Snapshot);
}

EMSCRIPTEN_KEEPALIVE int md_state_load(const unsigned char *data, int size)
{
	const Snapshot *s = (const Snapshot*)data;

	if (size != (int)sizeof(Snapshot) || memcmp(s->tag, "CMDS", 4) != 0 || s->size != sizeof(Snapshot))
		return 0;
	ClownMDEmu_LoadState(&emulator, &s->state);
	memcpy(colours, s->colours, sizeof(colours));
	return 1;
}
