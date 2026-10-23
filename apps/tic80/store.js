// Carts the player added (from the phone or a USB drive), in IndexedDB:
// { id, name, title, author, desc, player, size, added, bytes }. Game saves
// are the player's own business: TIC-80 keeps them in its own database.

function db() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('tic80-carts', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('carts', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function carts(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction('carts', mode);
    const req = fn(tx.objectStore('carts'));
    tx.oncomplete = () => { d.close(); resolve(req && req.result); };
    tx.onerror = tx.onabort = () => { d.close(); reject(tx.error); };
  });
}

export const allCarts = () => carts('readonly', s => s.getAll()).catch(() => []);
export const getCart = id => carts('readonly', s => s.get(id));
export const putCart = cart => carts('readwrite', s => s.put(cart));
export const deleteCart = id => carts('readwrite', s => s.delete(id));
