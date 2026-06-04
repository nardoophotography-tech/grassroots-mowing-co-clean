import React, { useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type Mode = "LOCAL" | "BACKEND" | "VOICE" | "GEMINI" | "PERMISSION";

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-AU";
  window.speechSynthesis.speak(utterance);
}

export default function App() {
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState("I’m ready.");
  const [status, setStatus] = useState<Mode>("LOCAL");
  const [speakerOn, setSpeakerOn] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const recognitionRef = useRef<any>(null);
  const voiceOnRef = useRef(false);

  function reply(text: string, mode: Mode = "LOCAL", shouldSpeak = false) {
    setStatus(mode);
    setOutput(text);

    if (speakerOn && shouldSpeak) {
      speak(text);
    }
  }

  async function fetchJson(path: string) {
    const response = await fetch(path);
    const text = await response.text();

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(data?.reply || data?.error || `HTTP ${response.status}`);
    }

    return data;
  }

  async function healthCheck() {
    try {
      await fetchJson("/health");
      reply("Complete. Cherry server is online.", "BACKEND", true);
    } catch {
      reply("Cherry server did not answer.", "BACKEND", true);
    }
  }

  async function selfTest() {
    try {
      await fetchJson("/self-test");
      reply("Complete. Cherry wiring is working.", "BACKEND", true);
    } catch {
      reply("Self test failed.", "BACKEND", true);
    }
  }

  async function quotaStatus() {
    try {
      await fetchJson("/quota-status");
      reply("Complete. Gemini was not used.", "LOCAL", true);
    } catch {
      reply("Quota check failed, but Local Mode still works.", "LOCAL", true);
    }
  }

  function explainScreen() {
    reply(
      "This is Cherry Local Mode. Gemini is off unless you type ai:. Press Start Voice to talk continuously.",
      "LOCAL",
      true
    );
  }

  function localMode() {
    reply("Complete. Local Mode is active. Gemini was not used.", "LOCAL", true);
  }

  function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    setStatus("VOICE");

    if (next) {
      setOutput("Speaker ON.");
      speak("Speaker on.");
    } else {
      window.speechSynthesis?.cancel();
      setOutput("Speaker OFF.");
    }
  }

  function talkTest() {
    const message = "Cherry voice is working.";
    setOutput(message);
    speak(message);
  }

  async function runAiCommand(command: string) {
    reply("Permission needed. Gemini will be used for this command.", "PERMISSION", true);

    try {
      const response = await fetch("/cherry/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command })
      });

      const text = await response.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { reply: text };
      }

      reply(data.reply || "Complete.", "GEMINI", true);
    } catch {
      reply("Gemini unavailable. Local Mode still works.", "LOCAL", true);
    }
  }

  async function runCommand(raw: string) {
    const command = raw.trim();
    const lower = command.toLowerCase();

    if (!command) {
      reply("I’m listening.", "LOCAL", false);
      return;
    }

    if (lower === "health check") return healthCheck();
    if (lower === "self test") return selfTest();
    if (lower === "quota status") return quotaStatus();
    if (lower === "explain screen" || lower === "explain this screen") return explainScreen();
    if (lower === "local mode") return localMode();
    if (lower === "talk test") return talkTest();
    if (lower === "speaker toggle") return toggleSpeaker();
    if (lower === "start voice") return startVoice();
    if (lower === "stop voice" || lower === "stop audio") return stopVoice();

    if (lower.startsWith("ai:")) {
      return runAiCommand(command);
    }

    reply("Instruction received.", "LOCAL", false);
  }

  async function sendAndClear(raw: string) {
    const command = raw.trim();
    setInputText("");
    await runCommand(command);
  }

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      reply("Voice is not available in this browser.", "VOICE", true);
      return;
    }

    voiceOnRef.current = true;
    setVoiceOn(true);

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-AU";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      reply("I’m listening.", "VOICE", true);
    };

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript = last?.[0]?.transcript?.trim() || "";

      if (!transcript) return;

      setInputText("");
      runCommand(transcript);
    };

    recognition.onerror = () => {
      if (voiceOnRef.current) {
        reply("Voice paused. Restarting.", "VOICE", false);
      }
    };

    recognition.onend = () => {
      if (voiceOnRef.current) {
        try {
          recognition.start();
        } catch {
          // browser may need a moment
        }
      } else {
        setVoiceOn(false);
      }
    };

    try {
      recognition.start();
    } catch {
      reply("Voice could not start.", "VOICE", true);
    }
  }

  function stopVoice() {
    voiceOnRef.current = false;
    setVoiceOn(false);

    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }

    window.speechSynthesis?.cancel();
    reply("Voice stopped.", "VOICE", true);
  }

  const statusText =
    status === "LOCAL"
      ? "LOCAL MODE — GEMINI NOT USED"
      : status === "BACKEND"
      ? "BACKEND CHECK"
      : status === "VOICE"
      ? voiceOn
        ? "VOICE LISTENING"
        : "VOICE MODE"
      : status === "PERMISSION"
      ? "PERMISSION NEEDED"
      : "GEMINI MODE";

  const buttons: Array<[string, string]> = [
    ["Explain Screen", "explain screen"],
    ["Local Mode", "local mode"],
    ["Health Check", "health check"],
    ["Self Test", "self test"],
    ["Quota Status", "quota status"],
    ["Talk Test", "talk test"],
    [speakerOn ? "Speaker ON" : "Speaker OFF", "speaker toggle"],
    [voiceOn ? "Voice ON" : "Start Voice", "start voice"],
    ["Stop Voice", "stop voice"]
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        color: "#f2f2f4",
        fontFamily: "Segoe UI, Arial, sans-serif",
        padding: "1.5rem",
        display: "grid",
        placeItems: "start center"
      }}
    >
      <main
        style={{
          width: "min(880px, 96vw)",
          background: "#121217",
          border: "1px solid #252532",
          borderRadius: "28px",
          padding: "1.5rem",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)"
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0, color: "#ff2f70", letterSpacing: "0.14em" }}>
            CHERRY
          </h1>
          <p style={{ color: "#9a9aaa", fontWeight: 700 }}>
            David Nardoo's Local-First AI Control Centre
          </p>
        </header>

        <section
          style={{
            background: status === "PERMISSION" ? "#3a2510" : "#0f2b18",
            border: "1px solid #333340",
            borderRadius: "14px",
            padding: "0.9rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontWeight: 900,
            color: status === "PERMISSION" ? "#ffd166" : "#31ff5f"
          }}
        >
          {statusText}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1rem"
          }}
        >
          {buttons.map(([label, command]) => (
            <button
              key={command}
              type="button"
              onClick={() => runCommand(command)}
              style={{
                border: "none",
                borderRadius: "16px",
                padding: "1rem",
                background:
                  command === "start voice" && voiceOn
                    ? "#31ff5f"
                    : "#2b2b33",
                color:
                  command === "start voice" && voiceOn
                    ? "#061107"
                    : "#ffffff",
                fontWeight: 900,
                cursor: "pointer",
                minHeight: "68px"
              }}
            >
              {label}
            </button>
          ))}
        </section>

        <section
          style={{
            background: "#050507",
            borderRadius: "14px",
            padding: "1.2rem",
            minHeight: "160px",
            whiteSpace: "pre-wrap",
            color: "#e2e2ea",
            lineHeight: 1.55,
            marginBottom: "1rem",
            border: "1px solid #1c1c24",
            fontSize: "1.05rem"
          }}
        >
          {output}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "0.75rem"
          }}
        >
          <input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                sendAndClear(inputText);
              }
            }}
            placeholder="Type here, or press Start Voice and talk."
            style={{
              background: "#181820",
              border: "1px solid #2a2a35",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "1rem",
              fontSize: "1rem"
            }}
          />

          <button
            type="button"
            onClick={() => sendAndClear(inputText)}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "1rem 1.4rem",
              background: "#ff2f70",
              color: "#ffffff",
              fontWeight: 900,
              cursor: "pointer"
            }}
          >
            SEND
          </button>
        </section>

        <p style={{ color: "#8c8c98", fontSize: "0.85rem", marginTop: "1rem" }}>
          Gemini is only used if David types ai: first.
        </p>
      </main>
    </div>
  );
}
