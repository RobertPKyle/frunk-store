// One render thread. Shares the WASM memory with the page and the other
// workers, renders its slice of rows, then reports back.
let render;

onmessage = async ({ data }) => {
  if (data.type === 'init') {
    const instance = await WebAssembly.instantiate(data.module, { env: { mem: data.memory } });
    render = instance.exports.render;
    postMessage({ type: 'ready' });
    return;
  }
  const { id, y0, ystep, w, h, cx, cy, scale, maxIter } = data;
  render(y0, ystep, w, h, cx, cy, scale, maxIter);
  postMessage({ type: 'done', id });
};
