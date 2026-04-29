🚀 QUIC Visualizer: Custom Reliable Data Transfer over UDP
⭐⭐ DEVELOPED UNDER SWAMINATHAN A ⭐⭐
👥 Team: Shamsheri Sultans

Members:

Pranshu Upadhyay (24BRS1241)
Protocol Design, Sender Implementation, Sliding Window Logic, Performance Analysis
Niranjan N (24BYB1051)
Receiver Implementation, Packet Loss Simulator, GUI Dashboard, Testing & Documentation
📌 1. What We Have Done

We have designed and implemented a Custom Reliable Data Transfer Protocol built on top of the User Datagram Protocol (UDP).

Since UDP is inherently unreliable, we manually incorporated mechanisms inspired by the Transmission Control Protocol (TCP) to ensure:

Reliable data delivery
Ordered packet transmission
Error detection and recovery

On top of the protocol engine, we developed a real-time GUI dashboard:
👉 https://quicvisual.netlify.app

This dashboard visually demonstrates:

Live packet flow across the network
Real-time metrics such as RTT, throughput, and packet loss
Interactive controls to simulate different network conditions
🔑 Key Features
Configurable Sliding Window
TCP Reno-style Congestion Control
Slow Start
Additive Increase / Multiplicative Decrease (AIMD)
Two recovery protocols:
Go-Back-N
Selective Repeat
Error detection using CRC32 Checksums
Configurable ACK timeout handling
Real-time transmission logs
Live graphical performance analysis
🛠️ 2. How We Have Done It (Architecture & Tech Stack)
🧩 Architecture Overview

The system follows a Client-Server architecture. However, due to cloud hosting limitations (Railway does not support UDP traffic routing), we implemented a:

➡️ Virtual In-Memory UDP Simulator

This simulator faithfully replicates real UDP socket behavior within the backend environment.

💻 Technologies Used
Python (FastAPI) → Backend simulation and protocol logic
WebSockets → Real-time bidirectional communication
React.js → Interactive frontend interface
Recharts → Visualization of performance metrics
⚙️ System Workflow
The backend simulation engine:
Generates packets
Computes RTT
Detects timeouts
Adjusts congestion window dynamically
For every network event (send, receive, loss, corruption):
A WebSocket message is sent to the frontend
The frontend dashboard:
Animates packet movement
Updates graphs in real time
Displays logs and performance statistics
🎯 3. Why We Have Done It (Motivation)

The internal working of TCP is hidden deep within the Operating System kernel, making it difficult to visualize and understand.

This project aims to:

Bridge the gap between theory and implementation
Provide an interactive learning tool
Help users observe real-time behavior of:
Sliding window protocols
Congestion control mechanisms
Packet loss and recovery strategies

By building reliability over UDP from scratch, users can clearly understand how modern network protocols operate.

📚 4. Terminology Explained
🌐 Protocols
UDP (User Datagram Protocol):
A fast, connectionless protocol that does not guarantee delivery, order, or integrity
TCP (Transmission Control Protocol):
A reliable protocol that ensures data delivery using acknowledgments and retransmissions
🔁 Reliability Mechanics
ACK (Acknowledgment):
A message sent by the receiver confirming successful receipt of a packet
Timeout:
The time duration the sender waits before retransmitting a packet
Checksum (CRC32):
A computed value used to detect data corruption
Retransmission:
Resending packets that were lost or corrupted
📦 Sliding Window & Congestion Control
Sliding Window:
Allows multiple packets to be sent before waiting for acknowledgments
Window Size:
Maximum number of unacknowledged packets allowed in transit
Congestion Control:
Mechanisms to prevent network overload by adjusting transmission rate
🔄 Protocol Types
Go-Back-N:
If one packet is lost, all subsequent packets are retransmitted
Selective Repeat:
Only the lost packet is retransmitted while others are buffered
📊 Metrics
RTT (Round Trip Time):
Time taken for a packet to travel to the receiver and back
Throughput:
Number of successfully delivered packets per second
Packet Loss Rate:
Percentage of packets lost during transmission
