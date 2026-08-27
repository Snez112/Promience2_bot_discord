import net from 'net';

/**
 * Helper to write a VarInt to a Buffer (Minecraft Protocol)
 */
function writeVarInt(val) {
  const bytes = [];
  while (true) {
    if ((val & ~0x7f) === 0) {
      bytes.push(val);
      break;
    }
    bytes.push((val & 0x7f) | 0x80);
    val >>>= 7;
  }
  return Buffer.from(bytes);
}

/**
 * Pings a Minecraft server directly via TCP Server List Ping (SLP) protocol
 * @param {string} host
 * @param {number} port
 * @param {number} timeout
 * @returns {Promise<{ online: boolean, playersOnline: number, playersMax: number, version?: string, motd?: string }>}
 */
export function pingMinecraftServer(host, port = 25364, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      const hostBuf = Buffer.from(host, 'utf8');
      const handshakePacket = Buffer.concat([
        writeVarInt(0x00), // Packet ID: Handshake
        writeVarInt(765),  // Protocol version (1.20+)
        writeVarInt(hostBuf.length),
        hostBuf,
        Buffer.from([(port >> 8) & 0xff, port & 0xff]),
        writeVarInt(1),    // Next state: 1 (Status)
      ]);

      const handshakeLen = writeVarInt(handshakePacket.length);
      const requestPacket = Buffer.from([0x01, 0x00]); // Packet ID: Request Status (Length 1, ID 0)

      socket.write(Buffer.concat([handshakeLen, handshakePacket, requestPacket]));
    });

    let incomingData = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      if (isResolved) return;
      incomingData = Buffer.concat([incomingData, chunk]);

      try {
        let offset = 0;
        function readVarInt() {
          let num = 0;
          let shift = 0;
          let b;
          do {
            if (offset >= incomingData.length) return null;
            b = incomingData[offset++];
            num |= (b & 0x7f) << shift;
            shift += 7;
          } while (b & 0x80);
          return num;
        }

        const packetLen = readVarInt();
        if (packetLen === null) return;
        const packetId = readVarInt();
        if (packetId === null) return;

        if (packetId === 0x00) {
          const jsonLen = readVarInt();
          if (jsonLen === null) return;

          if (incomingData.length >= offset + jsonLen) {
            const jsonStr = incomingData.slice(offset, offset + jsonLen).toString('utf8');
            const data = JSON.parse(jsonStr);
            isResolved = true;
            socket.destroy();
            return resolve({
              online: true,
              version: data.version?.name || 'Java Server',
              motd: typeof data.description === 'string' ? data.description : data.description?.text || '',
              playersOnline: data.players?.online ?? 0,
              playersMax: data.players?.max ?? 0,
            });
          }
        }
      } catch {
        // Continue accumulating data chunks
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        reject(new Error(`Timeout connecting to ${host}:${port}`));
      }
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        reject(err);
      }
    });
  });
}
