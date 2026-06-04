import React, { useRef, useState } from "react";

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

type TestStatus = "PASS" | "WARNING" | "FAIL" | "READY";

type DiagnosticItem = {
  name: string;
  status: TestStatus;
  message: string;
  nextAction: string;
};

const initialDiagnostics: DiagnosticItem[] = [
  {
    name: "Core app",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click Run Core Test.",
  },
  {
    name: "Backend",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click health check.",
  },
  {
    name: "Gemini/API",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click Run API Test.",
  },
  {
    name: "Microphone permission",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click Request Mic Permission.",
  },
  {
    name: "Speaker output",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click Play Speaker Test.",
  },
  {
    name: "Text-to-speech",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click Test Voice Output.",
  },
  {
    name: "Speech-to-text",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click Test Speech Recognition.",
  },
  {
    name: "Feedback loop risk",
    status: "READY",
    message: "Not tested yet.",
    nextAction: "Click Run Feedback Test.",
  },
];

export default function App() {
  const [inputText, setInputText] = useState("");
  const [output, setOutput] = useState(
    "Cherry is fully armed and unblocked. Type a directive or run a manual test, David..."
  );
  const [developerDetails, setDeveloperDetails] = useState("");
  const [showManualPanel, setShowManualPanel] = useState(false);
  const [diagnostics, setDiagnostics] =
    useState<DiagnosticItem[]>(initialDiagnostics);
  const [isListening, setIsListening] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const analyserTimerRef = useRef<number | null>(null);

  function updateDiagnostic(
    name: string,
    status: TestStatus,
    message: string,
    nextAction: string
  ) {
    setDiagnostics((items) =>
      items.map((item) =>
        item.name === name ? { ...item, status, message, nextAction } : item
      )
    );
  }

  function cleanErrorMessage(err: unknown, failedUrl?: string) {
    const raw = err instanceof Error ? err.message : String(err);

    let clean =
      "Cherry could not complete that command. Check that the local server is running on port 4567.";

    if (raw.includes("Failed to fetch")) {
      clean =
        "Cherry could not reach the backend. Check that the server is running on port 4567.";
    }

    setDeveloperDetails(
      JSON.stringify(
        {
          failedUrl: failedUrl || "not supplied",
          rawError: raw,
          time: new Date().toISOString(),
        },
        null,
        2
      )
    );

    return clean;
  }

  async function fetchJson(path: string) {
    const response = await fetch(path);
    const text = await response.text();

    let data: any;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} from ${path}: ${JSON.stringify(data)}`
      );
    }

    return data;
  }

  async function runHealthCheck() {
    setOutput("Command received: health check");

    try {
      const data = await fetchJson("/health");

      updateDiagnostic(
        "Backend",
        "PASS",
        "Backend is reachable and /health returned successfully.",
        "Continue to self test."
      );

      updateDiagnostic(
        "Core app",
        "PASS",
        "Cherry frontend is running and can call the backend.",
        "Continue testing buttons."
      );

      setOutput(`Health check PASS:\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      const clean = cleanErrorMessage(err, "/health");

      updateDiagnostic(
        "Backend",
        "FAIL",
        clean,
        "Run npm run cherry:start and reopen http://127.0.0.1:4567"
      );

      setOutput(`Health check FAIL:\n${clean}`);
    }
  }

  async function runSelfTest() {
    setOutput("Command received: self test");

    try {
      const data = await fetchJson("/self-test");

      updateDiagnostic(
        "Core app",
        "PASS",
        "Self test route responded.",
        "Generate the test report."
      );

      setOutput(`Self test result:\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      const clean = cleanErrorMessage(err, "/self-test");

      updateDiagnostic(
        "Core app",
        "WARNING",
        "The /self-test route is missing or failed, but the frontend command wiring works.",
        "Add or repair /self-test in cherry-server.ts."
      );

      setOutput(`Self test WARNING:\n${clean}`);
    }
  }

  async function runQuotaStatus() {
    setOutput("Command received: quota status");

    try {
      const data = await fetchJson("/quota-status");
      const text = JSON.stringify(data, null, 2);

      if (text.includes("quota") || text.includes("429")) {
        updateDiagnostic(
          "Gemini/API",
          "WARNING",
          "Gemini quota may be exhausted. Cherry core can still be tested manually.",
          "Use manual test mode and only call Gemini with ai: commands."
        );
      } else {
        updateDiagnostic(
          "Gemini/API",
          "PASS",
          "Quota status route responded.",
          "Continue manual testing."
        );
      }

      setOutput(`Quota status:\n${text}`);
    } catch (err) {
      const clean = cleanErrorMessage(err, "/quota-status");

      updateDiagnostic(
        "Gemini/API",
        "WARNING",
        "Quota endpoint is not available yet. This does not stop frontend testing.",
        "Add /quota-status later if needed."
      );

      setOutput(
        `Quota status WARNING:\n${clean}\n\nCherry frontend is still working.`
      );
    }
  }

  async function runApiTest() {
    setOutput("Command received: Run API Test");

    try {
      const data = await fetchJson("/cherry/api-test");
      const status = data.status === "PASS" ? "PASS" : "WARNING";

      updateDiagnostic(
        "Gemini/API",
        status,
        data.summary || "Gemini/API test returned a result.",
        data.detail || "Continue manual testing."
      );

      setOutput(`Gemini/API test:\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      const clean = cleanErrorMessage(err, "/cherry/api-test");

      updateDiagnostic(
        "Gemini/API",
        "WARNING",
        "Gemini/API test could not complete. Cherry core can still run manually.",
        "Check Gemini quota, API key, and server logs."
      );

      setOutput(`Gemini/API test WARNING:\n${clean}`);
    }
  }

  async function runAiCommand(command: string) {
    setOutput("AI command received. Sending to Cherry server...");

    try {
      const res = await fetch("/cherry/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
        }),
      });

      const text = await res.text();

      let data: any;

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { reply: text };
      }

      if (!res.ok && !data?.reply) {
        throw new Error(`HTTP ${res.status}`);
      }

      if (data?.quotaExhausted || res.status === 429) {
        updateDiagnostic(
          "Gemini/API",
          "WARNING",
          "Gemini quota is exhausted. Cherry core is still working.",
          "Wait for quota reset or continue using manual test mode."
        );
      } else if (data?.missingKey) {
        updateDiagnostic(
          "Gemini/API",
          "FAIL",
          "Gemini API key is missing on the server.",
          "Add GEMINI_API_KEY to the server environment."
        );
      } else if (data?.success) {
        updateDiagnostic(
          "Gemini/API",
          "PASS",
          "Cherry server handled the AI command.",
          "Continue testing carefully."
        );
      }

      setOutput(
        data?.reply ||
          data?.spokenReply ||
          "Cherry server responded, but no reply text was returned."
      );
    } catch (err) {
      const clean = cleanErrorMessage(err, "/cherry/execute");

      updateDiagnostic(
        "Gemini/API",
        "WARNING",
        "Cherry could not complete the AI command.",
        "Check Gemini quota, API key, and server logs."
      );

      setOutput(`AI command failed:\n${clean}`);
    }
  }

  async function requestMicPermission() {
    setOutput("Command received: mic test");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateDiagnostic(
        "Microphone permission",
        "FAIL",
        "This browser does not support microphone access.",
        "Use Chrome or Edge and check Windows microphone permissions."
      );

      setOutput("Microphone FAIL: browser microphone access is unavailable.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setIsListening(true);

      updateDiagnostic(
        "Microphone permission",
        "PASS",
        "Microphone permission granted and audio stream started.",
        "Run Mic Level Test."
      );

      setOutput(
        "Microphone PASS: permission granted. Audio stream started for manual testing only."
      );
    } catch (err) {
      const clean = cleanErrorMessage(
        err,
        "navigator.mediaDevices.getUserMedia"
      );

      updateDiagnostic(
        "Microphone permission",
        "FAIL",
        "Microphone permission was blocked, denied, or unavailable.",
        "Check Chrome site permissions and Windows privacy microphone settings."
      );

      setOutput(`Microphone FAIL:\n${clean}`);
    }
  }

  async function runMicLevelTest() {
    setOutput("Command received: Run Mic Level Test");

    try {
      let stream = micStreamRef.current;

      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
      }

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      if (analyserTimerRef.current) {
        window.clearInterval(analyserTimerRef.current);
      }

      analyserTimerRef.current = window.setInterval(() => {
        analyser.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

        setMicLevel(Math.round(average));
      }, 200);

      updateDiagnostic(
        "Microphone permission",
        "PASS",
        "Mic level meter is running.",
        "Talk near the microphone and watch the level number change."
      );

      setOutput("Mic level test running. Speak near the microphone.");
    } catch (err) {
      const clean = cleanErrorMessage(err, "mic level test");

      updateDiagnostic(
        "Microphone permission",
        "FAIL",
        "Mic level test could not start.",
        "Check microphone permissions and browser settings."
      );

      setOutput(`Mic level test FAIL:\n${clean}`);
    }
  }

  async function playSpeakerTest() {
    setOutput("Command received: speaker test");

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillatorRef.current = oscillator;

      oscillator.frequency.value = 440;
      gain.gain.value = 0.08;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();

      window.setTimeout(() => {
        try {
          oscillator.stop();
        } catch {
          // already stopped
        }
      }, 450);

      updateDiagnostic(
        "Speaker output",
        "PASS",
        "Speaker test tone was triggered.",
        "If you heard nothing, check Windows output device and browser volume."
      );

      setOutput("Speaker test PASS: short beep triggered.");
    } catch (err) {
      const clean = cleanErrorMessage(err, "speaker test");

      updateDiagnostic(
        "Speaker output",
        "FAIL",
        "Speaker test failed.",
        "Check browser audio permission and Windows sound output."
      );

      setOutput(`Speaker test FAIL:\n${clean}`);
    }
  }

  async function runFeedbackTest() {
    setOutput("Command received: Run Feedback Test");

    if (!micStreamRef.current) {
      updateDiagnostic(
        "Feedback loop risk",
        "WARNING",
        "Microphone is not active, so feedback risk cannot be tested yet.",
        "Click Request Mic Permission first."
      );

      setOutput("Feedback test WARNING: request microphone permission first.");
      return;
    }

    if (micLevel > 60) {
      updateDiagnostic(
        "Feedback loop risk",
        "WARNING",
        "High microphone level detected. Speaker may be feeding into microphone.",
        "Use headphones or lower speaker volume."
      );

      setOutput(
        "Feedback WARNING: possible audio feedback loop detected. Use headphones or lower speaker volume."
      );
    } else {
      updateDiagnostic(
        "Feedback loop risk",
        "PASS",
        "No strong feedback level detected at this moment.",
        "Continue testing carefully."
      );

      setOutput("Feedback test PASS: no strong feedback spike detected.");
    }
  }

  function testVoiceOutput() {
    setOutput("Command received: Test Voice Output");

    if (!("speechSynthesis" in window)) {
      updateDiagnostic(
        "Text-to-speech",
        "FAIL",
        "Browser text-to-speech is unavailable.",
        "Use Chrome or Edge."
      );

      setOutput("Voice output FAIL: speech synthesis unavailable.");
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        "Cherry voice output test."
      );

      window.speechSynthesis.speak(utterance);

      updateDiagnostic(
        "Text-to-speech",
        "PASS",
        "Browser voice output was triggered.",
        "If you heard nothing, check speaker volume and output device."
      );

      setOutput("Voice output PASS: Cherry voice test triggered.");
    } catch (err) {
      const clean = cleanErrorMessage(err, "speechSynthesis");

      updateDiagnostic(
        "Text-to-speech",
        "FAIL",
        "Voice output failed.",
        "Check browser speech synthesis support."
      );

      setOutput(`Voice output FAIL:\n${clean}`);
    }
  }

  function testSpeechRecognition() {
    setOutput("Command received: Test Speech Recognition");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      updateDiagnostic(
        "Speech-to-text",
        "WARNING",
        "Browser speech recognition is unavailable.",
        "Typed mode still works. Use Chrome if voice input is needed."
      );

      setOutput(
        "Speech recognition WARNING: browser does not support SpeechRecognition. Typed mode still works."
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
        setOutput("Speech recognition started. Say a short test phrase.");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";

        updateDiagnostic(
          "Speech-to-text",
          "PASS",
          `Speech recognised: ${transcript}`,
          "Speech recognition is working."
        );

        setOutput(`Speech recognition PASS:\nDetected: ${transcript}`);
      };

      recognition.onerror = (event: any) => {
        const error = String(event.error || "unknown");

        if (error === "no-speech" || error === "aborted") {
          updateDiagnostic(
            "Speech-to-text",
            "WARNING",
            `Speech recognition opened but returned: ${error}`,
            "Check selected microphone, speak clearly, or use typed mode."
          );

          setOutput(
            `Speech recognition WARNING:\n${error}\n\nTyped mode still works.`
          );

          return;
        }

        updateDiagnostic(
          "Speech-to-text",
          "FAIL",
          `Speech recognition error: ${error}`,
          "Check browser microphone permissions."
        );

        setOutput(`Speech recognition FAIL:\n${error}`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      const clean = cleanErrorMessage(err, "SpeechRecognition");

      updateDiagnostic(
        "Speech-to-text",
        "FAIL",
        "Speech recognition could not start.",
        "Use typed commands until speech recognition is repaired."
      );

      setOutput(`Speech recognition FAIL:\n${clean}`);
    }
  }

  function stopAudio() {
    console.log("[Cherry UI] command:", "audio stop");

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }

        recognitionRef.current = null;
      }

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }

      if (oscillatorRef.current) {
        try {
          oscillatorRef.current.stop();
        } catch {
          // ignore
        }

        oscillatorRef.current = null;
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }

        audioContextRef.current = null;
      }

      if (analyserTimerRef.current) {
        window.clearInterval(analyserTimerRef.current);
        analyserTimerRef.current = null;
      }

      window.speechSynthesis?.cancel();

      setIsListening(false);
      setMicLevel(0);

      setOutput(
        "Audio stopped. Microphone, speaker test, and voice output have been shut down."
      );
    } catch (err) {
      const clean = cleanErrorMessage(err, "audio stop");
      setOutput(`Audio stop WARNING:\n${clean}`);
    }
  }

  function generateTestReport() {
    const report = diagnostics
      .map(
        (item) =>
          `${item.status}: ${item.name}\n${item.message}\nNext action: ${item.nextAction}`
      )
      .join("\n\n");

    setOutput(`Cherry Manual Diagnostic Report\n\n${report}`);
  }

  async function runCommand(commandRaw: string) {
    const command = commandRaw.trim();
    const lower = command.toLowerCase();

    console.log("[Cherry UI] command:", command);

    if (!command) {
      setOutput("No command entered.");
      return;
    }

    setDeveloperDetails("");
    setOutput(`Command received: ${command}`);

    if (lower === "health check") {
      await runHealthCheck();
      return;
    }

    if (lower === "self test") {
      await runSelfTest();
      return;
    }

    if (lower === "quota status") {
      await runQuotaStatus();
      return;
    }

    if (lower === "manual full test") {
      setShowManualPanel(true);
      setOutput(
        "Manual Full Test panel opened. Cherry frontend buttons are working."
      );
      return;
    }

    if (lower === "audio stop" || lower === "stop audio") {
      stopAudio();
      return;
    }

    if (lower === "mic test" || lower === "start mic") {
      await requestMicPermission();
      return;
    }

    if (lower === "speaker test") {
      await playSpeakerTest();
      return;
    }

    if (lower === "test report") {
      generateTestReport();
      return;
    }

    if (lower.startsWith("ai:")) {
      await runAiCommand(command);
      return;
    }

    setOutput(
      `Command received: ${command}\n\nCherry frontend is working. This command did not need Gemini.`
    );
  }

  const buttonStyle: React.CSSProperties = {
    border: "none",
    borderRadius: "18px",
    padding: "1rem",
    minWidth: "92px",
    minHeight: "72px",
    background: "#2b2b33",
    color: "#ff3b78",
    fontWeight: 900,
    cursor: "pointer",
    pointerEvents: "auto",
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: isListening ? "#31ff5f" : "#ff2f70",
    color: isListening ? "#07130a" : "#ffffff",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050507",
        color: "#f2f2f4",
        fontFamily: "Segoe UI, Arial, sans-serif",
        display: "grid",
        placeItems: "start center",
        padding: "2rem",
      }}
    >
      <main
        style={{
          width: "min(760px, 96vw)",
          background: "#121217",
          border: "1px solid #22222c",
          borderRadius: "28px",
          padding: "2rem",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          pointerEvents: "auto",
          position: "relative",
          zIndex: 1,
        }}
      >
        <header style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1
            style={{
              margin: 0,
              color: "#ff2f70",
              letterSpacing: "0.14em",
              fontSize: "2.4rem",
            }}
          >
            CHERRY
          </h1>

          <p
            style={{
              marginTop: "0.4rem",
              color: "#777782",
              letterSpacing: "0.35em",
              fontSize: "0.76rem",
              fontWeight: 700,
            }}
          >
            DAVID NARDOO'S AI CONTROL CENTRE
          </p>
        </header>

        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.85rem",
            justifyContent: "center",
            marginBottom: "1.25rem",
          }}
        >
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => runCommand("mic test")}
          >
            🎙️
            <br />
            {isListening ? "LISTENING" : "START MIC"}
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => runCommand("audio stop")}
          >
            ⏹️
            <br />
            STOP AUDIO
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => runCommand("health check")}
          >
            health
            <br />
            check
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => runCommand("self test")}
          >
            self
            <br />
            test
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => runCommand("quota status")}
          >
            quota
            <br />
            status
          </button>

          <button
            type="button"
            style={buttonStyle}
            onClick={() => runCommand("manual full test")}
          >
            Manual
            <br />
            Full Test
          </button>
        </section>

        <section
          style={{
            background: "#050507",
            borderRadius: "14px",
            padding: "1.2rem",
            minHeight: "150px",
            whiteSpace: "pre-wrap",
            color: "#d7d7df",
            lineHeight: 1.5,
            marginBottom: "1rem",
            border: "1px solid #1c1c24",
          }}
        >
          {output}
        </section>

        {developerDetails && (
          <details
            style={{
              background: "#09090d",
              border: "1px solid #2b2b33",
              borderRadius: "12px",
              padding: "0.8rem",
              marginBottom: "1rem",
              color: "#bdbdc8",
            }}
          >
            <summary style={{ cursor: "pointer", color: "#ff2f70" }}>
              Developer Details
            </summary>

            <pre style={{ whiteSpace: "pre-wrap" }}>{developerDetails}</pre>
          </details>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "0.75rem",
            marginBottom: "1rem",
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
            placeholder="Type or paste instructions here..."
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
            ⬇ SEND
          </button>
        </section>

        <section
          style={{
            border: "1px dashed #333340",
            borderRadius: "14px",
            padding: "1rem",
            color: "#777782",
            textAlign: "center",
            marginBottom: "1rem",
          }}
        >
          📁 Drag & Drop Images / Assets Here to Process
        </section>

        <section
          style={{
            background: "#09090d",
            borderRadius: "14px",
            padding: "1rem",
            marginBottom: "1rem",
            border: "1px solid #22222c",
          }}
        >
          <strong style={{ color: "#ff2f70" }}>Mic level:</strong>{" "}
          <span>{micLevel}</span>

          <div
            style={{
              height: "10px",
              background: "#1c1c24",
              borderRadius: "999px",
              marginTop: "0.5rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, micLevel)}%`,
                height: "100%",
                background: micLevel > 60 ? "#ff2f70" : "#31ff5f",
              }}
            />
          </div>
        </section>

        {showManualPanel && (
          <section
            style={{
              background: "#0b0b10",
              border: "1px solid #2c2c38",
              borderRadius: "18px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <h2 style={{ color: "#ff2f70", marginTop: 0 }}>
              Cherry Manual Diagnostic Panel
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "0.7rem",
                marginBottom: "1rem",
              }}
            >
              <button
                type="button"
                style={buttonStyle}
                onClick={() => runHealthCheck()}
              >
                Run Core Test
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => runApiTest()}
              >
                Run API Test
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => requestMicPermission()}
              >
                Request Mic Permission
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => runMicLevelTest()}
              >
                Run Mic Level Test
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => playSpeakerTest()}
              >
                Play Speaker Test
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => runFeedbackTest()}
              >
                Run Feedback Test
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => testVoiceOutput()}
              >
                Test Voice Output
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => testSpeechRecognition()}
              >
                Test Speech Recognition
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => stopAudio()}
              >
                Stop Audio
              </button>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => generateTestReport()}
              >
                Generate Test Report
              </button>
            </div>

            <div style={{ display: "grid", gap: "0.65rem" }}>
              {diagnostics.map((item) => (
                <article
                  key={item.name}
                  style={{
                    background: "#15151d",
                    border: "1px solid #282834",
                    borderRadius: "12px",
                    padding: "0.85rem",
                  }}
                >
                  <strong style={{ color: "#ffffff" }}>{item.name}</strong>

                  <div
                    style={{
                      color:
                        item.status === "PASS"
                          ? "#31ff5f"
                          : item.status === "FAIL"
                          ? "#ff2f70"
                          : item.status === "WARNING"
                          ? "#ffd166"
                          : "#bdbdc8",
                      fontWeight: 900,
                      marginTop: "0.3rem",
                    }}
                  >
                    {item.status}
                  </div>

                  <p style={{ margin: "0.4rem 0", color: "#d7d7df" }}>
                    {item.message}
                  </p>

                  <small style={{ color: "#8a8a96" }}>
                    Next action: {item.nextAction}
                  </small>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}