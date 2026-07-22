import { useEffect, useRef, useState } from "react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { TextRecognition } from "@capacitor-mlkit/text-recognition";
import { CodeKeypad } from "./components/CodeKeypad";
import { SortSelect } from "./components/SortSelect";
import { CodeList } from "./components/CodeList";
import { MapView } from "./components/MapView";
import { SHOW_DEBUG_UI } from "./debug";
import { parsePlate } from "./plate";
import { progressStore } from "./progress";
import type { ProgressOut, SortMode } from "./types";
import { parseSpokenCode } from "./voice";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function App() {
  const [progress, setProgress] = useState<ProgressOut>(() => progressStore.getProgress());
  const [sortMode, setSortMode] = useState<SortMode>("district");
  const [showMap, setShowMap] = useState(true);
  const [filter, setFilter] = useState("");
  const [showKeypad, setShowKeypad] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<{ photoUri: string; caption: string } | null>(null);
  const [filterSource, setFilterSource] = useState<"manual" | "voice" | "camera" | null>(null);
  const recordingRef = useRef(false);

  function handleToggleCode(code: string, nextFound: boolean) {
    setProgress(progressStore.setCodeFound(code, nextFound));
  }

  useEffect(() => {
    const handle = SpeechRecognition.addListener("partialResults", (data) => {
      const text = data.matches?.[0];
      if (text) {
        const code = parseSpokenCode(text);
        setFilterSource(code ? "voice" : null);
        setFilter(code);
      }
    });
    return () => {
      handle.then((listener) => listener.remove());
    };
  }, []);

  async function startVoiceInput() {
    recordingRef.current = true;
    try {
      const { available } = await SpeechRecognition.available();
      if (!available || !recordingRef.current) return;
      const status = await SpeechRecognition.checkPermissions();
      if (status.speechRecognition !== "granted") {
        const requested = await SpeechRecognition.requestPermissions();
        if (requested.speechRecognition !== "granted") return;
      }
      if (!recordingRef.current) return;
      setIsRecording(true);
      await SpeechRecognition.start({
        language: "ru-RU",
        partialResults: true,
        popup: false,
        maxResults: 1,
      });
      if (!recordingRef.current) {
        // the button was released while start() was still resolving
        await SpeechRecognition.stop();
      }
    } catch {
      setIsRecording(false);
    }
  }

  async function stopVoiceInput() {
    recordingRef.current = false;
    setIsRecording(false);
    try {
      await SpeechRecognition.stop();
    } catch {
      // ignore
    }
  }

  async function handleCameraTap() {
    const wasMine = Boolean(filter) && filterSource === "camera";
    setFilter("");
    setFilterSource(null);
    if (wasMine) return;
    setIsScanning(true);
    try {
      const photo = await Camera.takePhoto({});
      if (!photo.uri) return;
      const photoUri = photo.uri;
      let caption = "не распознано";
      let code = "";
      try {
        // ML Kit's processImage requires a real file:// path — the content://
        // URI that Camera.takePhoto() returns on Android isn't accepted, so
        // copy the photo into the app's own cache dir first to get one.
        const { data } = await Filesystem.readFile({ path: photoUri });
        const cacheName = `scan-${Date.now()}.jpg`;
        await Filesystem.writeFile({ path: cacheName, directory: Directory.Cache, data: data as string });
        const { uri: localUri } = await Filesystem.getUri({ path: cacheName, directory: Directory.Cache });
        const { text } = await TextRecognition.processImage({ path: localUri });
        const parsed = parsePlate(text);
        if (parsed) {
          caption = parsed.plate;
          code = parsed.code;
        } else {
          caption = text.trim().slice(0, 40) || "не распознано";
        }
      } catch (err) {
        caption = `ошибка распознавания: ${err instanceof Error ? err.message : String(err)}`;
      }
      // Show the photo that was just taken for 2s before applying the filter —
      // both a UX confirmation and a way to see why parsing failed, if it did.
      setScanPreview({ photoUri: Capacitor.convertFileSrc(photoUri), caption });
      window.setTimeout(() => {
        setScanPreview(null);
        if (code) {
          setFilterSource("camera");
          setFilter(code);
        }
      }, 2000);
    } catch {
      // user cancelled the camera — nothing to show
    } finally {
      setIsScanning(false);
    }
  }

  const percent = progress.total_codes
    ? Math.round((progress.found_codes / progress.total_codes) * 100)
    : 0;

  return (
    <div className="app">
      {SHOW_DEBUG_UI && <div className="build-banner">BUILD: {__BUILD_TIME__}</div>}
      <div className="app-top">
        <header className="app-header">
          <h1>Авто-бинго</h1>
          <div className="stats">
            <span>{progress.found_codes}/{progress.total_codes} серий</span>
            <span className="stats-sep" aria-hidden="true">•</span>
            <span>{progress.fully_found_regions}/{progress.total_regions} регионов</span>
            <span className="stats-sep" aria-hidden="true">•</span>
            <span>{percent}% закрыто</span>
          </div>
          <div className="toggles-row">
            <SortSelect value={sortMode} onChange={setSortMode} />
            <label className="hide-completed-toggle">
              <input
                type="checkbox"
                checked={showMap}
                onChange={(e) => setShowMap(e.target.checked)}
              />
              Карта России
            </label>
          </div>
        </header>
        <div className="map-wrap">
          <div className={showMap ? undefined : "map-hidden"}>
            <MapView regions={progress.regions} />
          </div>
        </div>
      </div>
      <main className="list-scroll">
        <CodeList
          regions={progress.regions}
          onToggleCode={handleToggleCode}
          sortMode={sortMode}
          filter={filter}
        />
      </main>
      <div className="action-bar">
        {showKeypad && (
          <CodeKeypad
            value={filter}
            onChange={(v) => {
              setFilterSource(v ? "manual" : null);
              setFilter(v);
            }}
          />
        )}
        <div className="action-controls">
          <div className="code-keypad-display">{filter}</div>
          <button
            type="button"
            className="camera-btn"
            aria-label={
              filter && filterSource === "camera" ? "Очистить код региона" : "Сфотографировать номер"
            }
            onClick={handleCameraTap}
            disabled={isScanning}
          >
            {filter && filterSource === "camera" ? (
              <CloseIcon />
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            type="button"
            className={`mic-btn${isRecording ? " recording" : ""}`}
            aria-label="Голосовой ввод кода региона"
            onPointerDown={(e) => {
              e.preventDefault();
              const wasMine = Boolean(filter) && filterSource === "voice";
              setFilter("");
              setFilterSource(null);
              if (!wasMine) startVoiceInput();
            }}
            onPointerUp={stopVoiceInput}
            onPointerLeave={stopVoiceInput}
            onPointerCancel={stopVoiceInput}
          >
            {filter && filterSource === "voice" ? (
              <CloseIcon />
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 11a7 7 0 0 1-14 0M12 18v3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            className="fab-edit"
            aria-label={showKeypad ? "Скрыть форму ввода кода" : "Показать форму ввода кода"}
            onClick={() =>
              setShowKeypad((v) => {
                if (v) {
                  setFilter("");
                  setFilterSource(null);
                }
                return !v;
              })
            }
          >
            {showKeypad ? (
              <CloseIcon />
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="5" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="19" cy="5" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="5" cy="5" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="19" cy="12" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="5" cy="12" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="19" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="19" cy="19" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="5" cy="19" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {scanPreview && (
        <div className="scan-preview-overlay">
          <div className="scan-preview-card">
            <img className="scan-preview-photo" src={scanPreview.photoUri} alt="Сфотографированный номер" />
            <div className="scan-preview-caption">{scanPreview.caption}</div>
          </div>
        </div>
      )}
    </div>
  );
}
