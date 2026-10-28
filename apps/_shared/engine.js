// Loads an Emscripten engine's wasm while counting what has arrived, so a
// big engine (Adventure Games' 33 MB, Arcade's 39 MB) shows its progress
// instead of a "Starting…" that looks stuck on a weak connection. Give the
// result to the engine as Module.instantiateWasm; it still compiles while
// the file streams in. progress(got, total) comes once per megabyte,
// arrived() when the whole file is in.
//
// Vercel sends the wasm compressed and without its length, so a one-byte
// range request alongside asks for the real size. Where that isn't known
// (an older cached copy, no connection) the count goes on without a total.

export function wasmProgress(url, { progress, arrived, failed }) {
  return (imports, done) => {
    (async () => {
      // a server that ignores the range sends the whole file: dropped unread
      const size = fetch(url, { headers: { Range: 'bytes=0-0' } })
        .then(r => { r.body?.cancel().catch(() => {}); return +(r.headers.get('Content-Range') || '').split('/')[1] || 0; }, () => 0);
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      let got = 0, total = 0, shown = -1;
      size.then(n => { total = n; });
      const counted = res.body.pipeThrough(new TransformStream({
        transform(chunk, out) {
          got += chunk.byteLength;
          const mb = Math.floor(got / 1e6);   // one update per megabyte
          if (mb !== shown) { shown = mb; progress(got, Math.max(total, got)); }
          out.enqueue(chunk);
        },
        flush() { arrived?.(); },   // all here; compiling and starting from now
      }));
      const { instance, module } = await WebAssembly.instantiateStreaming(
        new Response(counted, { headers: { 'Content-Type': 'application/wasm' } }), imports);
      done(instance, module);
    })().catch(e => failed(e));
    return {};
  };
}

// "12 of 39 MB", or "12 MB" with no total
export function mbOf(got, total) {
  const mb = n => Math.round(n / 1e6);
  return total > got ? `${mb(got)} of ${mb(total)} MB` : `${mb(got)} MB`;
}
