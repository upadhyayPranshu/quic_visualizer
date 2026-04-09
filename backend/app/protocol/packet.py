import json
import time
import zlib


class Packet:
    def __init__(self, seq, data):
        self.seq = seq
        self.data = data
        self.timestamp = time.time()
        self.checksum = self._compute_checksum()

    def _compute_checksum(self):
        """Compute CRC32 checksum over seq + data + timestamp."""
        payload = f"{self.seq}:{self.data}:{self.timestamp}"
        return zlib.crc32(payload.encode()) & 0xFFFFFFFF

    def verify_checksum(self):
        """Verify packet integrity using CRC32."""
        expected = self._compute_checksum()
        return self.checksum == expected

    def to_json(self):
        return json.dumps({
            "seq": self.seq,
            "data": self.data,
            "timestamp": self.timestamp,
            "checksum": self.checksum,
        })

    @staticmethod
    def from_json(json_data):
        data = json.loads(json_data)
        packet = Packet(data["seq"], data["data"])
        packet.timestamp = data["timestamp"]
        packet.checksum = data.get("checksum", packet._compute_checksum())
        return packet