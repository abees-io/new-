import test from "node:test";
import assert from "node:assert/strict";
import { loadCatalog } from "../dist/catalog.js";
const product = (price) => ({
  id: "product",
  published: true,
  name: "Product",
  category: "Home",
  color: "White",
  description: "Description",
  price,
  stock: 3,
  image: "https://example.com/photo.webp",
});
test("cached navigation returns recent products while checkout fetches fresh prices", async () => {
  const oldFetch = globalThis.fetch,
    oldStorage = globalThis.sessionStorage;
  const store = new Map();
  let requests = 0;
  try {
    globalThis.sessionStorage = {
      getItem: (key) => store.get(key) || null,
      setItem: (key, value) => store.set(key, value),
    };
    globalThis.fetch = async () => {
      requests++;
      return Response.json([product(requests === 1 ? 100 : 200)]);
    };
    assert.equal((await loadCatalog())[0].price, 100);
    assert.equal((await loadCatalog({ useCache: true }))[0].price, 100);
    assert.equal((await loadCatalog())[0].price, 200);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(requests, 3);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = oldStorage;
  }
});
test("blocked catalogue storage does not prevent loading", async () => {
  const oldFetch = globalThis.fetch,
    oldStorage = globalThis.sessionStorage;
  try {
    globalThis.sessionStorage = {
      getItem() {
        throw Error("Blocked");
      },
      setItem() {
        throw Error("Blocked");
      },
    };
    globalThis.fetch = async () => Response.json([product(100)]);
    assert.equal((await loadCatalog({ useCache: true }))[0].price, 100);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = oldStorage;
  }
});
test("expired catalogue cache is refreshed before displaying products", async () => {
  const oldFetch = globalThis.fetch,
    oldStorage = globalThis.sessionStorage;
  try {
    globalThis.sessionStorage = {
      getItem: () =>
        JSON.stringify({ time: Date.now() - 20000, products: [product(100)] }),
      setItem() {},
    };
    globalThis.fetch = async () => Response.json([product(250)]);
    assert.equal((await loadCatalog({ useCache: true }))[0].price, 250);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = oldStorage;
  }
});
