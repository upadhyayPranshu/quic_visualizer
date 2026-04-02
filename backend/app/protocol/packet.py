import json
import time

class Packet:
    def __init__(self, seq, data):
        self.seq = seq
        self.data = data
        self.timestamp = time.time()

    def to_json(self):
        return json.dumps({
            "seq": self.seq,
            "data": self.data,
            "timestamp": self.timestamp
        })

    @staticmethod
    def from_json(json_data):
        data = json.loads(json_data)
        packet = Packet(data["seq"], data["data"])
        packet.timestamp = data["timestamp"]
        return packet