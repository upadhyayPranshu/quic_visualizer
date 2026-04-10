================================================================================
          QUIC VISUALIZER: CUSTOM RELIABLE DATA TRANSFER OVER UDP
================================================================================

TEAM: Shamsheri Sultans
MEMBERS:
1. Pranshu Upadhyay (24BRS1241) - Protocol design, Sender implementation, Sliding window logic, Performance analysis
2. Niranjan N (24BYB1051) - Receiver implementation, Packet loss simulator, GUI dashboard, Testing & Documentation

================================================================================
1. WHAT WE HAVE DONE
================================================================================
We have designed and implemented a Custom Reliable Data Transfer Protocol built
on top of User Datagram Protocol (UDP). Because UDP is inherently unreliable, we
manually added mechanics commonly found in Transmission Control Protocol (TCP) 
to ensure safe, ordered, and error-free data delivery.

On top of the protocol engine, we built a real-time GUI Dashboard (quicvisual.netlify.app)
that visually demonstrates the inner workings of the network. The dashboard shows
live packet flows, network metrics (RTT, throughput, loss), and allows the user
to interactively change network conditions like packet loss and connection speed.

Key features implemented:
- Configurable Sliding Window (Controls how much data is sent at once)
- Congestion Control (TCP Reno style slow-start and additive increase/multiplicative decrease)
- Two recovery protocols: Go-Back-N and Selective Repeat
- Error Detection using CRC32 Checksums (simulating packet corruption)
- Configurable ACK Timeouts
- Live transmission logs and graphical performance analysis charts

================================================================================
2. HOW WE HAVE DONE IT (ARCHITECTURE & TECH STACK)
================================================================================
The project uses a split Client-Server architecture, but due to cloud hosting 
limitations (Railway does not support UDP traffic routing), we engineered a 
"Virtual In-Memory Simulator" that identically replicates UDP socket behavior 
for the backend.

Technologies Used:
- Python (FastAPI): Powers the backend server and handles the protocol simulation logic.
- WebSockets: Maintains a persistent, two-way connection between the backend and 
  frontend to stream live simulation data instantly.
- React.js: Powers the interactive frontend user interface.
- Recharts: Used for rendering the real-time performance graphs.

How it works:
1. The Backend runs the simulation loop. It generates "Packets", calculates RTT, 
   detects timeouts, and manages the congestion window.
2. For every event (a packet sent, received, lost, or corrupted), it fires a 
   WebSocket message to the frontend.
3. The Frontend consumes these WebSocket messages and updates the UI state, moving
   the packet chips across the screen and plotting the data on the graphs.

================================================================================
3. WHY WE HAVE DONE IT (MOTIVATION)
================================================================================
TCP is highly complex and its inner workings are hidden deep inside the Operating 
System kernel. When studying Computer Networks, it is difficult to "see" how 
sliding windows and congestion control actually behave in real-time.

By building reliability on top of UDP from scratch, we bridge the gap between 
theoretical networking concepts and practical implementation. It allows us (and 
any user) to directly observe the impact of packet loss, see the difference 
between Go-Back-N and Selective Repeat, and watch how congestion windows expand 
and collapse dynamically.

================================================================================
4. TERMINOLOGY EXPLAINED
================================================================================
Below is a detailed breakdown of all networking terms used in this project:

# PROTOCOLS
- UDP (User Datagram Protocol): A lightweight network protocol that sends data 
  fast but does not guarantee it will arrive, arrive in order, or arrive uncorrupted.
- TCP (Transmission Control Protocol): A heavy, reliable protocol that guarantees 
  data delivery via acknowledgments and retransmissions. Our project replicates 
  TCP's reliability over UDP.

# RELIABILITY MECHANICS
- ACK (Acknowledgment): A small message sent by the receiver back to the sender 
  saying "I successfully received packet #X".
- Timeout: The amount of time the sender waits for an ACK before assuming the 
  packet was lost and deciding to retransmit it.
- Checksum (CRC32): A mathematical value calculated based on the packet's data. 
  The receiver recalculates it; if it doesn't match the sender's checksum, the 
  packet was corrupted during transit.
- Retransmission: Sending a packet again because it was lost or corrupted.

# SLIDING WINDOW & CONGESTION
- Sliding Window: A mechanism that allows the sender to transmit multiple packets 
  before waiting for an ACK. It "slides" forward as ACKs are received.
- Window Size: The maximum number of unacknowledged packets allowed in transit.
- Congestion Control: Algorithms used to prevent a sender from overwhelming the 
  network. It slowly increases the sending rate and drastically cuts it when 
  packet loss is detected.
- Go-Back-N: A protocol where if packet #5 is lost, but #6 and #7 arrive safely, 
  the receiver discards #6 and #7. The sender must "go back" and retransmit #5, #6, and #7.
- Selective Repeat: A more efficient protocol. If packet #5 is lost, the receiver 
  still buffers #6 and #7. The sender only retransmits the specific lost packet (#5).

# METRICS
- RTT (Round Trip Time): The time it takes in milliseconds for a packet to reach 
  the receiver and for its ACK to return to the sender.
- Throughput: The amount of successful data delivered per second (measured in pkts/s).
- Packet Loss Rate: The percentage of packets that fail to reach the destination 
  due to network congestion or simulated drops.