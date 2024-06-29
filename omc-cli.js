const { io } = require("socket.io-client");
const BitSet = require("./bitset");
const sleep = require("./utils");

let lastUpdateTimestamp = 0;
let bitset;
let checking = false;

// connect to server
console.debug("connecting...");
const socket = io("https://onemillioncheckboxes.com");
socket.connect();

// get initial state
const fetchInitialState = async () => {
  console.debug("getting initial state...");
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
  console.debug("checking...");

  start = 0
  end = 1000000

  if (process.argv[2] != undefined) {
    start = process.argv[2]
  }

  if (process.argv[3] != undefined) {
    end = process.argv[3]
  }

  for (let index = start; index < end; index++) {
    // const byteIndex = Math.floor(index / 8);
    // if (bitset.bytes[byteIndex] === 0) {
    //   index = byteIndex * 8 + 8;
    //   continue;
    // }

    if (!bitset.get(index)) {
      bitset.set(index, true);
      socket.emit("toggle_bit", { index: index });
      await sleep(100);
    }

    if (index % 1000 === 0) {
      console.debug(`toggling on index ${index}`);
    }
  }

  console.debug("all checkboxes are checked");
  checking = false;
};

const toggleCheck = async (s, i) => {
  s.emit("toggle_bit", { index: i });
}

// client-side
socket.on("connect", async () => {
  console.debug(`successfully connected, socket id is ${socket.id}`);

  await fetchInitialState()

  // Listen for full state updates
  socket.on("full_state", (data) => {
    console.debug(`Received full state update`);
    if (data.timestamp > lastUpdateTimestamp) {
      lastUpdateTimestamp = data.timestamp;
      bitset = new BitSet({
        base64String: data.full_state,
        count: data.count,
      });

      console.debug(`Data count is ${data.count}`);
    }
  });

  socket.on("batched_bit_toggles", (updates) => {
    if (!bitset) {
      return;
    }

    const trueUpdates = updates[0];
    const falseUpdates = updates[1];
    if (updates.length !== 3) {
      console.debug("skip by length");
    } else {
      const timestamp = updates[2];
      if (timestamp < lastUpdateTimestamp.current) {
        console.debug("skip old update");
      } else {
        // console.debug(
        //   `Received batch: ${trueUpdates.length} true / ${falseUpdates.length} false`
        // );
        trueUpdates.forEach((index) => {
          bitset.set(index, true);
        });
        falseUpdates.forEach((index) => {
          toggleCheck(socket, index);
          bitset.set(index, true);
        });
      }
    }

    if (!checking) {
      check_them_all();
    }
  });
});
