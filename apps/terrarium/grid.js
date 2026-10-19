// Uniform spatial hash. With ~140 creatures and ~300 food motes, brute-force
// neighbour queries would be ~40k distance checks every frame — affordable on a
// laptop, not on a car. Bucketing brings it down to the handful that matter.

export function createGrid(cellSize) {
  var cells = new Map();
  var cs = cellSize;
  var cols = 0;

  function key(cx, cy) { return cy * 100000 + cx; }

  return {
    cellSize: cs,
    clear: function () { cells.clear(); },

    insert: function (item, x, y) {
      var cx = Math.floor(x / cs), cy = Math.floor(y / cs);
      var k = key(cx, cy);
      var bucket = cells.get(k);
      if (!bucket) { bucket = []; cells.set(k, bucket); }
      bucket.push(item);
    },

    // Visits every item within `radius` of (x, y). Passing a callback rather
    // than allocating a result array keeps this off the GC's radar — it runs
    // a few hundred times per frame.
    query: function (x, y, radius, visit) {
      var minX = Math.floor((x - radius) / cs);
      var maxX = Math.floor((x + radius) / cs);
      var minY = Math.floor((y - radius) / cs);
      var maxY = Math.floor((y + radius) / cs);
      for (var cy = minY; cy <= maxY; cy++) {
        for (var cx = minX; cx <= maxX; cx++) {
          var bucket = cells.get(key(cx, cy));
          if (!bucket) continue;
          for (var i = 0; i < bucket.length; i++) visit(bucket[i]);
        }
      }
    }
  };
}
