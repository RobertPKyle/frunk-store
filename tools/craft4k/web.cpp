// Craft 4K's front end: Minecraft4k-CPP's Minecraft4k.cpp (game loop,
// player physics, day and night) for the browser, under the same license
// (GNU GPL 3). The page (apps/craft4k/craft4k.js) calls these functions; it
// owns the canvas size, the input and the saving.
//
// The original ray-marches the world in an OpenGL 4.3 compute shader, which
// WebGL 2 doesn't have. Here res/raytrace.comp is a fragment shader drawn
// over the whole canvas: the canvas is the screen texture (the page scales
// it up with sharp pixels, as the original's NEAREST filter did), the world
// is an R8UI 3D texture read with texelFetch, and the rest is unchanged
// apart from three things the original left unfinished or never needed:
// - a step limit, since two facing mirrors would otherwise reflect a ray
//   forever and the browser loses the GPU,
// - the pointed-at block's white outline, from Notch's Minecraft4k,
// - square pixels on any screen shape, where the original stretched to 16:9.
//
// The original also never got as far as breaking and placing blocks (its
// raycast() call is commented out); c4k_break() and c4k_place() add them, as
// Notch's Minecraft4k had them: within reach of the eye, never into the
// player.

#include <emscripten/emscripten.h>
#include <emscripten/html5.h>
#include <GLES3/gl3.h>

#include <cmath>
#include <vector>

#include "Constants.h"
#include "TextureGenerator.h"
#include "Util.h"
#include "World.h"

static const char* VERT = R"(#version 300 es
void main() {
    // one triangle over the whole screen
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
}
)";

// res/raytrace.comp as a fragment shader
static const char* FRAG = R"(#version 300 es
precision highp float;
precision highp int;
precision highp usampler3D;

#define WORLD_SIZE 512
#define WORLD_HEIGHT 64
#define TEXTURE_RES 16
#define MAX_STEPS 600

#define BLOCK_AIR 0
#define BLOCK_MIRROR 9

uniform highp usampler3D blockData;
uniform sampler2D textureAtlas;

struct Camera
{
    vec3 pos;
    float cosYaw;
    float cosPitch;
    float sinYaw;
    float sinPitch;
    vec2 frustumDiv;
};
uniform Camera camera;

uniform vec2 screenSize;
uniform float renderDist;

// lighting
uniform vec3 lightDirection;
uniform vec3 ambColor;
uniform vec3 skyColor;
uniform vec3 sunColor;

// the block the player points at, outlined; y is -100 when none
uniform ivec3 hovered;

out vec4 fragColor;

// get the block at the specified position in the world
int getBlock(ivec3 coords)
{
    if (coords.y < 0) // the two layers above the world are air
        return BLOCK_AIR;
    return int(texelFetch(blockData, coords, 0).x);
}

bool inWorld(ivec3 pos)
{
    return all(greaterThanEqual(pos, ivec3(0, -2, 0))) && all(lessThan(pos, ivec3(WORLD_SIZE, WORLD_HEIGHT, WORLD_SIZE)));
}

#define AXIS_X 0
#define AXIS_Y 1
#define AXIS_Z 2

#define updateVelocityFields()\
    ijk = ivec3(floor(start));\
    ijkStep = ivec3(sign(velocity));\
    vInverted = abs(1.0 / velocity);\
    dist = -fract(start) * vec3(ijkStep);\
    dist += max(vec3(ijkStep), vec3(0));\
    dist *= vInverted


// ~~stolen~~ took "inspiration" from https://github.com/Vercidium/voxel-ray-marching/blob/master/source/Map.cs

// Voxel ray marching from http://www.cse.chalmers.se/edu/year/2010/course/TDA361/grid.pdf
vec3 rayMarch(in vec3 start, in vec3 velocity, in float maximum, in vec3 fogColor, in ivec3 outline, out bool hit, out vec3 hitPos, out float rayTravelDist)
{
    ivec3 ijk;
    ivec3 ijkStep;
    vec3 vInverted;
    vec3 dist;

    updateVelocityFields();

    int axis = AXIS_X;

    rayTravelDist = 0.0;
    hit = false;
    hitPos = start;

    for (int n = 0; n < MAX_STEPS && rayTravelDist <= maximum; n++)
    {
        // Exit check
        if (!inWorld(ijk))
            break;

        int blockHit = getBlock(ijk);

        if (blockHit != BLOCK_AIR)
        {
            hitPos = start + velocity * rayTravelDist;

            if (blockHit == BLOCK_MIRROR)
            {
                // the ray goes on from the block in front of the mirror's
                // face, a whole block from that face's next boundary
                ivec3 front = ijk;
                front[axis] -= ijkStep[axis];

                velocity[axis] = -velocity[axis]; // reflect!
                start = hitPos;
                maximum -= rayTravelDist;

                updateVelocityFields();
                ijk = front;
                dist[axis] = vInverted[axis];
            } else {

                // side of block
                int texFetchX = int(mod((hitPos.x + hitPos.z) * float(TEXTURE_RES), float(TEXTURE_RES)));
                int texFetchY = int(mod(hitPos.y * float(TEXTURE_RES), float(TEXTURE_RES)) + float(TEXTURE_RES));


                if (axis == AXIS_Y) // we hit the top/bottom of block
                {
                    texFetchX = int(mod(hitPos.x * float(TEXTURE_RES), float(TEXTURE_RES)));
                    texFetchY = int(mod(hitPos.z * float(TEXTURE_RES), float(TEXTURE_RES)));

                    if (velocity.y < 0.0) // looking at the underside of a block
                        texFetchY += TEXTURE_RES * 2;
                }

                vec3 textureColor = texelFetch(textureAtlas, ivec2(texFetchX + blockHit * TEXTURE_RES, texFetchY), 0).rgb;


                if (dot(textureColor, textureColor) != 0.0) { // pixel is not transparent

                    hit = true;
                    hitPos = start + velocity * (rayTravelDist - 0.01);

                    int edgeY = texFetchY % TEXTURE_RES;
                    if (ijk == outline && (texFetchX == 0 || texFetchX == TEXTURE_RES - 1 || edgeY == 0 || edgeY == TEXTURE_RES - 1))
                        textureColor = vec3(1.0);

                    float lightIntensity = 1.0 + (-sign(velocity[axis]) * lightDirection[axis]) / 2.0;

                    return textureColor * mix(ambColor, sunColor, lightIntensity);
                }
            }
        }

        // Determine the closest voxel boundary
        if (dist.y < dist.x)
        {
            if (dist.y < dist.z)
            {
                // Advance to the closest voxel boundary in the Y direction

                // Increment the chunk-relative position and the block access position
                ijk.y += ijkStep.y;

                // Update our progress in the ray
                rayTravelDist = dist.y;

                // Set the new distance to the next voxel Y boundary
                dist.y += vInverted.y;

                // For collision purposes we also store the last axis that the ray collided with
                // This allows us to reflect particle velocity on the correct axis
                axis = AXIS_Y;
            }
            else
            {
                ijk.z += ijkStep.z;

                rayTravelDist = dist.z;
                dist.z += vInverted.z;
                axis = AXIS_Z;
            }
        }
        else if (dist.x < dist.z)
        {
            ijk.x += ijkStep.x;

            rayTravelDist = dist.x;
            dist.x += vInverted.x;
            axis = AXIS_X;
        }
        else
        {
            ijk.z += ijkStep.z;

            rayTravelDist = dist.z;
            dist.z += vInverted.z;
            axis = AXIS_Z;
        }
    }

    hit = false;

    return fogColor; // sky
}

vec3 getPixel(in vec2 pixel_coords)
{
    vec2 frustumRay = (pixel_coords - (0.5 * screenSize)) / camera.frustumDiv;

    // rotate frustum space to world space
    float temp = camera.cosPitch + frustumRay.y * camera.sinPitch;

    vec3 rayDir = normalize(vec3(frustumRay.x * camera.cosYaw + temp * camera.sinYaw,
                                 frustumRay.y * camera.cosPitch - camera.sinPitch,
                                 temp * camera.cosYaw - frustumRay.x * camera.sinYaw));


    vec3 fogColor = mix(skyColor, sunColor, 0.5 * pow(clamp(dot(rayDir, lightDirection), 0.0, 1.0) + 0.2, 5.0));

    // raymarch outputs
    vec3 hitPos;
    bool hit;
    float hitDist;
    vec3 color = rayMarch(camera.pos, rayDir, renderDist, fogColor, hovered, hit, hitPos, hitDist);

    if (hit)
    {
        float shadowMult = (1.0 - lightDirection.y) * 0.3;

        if (lightDirection.y < 0.0) { // day
            float ignoreHitDist = 0.0;
            vec3 ignorePos;
            bool shadowHit;
            rayMarch(hitPos, lightDirection, renderDist / 2.0, fogColor, ivec3(-1, -100, -1), shadowHit, ignorePos, ignoreHitDist);


            if (shadowHit) // we can't see the sun
                shadowMult *= 1.0 - -lightDirection.y * 0.3;

        } else {
            shadowMult = (1.0 - lightDirection.y) * 0.3; // night
        }

        color = color * shadowMult; // apply shadow

        if (hitDist > renderDist * 0.95) {
            float fogIntensity = ((hitDist - renderDist * 0.95) / (renderDist * 0.05));

            color = mix(color, fogColor, fogIntensity);
        }
    }

    return color;
}

void main() {
    // the compute shader's pixel coordinates: whole pixels, row 0 at the top
    vec2 pixel_coords = vec2(floor(gl_FragCoord.x), screenSize.y - 1.0 - floor(gl_FragCoord.y));

    fragColor = vec4(getPixel(pixel_coords), 1.0);
}
)";

struct Controller
{
    float forward;
    float right;

    bool jump;
};

static Controller controller{};

constexpr float defaultRows = 120.0f;

static GLuint program;
static GLuint vao;
static GLuint textureAtlasTex;
static GLuint worldTexture;
static bool worldUploaded = false;
static std::vector<int> changedBlocks;   // indices to send to the GPU
static std::vector<uint32_t> edits;      // index << 8 | block, for the page to save

static GLint uScreenSize, uRenderDist, uCamPos, uCosYaw, uCosPitch, uSinYaw, uSinPitch, uFrustumDiv,
             uLight, uAmb, uSky, uSun, uHovered;

// spawn player at world center
static glm::vec3 playerPos = glm::vec3(WORLD_SIZE / 2.0f + 0.5f,
                                        1,
                                        WORLD_SIZE / 2.0f + 0.5f);
static glm::vec3 playerVelocity;

static glm::vec3 lightDirection = glm::vec3(0.866025404f, -0.866025404f, 0.866025404f);

static float cameraYaw = 0.01f; // make it not axis aligned by default to avoid raymarching error
static float cameraPitch = 0.0f;
static float FOV = 90.0f;

static float sinYaw, sinPitch;
static float cosYaw, cosPitch;

static glm::vec3 sunColor;
static glm::vec3 ambColor;
static glm::vec3 skyColor;

static double lastUpdateTime = -1;

static glm::vec3 lerp(const glm::vec3& start, const glm::vec3& end, const float t)
{
    return start + (end - start) * t;
}

static int blockIndex(const int x, const int y, const int z)
{
    return x + y * WORLD_SIZE + z * WORLD_SIZE * WORLD_HEIGHT;
}

// Changes a block the player changed: in the world, on the GPU, and in the
// edits the page saves
static void changeBlock(const int x, const int y, const int z, const uint8_t block)
{
    if (World::getBlock(x, y, z) == block)
        return;
    World::setBlock(x, y, z, block);
    changedBlocks.push_back(blockIndex(x, y, z));
    edits.push_back(uint32_t(blockIndex(x, y, z)) << 8 | block);
}

static GLuint compile(const GLenum type, const char* source)
{
    const GLuint shader = glCreateShader(type);
    glShaderSource(shader, 1, &source, nullptr);
    glCompileShader(shader);

    GLint ok = 0;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &ok);
    if (!ok) {
        char log[1024];
        glGetShaderInfoLog(shader, sizeof(log), nullptr, log);
        emscripten_log(EM_LOG_ERROR, "shader: %s", log);
    }
    return shader;
}

static bool playerCollidesWith(const int x, const int y, const int z)
{
    for (int colliderIndex = 0; colliderIndex < 12; colliderIndex++) {
        const int magicX = int(playerPos.x +       (colliderIndex       & 1) * 0.6F - 0.3F);
        const int magicY = int(playerPos.y + float((colliderIndex >> 2) - 1) * 0.8F + 0.65F);
        const int magicZ = int(playerPos.z +       (colliderIndex >> 1  & 1) * 0.6F - 0.3F);

        if (magicX == x && magicY == y && magicZ == z)
            return true;
    }
    return false;
}

static void collidePlayer()
{
    // check for movement on each axis individually?
    for (int axis = 0; axis < 3; axis++) {
        bool moveValid = true;

        const glm::vec3 newPlayerPos = glm::vec3(playerPos.x + playerVelocity.x * (axis == 0),
                                                 playerPos.y + playerVelocity.y * (axis == 1),
                                                 playerPos.z + playerVelocity.z * (axis == 2));

        for (int colliderIndex = 0; colliderIndex < 12; colliderIndex++) {
            // magic
            const glm::vec3 colliderBlockPos = glm::vec3((newPlayerPos.x + (colliderIndex       % 2) * 0.6f - 0.3f ),
                                                         (newPlayerPos.y + (colliderIndex / 4   - 1) * 0.8f + 0.65f),
                                                         (newPlayerPos.z + (colliderIndex / 2   % 2) * 0.6f - 0.3f ));

            if (colliderBlockPos.y < 0) // ignore collision above the world height limit
                continue;

            // check collision with world bounds and blocks
            if (!World::isWithinWorld(colliderBlockPos)
                || World::getBlock(colliderBlockPos) != BLOCK_AIR) {

                if (axis == 1) // AXIS_Y
                {
                    // if we're falling, colliding, and we press space
                    if (controller.jump && playerVelocity.y > 0.0f) {

                        playerVelocity.y = -0.1F; // jump
                    }
                    else { // we're on the ground, not jumping

                        playerVelocity.y = 0.0f; // prevent accelerating downwards infinitely
                    }
                }

                moveValid = false;
                break;
            }
        }

        if (moveValid) {
            playerPos = newPlayerPos;
        }
    }
}

// The block the eye looks at within reach, and the empty block in front of
// the face it looks at. The ray march of the shader, on the CPU.
static bool pick(glm::ivec3& hitBlock, glm::ivec3& placeBlock)
{
    glm::vec3 dir = glm::vec3(cosPitch * sinYaw, -sinPitch, cosPitch * cosYaw);
    for (int i = 0; i < 3; i++)
        if (dir[i] == 0.0f)
            dir[i] = 1e-6f;

    glm::ivec3 ijk = glm::ivec3(glm::floor(playerPos));
    const glm::ivec3 ijkStep = glm::ivec3(glm::sign(dir));
    const glm::vec3 vInverted = glm::abs(1.0f / dir);
    glm::vec3 dist = (glm::max(glm::vec3(ijkStep), glm::vec3(0)) - glm::fract(playerPos) * glm::vec3(ijkStep)) * vInverted;

    glm::ivec3 before = ijk;
    float rayTravelDist = 0;

    while (rayTravelDist <= PLAYER_REACH) {
        if (World::isWithinWorld(glm::vec3(ijk)) && World::getBlock(ijk.x, ijk.y, ijk.z) != BLOCK_AIR) {
            hitBlock = ijk;
            placeBlock = before;
            return true;
        }

        before = ijk;
        int axis = 2;
        if (dist.x < dist.y && dist.x < dist.z)
            axis = 0;
        else if (dist.y < dist.z)
            axis = 1;

        ijk[axis] += ijkStep[axis];
        rayTravelDist = dist[axis];
        dist[axis] += vInverted[axis];
    }
    return false;
}

static void initWorldTexture()
{
    glGenTextures(1, &worldTexture);
    glActiveTexture(GL_TEXTURE1);
    glBindTexture(GL_TEXTURE_3D, worldTexture);

    // integer textures can't be filtered
    glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_3D, GL_TEXTURE_WRAP_R, GL_CLAMP_TO_EDGE);

    glTexStorage3D(GL_TEXTURE_3D, 1, GL_R8UI, WORLD_SIZE, WORLD_HEIGHT, WORLD_SIZE);
    glActiveTexture(GL_TEXTURE0);
}

extern "C" {

// Makes the WebGL 2 context on #canvas, the shaders and the textures, and
// generates the world from the seed. 0 when the browser has no WebGL 2.
EMSCRIPTEN_KEEPALIVE int c4k_init(const uint32_t seedLow, const uint32_t seedHigh)
{
    EmscriptenWebGLContextAttributes attrs;
    emscripten_webgl_init_context_attributes(&attrs);
    attrs.majorVersion = 2;
    attrs.alpha = false;
    attrs.depth = false;
    attrs.stencil = false;
    attrs.antialias = false;
    attrs.powerPreference = EM_WEBGL_POWER_PREFERENCE_HIGH_PERFORMANCE;

    const EMSCRIPTEN_WEBGL_CONTEXT_HANDLE context = emscripten_webgl_create_context("#canvas", &attrs);
    if (context <= 0 || emscripten_webgl_make_context_current(context) != EMSCRIPTEN_RESULT_SUCCESS)
        return 0;

    program = glCreateProgram();
    glAttachShader(program, compile(GL_VERTEX_SHADER, VERT));
    glAttachShader(program, compile(GL_FRAGMENT_SHADER, FRAG));
    glLinkProgram(program);
    GLint ok = 0;
    glGetProgramiv(program, GL_LINK_STATUS, &ok);
    if (!ok)
        return 0;

    glUseProgram(program);
    glUniform1i(glGetUniformLocation(program, "textureAtlas"), 0);
    glUniform1i(glGetUniformLocation(program, "blockData"), 1);
    uScreenSize = glGetUniformLocation(program, "screenSize");
    uRenderDist = glGetUniformLocation(program, "renderDist");
    uCamPos = glGetUniformLocation(program, "camera.pos");
    uCosYaw = glGetUniformLocation(program, "camera.cosYaw");
    uCosPitch = glGetUniformLocation(program, "camera.cosPitch");
    uSinYaw = glGetUniformLocation(program, "camera.sinYaw");
    uSinPitch = glGetUniformLocation(program, "camera.sinPitch");
    uFrustumDiv = glGetUniformLocation(program, "camera.frustumDiv");
    uLight = glGetUniformLocation(program, "lightDirection");
    uAmb = glGetUniformLocation(program, "ambColor");
    uSky = glGetUniformLocation(program, "skyColor");
    uSun = glGetUniformLocation(program, "sunColor");
    uHovered = glGetUniformLocation(program, "hovered");

    glGenVertexArrays(1, &vao);
    glBindVertexArray(vao);
    glPixelStorei(GL_UNPACK_ALIGNMENT, 1);

    World::generateWorld(uint64_t(seedHigh) << 32 | seedLow);

    glActiveTexture(GL_TEXTURE0);
    textureAtlasTex = generateTextures(151910774187927L);
    glBindTexture(GL_TEXTURE_2D, textureAtlasTex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);

    initWorldTexture();
    return 1;
}

// Sets a block without saving it as an edit: the page's saved edits, after
// c4k_init and before the first frame
EMSCRIPTEN_KEEPALIVE void c4k_set_block(const int index, const int block)
{
    if (index >= 0 && index < WORLD_SIZE * WORLD_HEIGHT * WORLD_SIZE)
        World::world[index] = uint8_t(block);
}

// The blocks the player changed since the last c4k_clear_edits(), as
// index << 8 | block
EMSCRIPTEN_KEEPALIVE uint32_t* c4k_edits() { return edits.data(); }
EMSCRIPTEN_KEEPALIVE int c4k_edit_count() { return int(edits.size()); }
EMSCRIPTEN_KEEPALIVE void c4k_clear_edits() { edits.clear(); }

// The player: x, y, z, yaw, pitch
EMSCRIPTEN_KEEPALIVE float c4k_player(const int i)
{
    const float values[] = { playerPos.x, playerPos.y, playerPos.z, cameraYaw, cameraPitch };
    return i >= 0 && i < 5 ? values[i] : 0;
}

EMSCRIPTEN_KEEPALIVE void c4k_set_player(const float x, const float y, const float z, const float yaw, const float pitch)
{
    playerPos = glm::vec3(x, y, z);
    playerVelocity = glm::vec3(0);
    cameraYaw = yaw;
    cameraPitch = clamp(pitch, -PI / 2.0f, PI / 2.0f);
}

// Walking (-1 to 1 each) and jumping, as the page reads them
EMSCRIPTEN_KEEPALIVE void c4k_input(const float forward, const float right, const int jump)
{
    controller.forward = clamp(forward, -1.0f, 1.0f);
    controller.right = clamp(right, -1.0f, 1.0f);
    controller.jump = jump != 0;
}

// Turns the view by a mouse movement, in pixels
EMSCRIPTEN_KEEPALIVE void c4k_look(const float xOffset, const float yOffset)
{
    cameraYaw += xOffset / 500.0f;
    cameraPitch -= yOffset / 500.0f;

    if(fabs(cameraYaw) > PI)
    {
        if (cameraYaw > 0)
            cameraYaw = -PI - (cameraYaw - PI);
        else
            cameraYaw = PI + (cameraYaw + PI);
    }
    cameraPitch = clamp(cameraPitch, -PI / 2.0f, PI / 2.0f);
}

// Breaks the block looked at; 1 when there was one
EMSCRIPTEN_KEEPALIVE int c4k_break()
{
    glm::ivec3 hit, place;
    if (!pick(hit, place))
        return 0;
    changeBlock(hit.x, hit.y, hit.z, BLOCK_AIR);
    return 1;
}

// Places a block against the one looked at; 1 when it fitted
EMSCRIPTEN_KEEPALIVE int c4k_place(const int block)
{
    glm::ivec3 hit, place;
    if (!pick(hit, place) || !World::isWithinWorld(glm::vec3(place)) || playerCollidesWith(place.x, place.y, place.z))
        return 0;
    changeBlock(place.x, place.y, place.z, uint8_t(block));
    return 1;
}

// One frame: time in ms (the page's clock, which stops while it's hidden),
// the canvas size in pixels and how far to see, in blocks
EMSCRIPTEN_KEEPALIVE void c4k_frame(const double frameTime, const int width, const int height, const float renderDist)
{
    if (!worldUploaded) {
        glActiveTexture(GL_TEXTURE1);
        glTexSubImage3D(GL_TEXTURE_3D, 0, 0, 0, 0, WORLD_SIZE, WORLD_HEIGHT, WORLD_SIZE, GL_RED_INTEGER, GL_UNSIGNED_BYTE, World::world);
        glActiveTexture(GL_TEXTURE0);
        worldUploaded = true;
        changedBlocks.clear();
    }

    if (lastUpdateTime < 0 || frameTime - lastUpdateTime > 1000) // first frame, or back from a pause
        lastUpdateTime = frameTime;

    sinYaw = sin(cameraYaw);
    cosYaw = cos(cameraYaw);
    sinPitch = sin(cameraPitch);
    cosPitch = cos(cameraPitch);

    // A day lasts about a minute, as in the original; this one starts at sunrise
    const float dayTime = float(frameTime) / 10000.0f + PI;
    lightDirection.y = sin(dayTime);
    lightDirection.x = lightDirection.y * 0.5f;
    lightDirection.z = cos(dayTime);

    lightDirection = glm::normalize(lightDirection);


    if (lightDirection.y < 0.0f)
    {
        sunColor = lerp(SC_TWILIGHT, SC_DAY, -lightDirection.y);
        ambColor = lerp(AC_TWILIGHT, AC_DAY, -lightDirection.y);
        skyColor = lerp(YC_TWILIGHT, YC_DAY, -lightDirection.y);
    }
    else {
        sunColor = lerp(SC_TWILIGHT, SC_NIGHT, lightDirection.y);
        ambColor = lerp(AC_TWILIGHT, AC_NIGHT, lightDirection.y);
        skyColor = lerp(YC_TWILIGHT, YC_NIGHT, lightDirection.y);
    }

    while (frameTime - lastUpdateTime > 10)
    {
        const float inputX = controller.right * 0.02F;
        const float inputZ = controller.forward * 0.02F;

        playerVelocity.x *= 0.5F;
        playerVelocity.y *= 0.99F;
        playerVelocity.z *= 0.5F;

        playerVelocity.x += sinYaw * inputZ + cosYaw * inputX;
        playerVelocity.z += cosYaw * inputZ - sinYaw * inputX;
        playerVelocity.y += 0.003F; // gravity


        collidePlayer();

        for (int colliderIndex = 0; colliderIndex < 12; colliderIndex++) {
            int magicX = int(playerPos.x +       (colliderIndex       & 1) * 0.6F - 0.3F);
            int magicY = int(playerPos.y + float((colliderIndex >> 2) - 1) * 0.8F + 0.65F);
            int magicZ = int(playerPos.z +       (colliderIndex >> 1  & 1) * 0.6F - 0.3F);

            // set block to air if inside player
            if (World::isWithinWorld(glm::vec3(magicX, magicY, magicZ)))
                changeBlock(magicX, magicY, magicZ, BLOCK_AIR);
        }

        lastUpdateTime += 10;
    }

    if (!changedBlocks.empty()) {
        glActiveTexture(GL_TEXTURE1);
        for (const int index : changedBlocks) {
            const int x = index % WORLD_SIZE;
            const int y = index / WORLD_SIZE % WORLD_HEIGHT;
            const int z = index / (WORLD_SIZE * WORLD_HEIGHT);
            glTexSubImage3D(GL_TEXTURE_3D, 0, x, y, z, 1, 1, 1, GL_RED_INTEGER, GL_UNSIGNED_BYTE, &World::world[index]);
        }
        glActiveTexture(GL_TEXTURE0);
        changedBlocks.clear();
    }

    glm::ivec3 hovered(-1, -100, -1), place;
    if (!pick(hovered, place))
        hovered = glm::ivec3(-1, -100, -1);

    // Compute the raytracing! The same field of view across the height as
    // the original's 16:9 window, with square pixels
    const float frustumDiv = height * FOV / defaultRows;

    glViewport(0, 0, width, height);
    glUseProgram(program);
    glUniform2f(uScreenSize, float(width), float(height));
    glUniform1f(uRenderDist, renderDist);
    glUniform1f(uCosYaw, cosYaw);
    glUniform1f(uCosPitch, cosPitch);
    glUniform1f(uSinYaw, sinYaw);
    glUniform1f(uSinPitch, sinPitch);
    glUniform2f(uFrustumDiv, frustumDiv, frustumDiv);
    glUniform3f(uCamPos, playerPos.x, playerPos.y, playerPos.z);
    glUniform3f(uLight, lightDirection.x, lightDirection.y, lightDirection.z);
    glUniform3f(uSky, skyColor.x, skyColor.y, skyColor.z);
    glUniform3f(uAmb, ambColor.x, ambColor.y, ambColor.z);
    glUniform3f(uSun, sunColor.x, sunColor.y, sunColor.z);
    glUniform3i(uHovered, hovered.x, hovered.y, hovered.z);

    glDrawArrays(GL_TRIANGLES, 0, 3);
}

}
