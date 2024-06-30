const { io } = require("socket.io-client");
const BitSet = require("./bitset");
const sleep = require("./utils");

let lastUpdateTimestamp = 0;
let bitset;
let checking = false;
let scale = 2

// connect to server
console.debug("connecting...");
const socket = io("https://onemillioncheckboxes.com");
socket.connect();

// get initial state
const fetchInitialState = async () => {
  process.stdout.write('g ');
  try {
    const response = await fetch(
      "https://onemillioncheckboxes.com/api/initial-state"
    );
    const data = await response.json();
    bitset = new BitSet({
      base64String: data.full_state,
      count: data.count,
    });
  } catch (error) {
    console.error("Failed to fetch initial state:", error);
  }
};

const check_them_all = async () => {
  checking = true;
  let isChanged = false;

  for (let index = 0; index < 2048 * scale; index++) {
    if ((index+1) % (2048 * scale-1) == 0) { await fetchInitialState(); }

    if (index % 128 == 0) {
      const char = isChanged ? '. ' : 'x ';
      process.stdout.write(char);
      isChanged = false;
    }
    
    const buff = bitset.bytes[index];
    if (buff >= 255) {
      continue;
    }

    for (let i = 0; i < 8; i++) {
      const iIndex = index * 8 + i;
      if (!bitset.get(iIndex)) {
        toggleCheck(iIndex);
        isChanged = true;
        await sleep(5);
      }
    }
  }

  console.debug("all checkboxes are checked");
  checking = false;
};

const toggleCheck = async (i) => {
  socket.emit("toggle_bit", { index: i });
};

// client-side
socket.on("connect", async () => {
  console.debug(`successfully connected, socket id is ${socket.id}`);

  let iteration = 0
  await fetchInitialState();
  while (true) {
    console.log(`\nloop #${iteration} scale is ${scale}`)
    let start = Date.now()
    await check_them_all();
    iteration = iteration + 1

    const millis = Date.now() - start
    console.log(`\ndone in #${millis/1000} seconds`)

    if (millis > 50000) { 
      scale = scale - 1;
      if (scale < 2 ) { scale = 2; }
    }

    if (millis < 2000) { 
      scale = scale + 1;
      if (scale > 60 ) { scale = 60; } // 60 * 2028 = 125000
    }
  }
});
