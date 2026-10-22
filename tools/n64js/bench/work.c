// Game-like CPU work for the N64 test cartridge: per frame, animate actors'
// skeletons (keyframe interpolation, rotation matrices, hierarchy), convert
// to the N64's fixed-point matrices, write matrix commands to a display
// list, move actors with simple collision, and sort them by depth. For
// measuring n64js's recompiler; not part of the build. Built with Zig's
// clang (https://ziglang.org, 0.13), for MIPS III like the N64's CPU:
//
//   zig cc -target mips-freestanding-none -mcpu=mips3+fpxx+noabicalls -O2 \
//     -ffreestanding -fno-PIC -G0 -fno-builtin -ffunction-sections -c work.c -o work.o
//   zig ld.lld -T link.ld -e work -o work.elf work.o
//   zig objcopy -O binary work.elf work.bin
//
// then n64TestRom({ work: { code: <work.bin's bytes>, count: 64 } }) (see
// tools/n64-test-rom.mjs) runs it once a frame with 64 characters.
typedef unsigned int u32;
typedef int s32;
typedef short s16;
typedef unsigned short u16;

void *memcpy(void *d, const void *s, unsigned n) { char *a = d; const char *b = s; while (n--) *a++ = *b++; return d; }
void *memset(void *d, int c, unsigned n) { char *a = d; while (n--) *a++ = c; return d; }

typedef struct { float x, y, z; } Vec3;
typedef struct { float m[4][4]; } Mat4;
typedef struct { s16 i[4][4]; u16 f[4][4]; } Mtx;

#define BONES 20
#define KEYS 8
#define MAX_ACTORS 64

typedef struct {
  Vec3 pos, vel;
  float yaw, phase, depth;
  s32 state, timer;
  Mat4 world[BONES];
} Actor;

static const signed char parent[BONES] = { -1, 0, 1, 2, 3, 2, 5, 6, 2, 8, 9, 0, 11, 12, 0, 14, 15, 1, 17, 18 };
static float keys[BONES][KEYS][3];
static Actor actors[MAX_ACTORS];
static Actor *order[MAX_ACTORS];
static Mtx mtx[MAX_ACTORS * BONES];
static u32 dl[MAX_ACTORS * BONES * 2 + 16];
static int ready;
volatile u32 checksum;

static float sinf_(float x) {
  // range-reduce to [-pi, pi], then a polynomial
  const float pi = 3.14159265f, tau = 6.28318531f;
  while (x > pi) x -= tau;
  while (x < -pi) x += tau;
  float x2 = x * x;
  return x * (1.0f - x2 * (0.16666667f - x2 * (0.0083333310f - x2 * 0.00019840874f)));
}
static float cosf_(float x) { return sinf_(x + 1.57079633f); }

static void rotation(Mat4 *m, float rx, float ry, float rz, const Vec3 *t) {
  float sx = sinf_(rx), cx = cosf_(rx), sy = sinf_(ry), cy = cosf_(ry), sz = sinf_(rz), cz = cosf_(rz);
  m->m[0][0] = cy * cz; m->m[0][1] = cy * sz; m->m[0][2] = -sy; m->m[0][3] = 0;
  m->m[1][0] = sx * sy * cz - cx * sz; m->m[1][1] = sx * sy * sz + cx * cz; m->m[1][2] = sx * cy; m->m[1][3] = 0;
  m->m[2][0] = cx * sy * cz + sx * sz; m->m[2][1] = cx * sy * sz - sx * cz; m->m[2][2] = cx * cy; m->m[2][3] = 0;
  m->m[3][0] = t->x; m->m[3][1] = t->y; m->m[3][2] = t->z; m->m[3][3] = 1;
}

static void mul(Mat4 *out, const Mat4 *a, const Mat4 *b) {
  for (int i = 0; i < 4; i++)
    for (int j = 0; j < 4; j++)
      out->m[i][j] = a->m[i][0] * b->m[0][j] + a->m[i][1] * b->m[1][j] + a->m[i][2] * b->m[2][j] + a->m[i][3] * b->m[3][j];
}

// as libultra's guMtxF2L
static void toFixed(Mtx *out, const Mat4 *m) {
  for (int i = 0; i < 4; i++)
    for (int j = 0; j < 4; j++) {
      s32 v = (s32)(m->m[i][j] * 65536.0f);
      out->i[i][j] = (s16)(v >> 16);
      out->f[i][j] = (u16)v;
    }
}

static void setup(void) {
  u32 seed = 12345;
  for (int b = 0; b < BONES; b++)
    for (int k = 0; k < KEYS; k++)
      for (int c = 0; c < 3; c++) {
        seed = seed * 1103515245 + 12345;
        keys[b][k][c] = (float)((s32)(seed >> 16) & 0x3ff) / 512.0f - 1.0f;
      }
  for (int a = 0; a < MAX_ACTORS; a++) {
    actors[a].pos.x = (float)(a % 8) * 40.0f - 160.0f;
    actors[a].pos.z = (float)(a / 8) * 40.0f - 160.0f;
    actors[a].vel.x = (float)((a * 7) % 5 - 2) * 0.5f;
    actors[a].vel.z = (float)((a * 3) % 5 - 2) * 0.5f;
    actors[a].phase = (float)a * 0.37f;
  }
  ready = 1;
}

static void animate(Actor *a, u32 frame) {
  float t = a->phase + (float)frame * 0.05f;
  int k0 = (int)t;
  float f = t - (float)k0;
  k0 &= KEYS - 1;
  int k1 = (k0 + 1) & (KEYS - 1);
  Mat4 local;
  Vec3 offset = { 0, 12.0f, 0 };
  for (int b = 0; b < BONES; b++) {
    const float *p = keys[b][k0], *q = keys[b][k1];
    float rx = p[0] + (q[0] - p[0]) * f, ry = p[1] + (q[1] - p[1]) * f, rz = p[2] + (q[2] - p[2]) * f;
    if (b == 0) {
      Vec3 at = a->pos;
      rotation(&local, rx * 0.1f, a->yaw + ry * 0.1f, rz * 0.1f, &at);
      a->world[0] = local;
    } else {
      rotation(&local, rx, ry, rz, &offset);
      mul(&a->world[b], &local, &a->world[(int)parent[b]]);
    }
  }
}

static void move(Actor *a) {
  a->pos.x += a->vel.x;
  a->pos.z += a->vel.z;
  if (a->pos.x > 200.0f || a->pos.x < -200.0f) { a->vel.x = -a->vel.x; a->state ^= 1; }
  if (a->pos.z > 200.0f || a->pos.z < -200.0f) { a->vel.z = -a->vel.z; a->state ^= 2; }
  a->yaw += a->state & 1 ? 0.02f : -0.02f;
  if (++a->timer > 120) { a->timer = 0; a->state = (a->state + 1) & 3; }
  a->depth = a->pos.z * 0.8f + a->pos.x * 0.2f;
}

void work(u32 frame, u32 count) {
  if (!ready) setup();
  if (count > MAX_ACTORS) count = MAX_ACTORS;
  for (u32 a = 0; a < count; a++) { move(&actors[a]); animate(&actors[a], frame); order[a] = &actors[a]; }
  // insertion sort by depth, far first
  for (u32 i = 1; i < count; i++) {
    Actor *x = order[i];
    int j = (int)i - 1;
    while (j >= 0 && order[j]->depth < x->depth) { order[j + 1] = order[j]; j--; }
    order[j + 1] = x;
  }
  u32 n = 0, sum = 0;
  for (u32 a = 0; a < count; a++)
    for (int b = 0; b < BONES; b++) {
      Mtx *m = &mtx[a * BONES + b];
      toFixed(m, &order[a]->world[b]);
      dl[n++] = 0x01020040;   // G_MTX, model view, load
      dl[n++] = (u32)m & 0x1fffffff;
      sum += (u32)m->i[3][0] + m->f[0][0];
    }
  dl[n++] = 0xb8000000;
  dl[n++] = 0;
  checksum = sum;
}
