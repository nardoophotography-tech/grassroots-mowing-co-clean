import React, { useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type Mode = "LOCAL" | "BACKEND" | "VOICE" | "GEMINI";

function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-AU";
  window.speechSynthesis.speak(utterance);
}

export default function App() {
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState(
    "David, Cherry is now in Local Mode. I can guide you without using Gemini. Gemini will only be used if you deliberately type ai: before a command."
  );
  const [status, setStatus] = useState<Mode>("LOCAL");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  function say(text: string, mode: Mode = "LOCAL") {
    setStatus(mode);
    setOutput(text);
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
    say("Checking Cherry backend without using Gemini...", "BACKEND");

    try {
      const data = await fetchJson("/health");

      say(
        `BACKEND CHECK PASSED

Plain English:
Cherry's server is online.

Mode:
${data.mode || "unknown"}

Gemini:
${data.ai || "unknown"}

Next:
Use Local Mode buttons first. Do not use Gemini unless you type ai: yourself.`,
        "BACKEND"
      );
    } catch (err: any) {
      say(
        `BACKEND CHECK FAILED

Plain English:
Cherry's screen is open, but the server behind it did not answer.

What to do:
Run this in PowerShell:

npm run build
npm run cherry:start

Error:
${String(err?.message || err)}`,
        "BACKEND"
      );
    }
  }

  async function quotaStatus() {
    say("Checking quota status safely. This does not call Gemini...", "LOCAL");

    try {
      const data = await fetchJson("/quota-status");

      say(
        `SAFE QUOTA CHECK

Plain English:
This check did not use Gemini.

Gemini status:
${data.gemini || "unknown"}

Important:
Cherry can still work in Local Mode even if Gemini is missing, offline, or over quota.`,
        "LOCAL"
      );
    } catch {
      say(
        `SAFE QUOTA CHECK

Plain English:
The quota route did not answer, but this does not stop Cherry's Local Mode.

Next:
Use Health Check or Local Mode.`,
        "LOCAL"
      );
    }
  }

  async function selfTest() {
    say("Running Cherry self-test without using Gemini...", "BACKEND");

    try {
      const data = await fetchJson("/self-test");

      say(
        `SELF TEST PASSED

Plain English:
Cherry frontend and backend are connected.

Routes available:
${JSON.stringify(data.routes || {}, null, 2)}

Next:
Use Local Mode for normal work. Only type ai: if you deliberately want Gemini.`,
        "BACKEND"
      );
    } catch (err: any) {
      say(
        `SELF TEST FAILED

Plain English:
Cherry could not complete the backend self-test.

Error:
${String(err?.message || err)}`,
        "BACKEND"
      );
    }
  }

  function explainThisScreen() {
    say(
      `WHAT THIS SCREEN IS

This is Cherry's Local Mode control screen.

What Local Mode means:
Cherry can help you without calling Gemini.

Use these buttons:
- Health Check: checks if Cherry's server is online.
- Self Test: checks Cherry's own wiring.
- Quota Status: checks Gemini status without burning a Gemini request.
- Talk Test: makes Cherry speak.
- Start Voice: lets you speak a short command.
- Stop Audio: stops microphone and speaking.

Important:
Gemini is optional now.

Cherry will only try Gemini if you type:

ai: your question here

That protects your quota.`,
      "LOCAL"
    );
  }

  function localHelp() {
    say(
      `LOCAL MODE ACTIVE

Cherry can now help with:
- explaining screens
- guiding PowerShell steps
- checking backend health
- checking quota safely
- voice input testing
- voice output testing
- plain-English instructions

Cherry will not use Gemini unless you deliberately type ai:

Example:
ai: explain this error

Safe default:
Do not type ai: unless you want to spend a Gemini request.`,
      "LOCAL"
    );
  }

  async function runAiCommand(command: string) {
    say(
      `Permission check:
You used ai:, so Cherry will try to contact Gemini.

If Gemini is over quota, Cherry will stay in Local Mode.`,
      "GEMINI"
    );

    try {
      const data = await fetchJson("/cherry/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      } as any);

      say(data.reply || "Cherry received a response.", "GEMINI");
    } catch (err: any) {
      say(
        `GEMINI UNAVAILABLE

Plain English:
Gemini did not answer.

This does not break Cherry.

Cherry is still working in Local Mode.

Error:
${String(err?.message || err)}`,
        "LOCAL"
      );
    }
  }

  function testVoiceOutput() {
    const text =
      "David, Cherry voice is working. I am in Local Mode and I will not use Gemini unless you ask me to.";
    say(text, "VOICE");
    speak(text);
  }

  function startVoiceInput() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      say(
        "Voice input is not available in this browser. Typed Local Mode still works. Try Chrome or Edge for voice.",
        "VOICE"
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-AU";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        say("Listening now. Say one short command.", "VOICE");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        setInputText(transcript);
        setIsListening(false);
        say(
          `I heard:

${transcript}

Press SEND to run that as a Local Mode command.`,
          "VOICE"
        );
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        say(
          `Voice input had a problem: ${String(event.error || "unknown")}

Typed Local Mode still works.`,
          "VOICE"
        );
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      say(`Voice input could not start: ${String(err?.message || err)}`, "VOICE");
    }
  }

  function stopAudio() {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }

    window.speechSynthesis?.cancel();
    setIsListening(false);
    say("Audio stopped.", "VOICE");
  }

  async function runCommand(raw: string) {
    const command = raw.trim();
    const lower = command.toLowerCase();

    if (!command) {
      say("No command entered.", "LOCAL");
      return;
    }

    if (lower === "health check") return healthCheck();
    if (lower === "self test") return selfTest();
    if (lower === "quota status") return quotaStatus();
    if (lower === "explain this screen") return explainThisScreen();
    if (lower === "local mode") return localHelp();
    if (lower === "talk test") return testVoiceOutput();
    if (lower === "start voice") return startVoiceInput();
    if (lower === "stop audio") return stopAudio();

    if (lower.startsWith("ai:")) {
      return runAiCommand(command);
    }

    say(
      `LOCAL MODE RESPONSE

David, I received this:

${command}

Plain English:
This did not use Gemini.

Next:
For app fixing, paste the PowerShell error or screenshot here.
For Gemini, deliberately start the command with ai:`,
      "LOCAL"
    );
  }

  const statusText =
    status === "LOCAL"
      ? "LOCAL MODE ACTIVE — GEMINI NOT USED"
      : status === "BACKEND"
      ? "BACKEND CHECK MODE"
      : status === "VOICE"
      ? "VOICE MODE"
      : "GEMINI REQUEST MODE";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        color: "#f2f2f4",
        fontFamily: "Segoe UI, Arial, sans-serif",
        padding: "1.5rem",
        display: "grid",
        placeItems: "start center",
      }}
    >
      <main
        style={{
          width: "min(860px, 96vw)",
          background: "#121217",
          border: "1px solid #252532",
          borderRadius: "28px",
          padding: "1.5rem",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
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
            background: status === "LOCAL" ? "#0f2b18" : "#2b2230",
            border: "1px solid #333340",
            borderRadius: "14px",
            padding: "0.9rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontWeight: 900,
            color: status === "LOCAL" ? "#31ff5f" : "#ffd166",
          }}
        >
          {statusText}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {[
            ["Explain Screen", "explain this screen"],
            ["Local Mode", "local mode"],
            ["Health Check", "health check"],
            ["Self Test", "self test"],
            ["Quota Status", "quota status"],
            ["Talk Test", "talk test"],
            [isListening ? "Listening..." : "Start Voice", "start voice"],
            ["Stop Audio", "stop audio"],
          ].map(([label, command]) => (
            <button
              key={command}
              type="button"
              onClick={() => runCommand(command)}
              style={{
                border: "none",
                borderRadius: "16px",
                padding: "1rem",
                background:
                  command === "start voice" && isListening ? "#31ff5f" : "#2b2b33",
                color:
                  command === "start voice" && isListening ? "#061107" : "#ffffff",
                fontWeight: 900,
                cursor: "pointer",
                minHeight: "68px",
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
            minHeight: "210px",
            whiteSpace: "pre-wrap",
            color: "#e2e2ea",
            lineHeight: 1.55,
            marginBottom: "1rem",
            border: "1px solid #1c1c24",
          }}
        >
          {output}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "0.75rem",
          }}
        >
          <input
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runCommand(inputText);
              }
            }}
            placeholder="Type here. Use ai: only when you deliberately want Gemini."
            style={{
              background: "#181820",
              border: "1px solid #2a2a35",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "1rem",
              fontSize: "1rem",
            }}
          />

          <button
            type="button"
            onClick={() => runCommand(inputText)}
            style={{
              border: "none",
              borderRadius: "12px",
              padding: "1rem 1.4rem",
              background: "#ff2f70",
              color: "#ffffff",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            SEND
          </button>
        </section>

        <p style={{ color: "#8c8c98", fontSize: "0.85rem", marginTop: "1rem" }}>
          Safety rule: Cherry uses Local Mode by default. Gemini is only called when
          David deliberately types ai: before a command.
        </p>
      </main>
    </div>
  );
}
