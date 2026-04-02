import random
from app.websocket import manager

def is_packet_lost():
    return random.random() < manager.loss_rate