import React, { useState } from "react";
import "./ConceptSection.css";

/* ═══════════════════════════════════════════════════════════════
   1 ─ CONCEPT  DESCRIPTION
   ═══════════════════════════════════════════════════════════════ */
const conceptData = {
  definition: {
    title: "Definition",
    icon: "📖",
    content: `QUIC (Quick UDP Internet Connections) is a modern, general-purpose transport-layer protocol developed by Google and later standardized by the IETF (RFC 9000). It is built on top of UDP (User Datagram Protocol) and provides reliable, multiplexed, and encrypted data transfer — similar to TCP + TLS combined — but with significantly reduced connection setup latency and improved performance over lossy networks.

In essence, QUIC re-implements many of TCP's reliability features (sequencing, acknowledgements, congestion control, retransmission) at the application layer on top of UDP, while adding native encryption (TLS 1.3) and stream multiplexing without head-of-line blocking.`,
  },

  stepwise: {
    title: "Stepwise Explanation",
    icon: "🔢",
    steps: [
      {
        step: 1,
        heading: "Connection Establishment (0-RTT / 1-RTT Handshake)",
        detail:
          "The client sends an Initial packet containing a TLS ClientHello and a proposed Connection ID. Unlike TCP's 3-way handshake, QUIC merges the transport handshake with the TLS handshake, achieving a 1-RTT connection setup. For repeat connections, 0-RTT is possible — the client sends application data in the very first packet using previously cached keys.",
      },
      {
        step: 2,
        heading: "Stream Multiplexing",
        detail:
          "Once connected, the client and server exchange data over independent streams within a single QUIC connection. Each stream is identified by a unique Stream ID. Streams are bidirectional or unidirectional, and crucially, a lost packet on Stream A does NOT block delivery on Stream B — eliminating TCP's head-of-line blocking problem.",
      },
      {
        step: 3,
        heading: "Packet Framing & Encryption",
        detail:
          "Every QUIC packet is encrypted using TLS 1.3. Each packet contains one or more frames (STREAM frames carrying application data, ACK frames, CRYPTO frames, etc.). Packets are assigned monotonically increasing Packet Numbers — unlike TCP, QUIC never re-uses a sequence number for retransmissions, making RTT measurement more accurate.",
      },
      {
        step: 4,
        heading: "Reliable Delivery & Acknowledgement",
        detail:
          "The receiver sends ACK frames that report which Packet Numbers have been received. QUIC uses Selective Acknowledgement (SACK-like) by default. If a packet is not acknowledged within a timeout (PTO — Probe Timeout), or if a gap in packet numbers is detected, the sender retransmits the lost frames (not the entire packet).",
      },
      {
        step: 5,
        heading: "Congestion Control",
        detail:
          "QUIC implements congestion control at the sender side. The default algorithm is similar to TCP's New Reno (Slow Start → Congestion Avoidance → Fast Recovery). The sender maintains a Congestion Window (cwnd) that limits the amount of in-flight data. On loss detection, cwnd is halved (multiplicative decrease). Over time, cwnd grows linearly (additive increase) or exponentially (slow start).",
      },
      {
        step: 6,
        heading: "Connection Migration",
        detail:
          "QUIC identifies connections by Connection IDs, not by IP:port tuples. This means that if a mobile device switches from Wi-Fi to cellular, the QUIC connection survives — the client simply sends packets from the new IP address with the same Connection ID.",
      },
    ],
  },

  example: {
    title: "Worked Example — Selective Repeat over QUIC",
    icon: "🧮",
    scenario:
      "Suppose we have a sender transmitting 8 data packets (Seq 0–7) with a Window Size = 4, simulated Loss Rate = 25%, and ACK Timeout = 2 seconds.",
    steps: [
      {
        label: "Round 1 — Send Window [0, 1, 2, 3]",
        detail:
          "Sender transmits packets 0, 1, 2, 3. Packet 2 is randomly dropped (simulating network loss). CRC32 checksum is computed for each packet before transmission.\n\nSender window: [0, 1, 2, 3]  ·  cwnd = 4 (slow start)",
      },
      {
        label: "Round 1 — ACKs Arrive",
        detail:
          "Receiver sends ACK for packets 0, 1, and 3 (it never received 2). The sender detects the gap — Packet 2 is missing.\n\nACKs received: {0 ✓, 1 ✓, 3 ✓}  ·  Packet 2: unacknowledged",
      },
      {
        label: "Round 2 — Selective Retransmit + Advance Window",
        detail:
          "Since we are using Selective Repeat, the sender retransmits ONLY Packet 2 (not 2, 3 like Go-Back-N would). Meanwhile, the window slides forward, and packets 4, 5, 6 are also sent.\n\nSender window: [2ʳ, 4, 5, 6]  ·  cwnd reduced to 2 after loss (multiplicative decrease)",
      },
      {
        label: "Round 2 — ACKs Arrive",
        detail:
          "All packets (2, 4, 5, 6) are successfully received and ACKed. cwnd begins growing again via additive increase.\n\nACKs received: {2 ✓, 4 ✓, 5 ✓, 6 ✓}  ·  cwnd = 2 → 3 (additive increase)",
      },
      {
        label: "Round 3 — Final Packet",
        detail:
          "Sender transmits Packet 7. It is received and ACKed. Transmission complete.\n\nTotal sent: 9 packets (8 original + 1 retransmit)  ·  Loss rate: 1/9 ≈ 11.1%\nFinal cwnd: 3  ·  Throughput: ~7 pkts / 3 rounds ≈ 2.33 pkts/round",
      },
    ],
  },

  purpose: {
    title: "Purpose of QUIC",
    icon: "🎯",
    points: [
      "Reduce connection latency — 0-RTT and 1-RTT handshakes vs TCP+TLS's 3-RTT",
      "Eliminate head-of-line blocking via independent stream multiplexing",
      "Provide built-in encryption (TLS 1.3) as a mandatory feature, not optional",
      "Enable connection migration for mobile devices switching networks",
      "Allow application-layer deployment and iteration — no OS kernel changes needed",
      "Improve performance on lossy / high-latency networks (Wi-Fi, cellular)",
    ],
  },

  realWorld: {
    title: "Where QUIC Is Used in Real Systems",
    icon: "🌐",
    items: [
      {
        name: "Google Chrome & YouTube",
        desc: "Chrome uses QUIC for all Google services. Over 35% of Google's traffic uses QUIC.",
      },
      {
        name: "HTTP/3",
        desc: "The latest version of HTTP (HTTP/3, RFC 9114) runs exclusively on top of QUIC, replacing TCP entirely.",
      },
      {
        name: "Cloudflare & Fastly CDNs",
        desc: "Major CDN providers support QUIC/HTTP3 for faster content delivery worldwide.",
      },
      {
        name: "Meta (Facebook, Instagram)",
        desc: "Meta deploys QUIC for mobile apps, reporting 6% latency improvement for video streaming.",
      },
      {
        name: "Microsoft (Bing, Xbox)",
        desc: "Microsoft's MsQuic library powers QUIC in Windows, Xbox, and Azure services.",
      },
      {
        name: "Apple (iOS / macOS)",
        desc: "Apple's networking stack supports QUIC natively starting from iOS 15 and macOS Monterey.",
      },
    ],
  },

  parameters: {
    title: "Important Parameters & Variables",
    icon: "⚙️",
    params: [
      {
        name: "cwnd (Congestion Window)",
        desc: "Maximum bytes the sender can have in-flight. Controls sending rate. Grows during slow-start, shrinks on loss.",
        range: "1 – 64+ packets",
      },
      {
        name: "RTT (Round Trip Time)",
        desc: "Time for a packet to travel from sender to receiver and back. QUIC measures smoothed RTT for accurate timeout calculation.",
        range: "1 ms – 500+ ms",
      },
      {
        name: "Window Size",
        desc: "Number of packets the sender can transmit before needing an ACK. Determines the sliding window width.",
        range: "1 – 64 packets",
      },
      {
        name: "ACK Timeout (PTO)",
        desc: "Time the sender waits before considering a packet lost. If no ACK arrives within this period, retransmission is triggered.",
        range: "0.1 s – 5.0 s",
      },
      {
        name: "Loss Rate",
        desc: "Percentage of packets randomly dropped to simulate network conditions. Higher loss → more retransmissions, lower throughput.",
        range: "0% – 50%",
      },
      {
        name: "CRC32 Checksum",
        desc: "Error detection code computed over packet data. The receiver recomputes the checksum; if it doesn't match, the packet is marked corrupted.",
        range: "32-bit integer",
      },
      {
        name: "Protocol Mode",
        desc: "Retransmission strategy: Go-Back-N (retransmit from lost packet onward) vs Selective Repeat (retransmit only lost packets).",
        range: "GBN / SR",
      },
    ],
  },
};

/* ═══════════════════════════════════════════════════════════════
   2 ─ VIDEO  SECTION
   ═══════════════════════════════════════════════════════════════ */
const videoData = {
  title: "QUIC Protocol Explained — Video",
  embedId: "HnDsMehSSY4",   // QUIC protocol explained
  description:
    'This video provides a clear, in-depth explanation of QUIC — how it works over UDP, its handshake mechanism, built-in encryption, stream multiplexing, and how it powers HTTP/3.',
};

/* ═══════════════════════════════════════════════════════════════
   3 ─ REFERENCES  /  FURTHER  READING
   ═══════════════════════════════════════════════════════════════ */
const references = [
  {
    category: "📚 Prescribed Textbooks",
    items: [
      {
        title:
          'Computer Networking: A Top-Down Approach — Kurose & Ross, 8th Edition',
        detail: "Chapter 3: Transport Layer (§3.4 Reliable Data Transfer, §3.5 Connection-Oriented Transport: TCP, §3.7 TCP Congestion Control)",
        url: "https://gaia.cs.umass.edu/kurose_ross/online_lectures.htm",
      },
      {
        title:
          'Computer Networks — Andrew S. Tanenbaum & David Wetherall, 6th Edition',
        detail: "Chapter 6: The Transport Layer (§6.2 UDP, §6.5 Congestion Control)",
        url: "https://www.pearson.com/en-us/subject-catalog/p/computer-networks/P200000003192",
      },
    ],
  },
  {
    category: "🔗 Official Technical Websites & RFCs",
    items: [
      {
        title: "RFC 9000 — QUIC: A UDP-Based Multiplexed and Secure Transport",
        detail: "The official IETF specification defining the QUIC transport protocol.",
        url: "https://www.rfc-editor.org/rfc/rfc9000.html",
      },
      {
        title: "RFC 9002 — QUIC Loss Detection and Congestion Control",
        detail: "Defines QUIC's loss recovery and congestion control mechanisms.",
        url: "https://www.rfc-editor.org/rfc/rfc9002.html",
      },
      {
        title: "RFC 9114 — HTTP/3",
        detail: "The specification for HTTP/3, which runs exclusively on QUIC.",
        url: "https://www.rfc-editor.org/rfc/rfc9114.html",
      },
      {
        title: "Chromium QUIC Project",
        detail: "Google's open-source QUIC implementation in the Chromium browser.",
        url: "https://www.chromium.org/quic/",
      },
    ],
  },
  {
    category: "📄 Research Papers & Educational Resources",
    items: [
      {
        title:
          '"The QUIC Transport Protocol: Design and Internet-Scale Deployment" — Google, SIGCOMM 2017',
        detail:
          "Landmark paper describing QUIC's design, deployment at Google scale, and performance results.",
        url: "https://dl.acm.org/doi/10.1145/3098822.3098842",
      },
      {
        title:
          '"Taking a Long Look at QUIC" — IMC 2017',
        detail:
          "Independent measurement study of QUIC's performance compared to TCP+TLS.",
        url: "https://dl.acm.org/doi/10.1145/3131365.3131368",
      },
      {
        title: "QUIC Working Group — IETF",
        detail:
          "Official IETF working group page with all drafts, presentations, and meeting notes.",
        url: "https://datatracker.ietf.org/wg/quic/about/",
      },
      {
        title: "HTTP/3 Explained — Daniel Stenberg (curl author)",
        detail:
          "A free, beginner-friendly online book explaining HTTP/3 and QUIC in plain language.",
        url: "https://http3-explained.haxx.se/en",
      },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function ConceptSection() {
  const [activeTab, setActiveTab] = useState("definition");

  const tabs = [
    { id: "definition",  label: "Definition",    icon: "📖" },
    { id: "stepwise",    label: "How It Works",  icon: "🔢" },
    { id: "example",     label: "Worked Example",icon: "🧮" },
    { id: "purpose",     label: "Purpose",       icon: "🎯" },
    { id: "realWorld",   label: "Real-World Use", icon: "🌐" },
    { id: "parameters",  label: "Parameters",    icon: "⚙️" },
  ];

  return (
    <>
      {/* ══════════ CONCEPT DESCRIPTION ══════════ */}
      <section className="concept-section" id="concept-description">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">📘</span>
            Concept Description
          </h2>
          <p className="section-subtitle">
            Understanding the QUIC protocol — a modern, UDP-based transport layer
          </p>
        </div>

        {/* Tab navigation */}
        <div className="concept-tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              className={`concept-tab ${activeTab === t.id ? "concept-tab--active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="concept-body">
          {/* ── Definition ── */}
          {activeTab === "definition" && (
            <div className="concept-card fade-in">
              <h3 className="concept-card-title">{conceptData.definition.icon} {conceptData.definition.title}</h3>
              <div className="concept-text">{conceptData.definition.content}</div>
            </div>
          )}

          {/* ── Stepwise ── */}
          {activeTab === "stepwise" && (
            <div className="concept-card fade-in">
              <h3 className="concept-card-title">{conceptData.stepwise.icon} {conceptData.stepwise.title}</h3>
              <ol className="step-list">
                {conceptData.stepwise.steps.map((s) => (
                  <li key={s.step} className="step-item">
                    <div className="step-number">{s.step}</div>
                    <div className="step-content">
                      <h4 className="step-heading">{s.heading}</h4>
                      <p className="step-detail">{s.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ── Worked Example ── */}
          {activeTab === "example" && (
            <div className="concept-card fade-in">
              <h3 className="concept-card-title">{conceptData.example.icon} {conceptData.example.title}</h3>
              <div className="example-scenario">{conceptData.example.scenario}</div>
              <div className="example-timeline">
                {conceptData.example.steps.map((s, i) => (
                  <div key={i} className="example-step">
                    <div className="example-step-marker">
                      <div className="example-step-dot" />
                      {i < conceptData.example.steps.length - 1 && <div className="example-step-line" />}
                    </div>
                    <div className="example-step-body">
                      <h4 className="example-step-label">{s.label}</h4>
                      <pre className="example-step-detail">{s.detail}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Purpose ── */}
          {activeTab === "purpose" && (
            <div className="concept-card fade-in">
              <h3 className="concept-card-title">{conceptData.purpose.icon} {conceptData.purpose.title}</h3>
              <ul className="purpose-list">
                {conceptData.purpose.points.map((p, i) => (
                  <li key={i} className="purpose-item">
                    <span className="purpose-bullet">▸</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Real-World Use ── */}
          {activeTab === "realWorld" && (
            <div className="concept-card fade-in">
              <h3 className="concept-card-title">{conceptData.realWorld.icon} {conceptData.realWorld.title}</h3>
              <div className="realworld-grid">
                {conceptData.realWorld.items.map((item, i) => (
                  <div key={i} className="realworld-card">
                    <h4 className="realworld-name">{item.name}</h4>
                    <p className="realworld-desc">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Parameters ── */}
          {activeTab === "parameters" && (
            <div className="concept-card fade-in">
              <h3 className="concept-card-title">{conceptData.parameters.icon} {conceptData.parameters.title}</h3>
              <div className="params-table-wrap">
                <table className="params-table">
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Description</th>
                      <th>Typical Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conceptData.parameters.params.map((p, i) => (
                      <tr key={i}>
                        <td className="param-name">{p.name}</td>
                        <td>{p.desc}</td>
                        <td className="param-range">{p.range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════ VIDEO SECTION ══════════ */}
      <section className="video-section" id="video-section">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">🎬</span>
            Video Explanation
          </h2>
          <p className="section-subtitle">{videoData.description}</p>
        </div>

        <div className="video-box">
          <div className="video-responsive">
            <iframe
              src={`https://www.youtube.com/embed/${videoData.embedId}`}
              title={videoData.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
            />
          </div>
          <div className="video-meta">
            <span className="video-badge">▶ YouTube</span>
            <span className="video-label">{videoData.title}</span>
          </div>
        </div>
      </section>

      {/* ══════════ FURTHER READING / REFERENCES ══════════ */}
      <section className="references-section" id="references">
        <div className="section-header">
          <h2 className="section-title">
            <span className="section-icon">📚</span>
            Further Reading & References
          </h2>
          <p className="section-subtitle">
            Textbook chapters, official specifications, and research papers for deeper learning
          </p>
        </div>

        <div className="ref-groups">
          {references.map((group, gi) => (
            <div key={gi} className="ref-group">
              <h3 className="ref-group-title">{group.category}</h3>
              <div className="ref-cards">
                {group.items.map((item, ii) => (
                  <a
                    key={ii}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ref-card"
                  >
                    <h4 className="ref-card-title">{item.title}</h4>
                    <p className="ref-card-detail">{item.detail}</p>
                    <span className="ref-card-link">
                      Visit Resource →
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
