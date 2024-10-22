class BitSet {
  constructor({ base64String, count }) {
    const binaryString = atob(base64String);
    this.bytes = new Uint8Array(binaryString.length);
    this.checkCount = count;
    for (let i = 0; i < binaryString.length; i++) {
      this.bytes[i] = binaryString.charCodeAt(i);
    }
  }

  get(index) {
    const byteIndex = Math.floor(index / 8);
    const bitOffset = 7 - (index % 8);
    return (this.bytes[byteIndex] & (1 << bitOffset)) !== 0;
  }

  set(index, value) {
    if (typeof value === "boolean") {
      value = value ? 1 : 0;
    }
    const byteIndex = Math.floor(index / 8);
    const bitOffset = 7 - (index % 8);
    if (value) {
      this.bytes[byteIndex] |= 1 << bitOffset;
    } else {
      this.bytes[byteIndex] &= ~(1 << bitOffset);
    }
  }

  toggle(index) {
    if (this.get(index)) {
      this.set(index, 0);
    } else {
      this.set(index, 1);
    }
  }
}

module.exports = BitSet;
