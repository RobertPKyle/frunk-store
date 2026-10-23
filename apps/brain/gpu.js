// Brain Test graphics part: draws a ray-marched brain into a fixed-size
// WebGL2 canvas as many times as it can. Every pixel takes the same number
// of steps (the march never stops early), so each frame costs the same on
// every device and the count of frames is a fair measure.
//
// Drawing is batched: after each batch, reading one pixel back waits for the
// GPU to finish, and the batch doubles until it takes 4 ms, so the wait
// doesn't hide how fast a quick GPU is. Batches run until about 24 ms of
// each display frame are used, so the page keeps drawing on screen.

export const WIDTH = 480, HEIGHT = 270;

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 color;
uniform float t;
uniform float aspect;

// a sphere with folds, a little squashed: close enough to a brain
float brain(vec3 q) {
  float c = cos(t * 0.6), s = sin(t * 0.6);
  q.xz = mat2(c, -s, s, c) * q.xz;
  q *= vec3(0.95, 1.12, 0.82);
  float folds = sin(9.0 * q.x + 2.0 * sin(5.0 * q.y)) * sin(9.0 * q.y + 2.0 * sin(5.0 * q.z)) * sin(9.0 * q.z + 2.0 * sin(5.0 * q.x));
  float split = 0.08 * exp(-40.0 * q.x * q.x);
  return length(q) - 1.0 + 0.05 * folds + split;
}

vec3 normal(vec3 q) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(brain(q + e.xyy) - brain(q - e.xyy), brain(q + e.yxy) - brain(q - e.yxy), brain(q + e.yyx) - brain(q - e.yyx)));
}

void main() {
  vec3 ro = vec3(0.0, 0.0, 3.2);
  vec3 rd = normalize(vec3(uv * vec2(aspect, 1.0), -1.9));
  float d = 0.0, hit = 0.0;
  for (int i = 0; i < 56; i++) {
    float h = brain(ro + rd * d);
    // keeps marching after a hit, by tiny steps, so the cost never changes
    hit = max(hit, step(h, 0.002));
    d += mix(h * 0.7, 0.0002, hit);
  }
  vec3 bg = mix(vec3(0.03, 0.04, 0.08), vec3(0.09, 0.05, 0.14), uv.y * 0.5 + 0.5);
  vec3 q = ro + rd * d, n = normal(q);
  vec3 l = normalize(vec3(0.6, 0.8, 0.9));
  float diff = max(dot(n, l), 0.0), rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  float spec = pow(max(dot(reflect(-l, n), -rd), 0.0), 24.0);
  vec3 col = vec3(0.95, 0.45, 0.62) * (0.18 + 0.82 * diff) + vec3(0.4, 0.8, 1.0) * rim * 0.9 + spec * 0.35;
  color = vec4(mix(bg, col, hit), 1.0);
}`;

// A drawer for the canvas, or null without WebGL2. The test always draws
// at WIDTH x HEIGHT; the share card asks for a bigger picture.
export function setup(canvas, width = WIDTH, height = HEIGHT) {
  canvas.width = width; canvas.height = height;
  const gl = canvas.getContext('webgl2', { antialias: false, depth: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, width, height);
  gl.uniform1f(gl.getUniformLocation(prog, 'aspect'), width / height);
  const tLoc = gl.getUniformLocation(prog, 't');
  const pixel = new Uint8Array(4);
  let frames = 0;
  return {
    // draws n frames and waits for the GPU to finish them
    draw(n) {
      for (let i = 0; i < n; i++) { gl.uniform1f(tLoc, frames++ * 0.03); gl.drawArrays(gl.TRIANGLES, 0, 3); }
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    },
    lost: () => gl.isContextLost(),
  };
}

// Measures frames per second for `seconds` after `warm` seconds of warm-up.
// onProgress(fraction, fps so far); signal stops it early.
export function measure(drawer, { seconds, warm, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    let batch = 1, frames = 0, busy = 0;
    const start = performance.now();
    const tick = () => {
      if (signal.aborted) return reject(new DOMException('stopped', 'AbortError'));
      if (drawer.lost()) return reject(new Error('The graphics chip reset during the test.'));
      const frameStart = performance.now();
      const counting = frameStart - start >= warm * 1000;
      while (performance.now() - frameStart < 24) {
        const t0 = performance.now();
        drawer.draw(batch);
        const took = performance.now() - t0;
        if (counting) { frames += batch; busy += took; }
        if (took < 4) batch *= 2;
        else if (took > 16 && batch > 1) batch >>= 1;
      }
      const elapsed = (performance.now() - start) / 1000 - warm;
      const fps = busy ? frames / (busy / 1000) : 0;
      onProgress(Math.max(0, Math.min(1, elapsed / seconds)), fps);
      if (elapsed >= seconds) resolve(fps);
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
