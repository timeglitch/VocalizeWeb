import React, { useEffect, useState, useRef, useCallback } from "react";
import { loadWavFile } from "./audioUtils";
import {
    Container,
    Button,
    Nav,
    Navbar,
    Offcanvas,
    NavItem,
} from "react-bootstrap";
import { ReactComponent as Logo } from "./assets/img/logo.svg";
import { lpc, drawSpectralEnvelope } from "./speechProcessingUtils";
import StimulusBar from "./components/StimulusBar.jsx";
import PlaybackSpeed from "./components/PlaybackSpeed.jsx";
import styles from "./styles";
import "./App.css";

// Add this helper to parse query params
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

export default function Main() {
    // Toggle to adjust playback speed
    const speeds = [1, 0.75, 0.5, 0.25];
    const [currSpeed, setCurrSpeed] = useState(1); // default speed
    // moduleType = Vowel or Stress, L1 folder = L1 speaker, L2 folder = L2 speaker
    const [moduleType, setModuleType] = useState(
        getQueryParam("module") || "Vowel"
    );

    useEffect(() => {
        const handlePop = () => {
            setSelectedSubmodule(getQueryParam("submodule") || "Segment");
            setModuleType(getQueryParam("module") || "Vowel");
        };
        handlePop();
        window.addEventListener("popstate", handlePop);
        return () => window.removeEventListener("popstate", handlePop);
    }, []);

    const adjustPlaybackSpeed = (newRate) => {
        if (audioElementRef.current) {
            audioElementRef.current.playbackRate = newRate;
        }
        if (wavAudioRef.current) {
            wavAudioRef.current.playbackRate = newRate;
        }
        setCurrSpeed(newRate);
        console.log("Playback speed set to:", newRate);
    };

    //TODO: Make firefox compatible, move this to the beginning of the app so it shows only once
    //TODO: add warning for mobile, make mobile compatible
    useEffect(() => {
        const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
        if (isFirefox) {
            alert(
                "This application may not work properly in Firefox. Please use Chrome or Edge for best compatibility. \n The live visualization works, but the recording and playback features may not function as expected."
            );
        }
    }, []);

    const [lpcOrder, setLpc] = useState(45);
    const [rec, setRec] = useState(false);
    const audioCtx = useRef(null);
    const analyzer = useRef(null);
    const mic = useRef(null);
    const node = useRef(null);
    const canvasRef = useRef(null);
    const ctxRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);

    // state variables for recording and playback
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const audioElementRef = useRef(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [wavBuffer, setWavBuffer] = useState(null);
    const wavAudioRef = useRef(null);

    const vowelstimuli = require("./VowelStimuli.json");

    const [userAudioLPC, setUserAudioLPC] = useState(null);
    const [nativeAudioLPC, setNativeAudioLPC] = useState(null);
    const [foreignAudioLPC, setForeignAudioLPC] = useState(null);

    // set canvas dimensions
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        ctxRef.current = ctx;
        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 384;
            canvas.style.width = "100%";
            canvas.style.height = "384px";
            canvas.style.borderRadius = "0.5rem"; // rounded-lg
            canvas.style.overflow = "hidden";
            canvas.style.marginBottom = "1.5rem"; // mb-6
        };
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);
        return () => window.removeEventListener("resize", resizeCanvas); // cleanup on unmount
    }, []);

    // Functions for live audio processing, recording, and playback with visuals of user speech

    // event listener for the start button
    const startButton = () => {
        if (rec) {
            stopCapture();
        } else if (!rec) {
            startCapture();
            setProg(5);
            setTimeElapsed(0);
        }
        setRec((r) => !r);
        setIsActive((is) => !is);
    };

    // start audio capture and recording
    async function startCapture() {
        try {
            // Initialize AudioContext
            audioCtx.current = new (window.AudioContext ||
                window.webkitAudioContext)();

            // Get audio stream from microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = stream;
            mic.current = audioCtx.current.createMediaStreamSource(stream);

            // Create an analyser node
            analyzer.current = audioCtx.current.createAnalyser();
            analyzer.current.fftSize = 2048;

            // Create a script processor node for custom processing
            node.current = audioCtx.current.createScriptProcessor(2048, 1, 1);
            node.current.onaudioprocess = processAudio;

            // Connect the nodes: microphone -> analyser -> javascriptNode -> destination
            mic.current.connect(analyzer.current);
            analyzer.current.connect(node.current);
            node.current.connect(audioCtx.current.destination);

            // --- MediaRecorder for playback ---
            let mimeType = "";

            if (MediaRecorder.isTypeSupported("audio/wav")) {
                mimeType = "audio/wav";
            } else if (MediaRecorder.isTypeSupported("audio/ogg")) {
                mimeType = "audio/ogg";
            } else {
                mimeType = "audio/webm";
            }

            const recorder = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];
            setMediaRecorder(recorder);
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                setAudioURL(URL.createObjectURL(blob));
            };
            recorder.start();

            setRec(true);
        } catch (err) {
            console.log("Error accessing microphone: " + err.message);
        }
    }

    // stop audio capture and recording
    async function stopCapture() {
        if (mic.current) {
            mic.current.disconnect();
            analyzer.current.disconnect();
            node.current.disconnect();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            // close the audio context so we can restart it
            await audioCtx.current.close();
            audioCtx.current = null;
            analyzer.current = null;
            mic.current = null;
            node.current = null;
            streamRef.current = null;
            setRec(false);
            // --- Stop MediaRecorder ---
            if (mediaRecorder && mediaRecorder.state !== "inactive") {
                console.log("MediaRecorder state:", mediaRecorder.state);
                mediaRecorder.stop();
            }
            setMediaRecorder(null);
            console.log("Audio capture stopped.");
        }
    }

    // TODO: make window a reusable function so it can be drawn twice in stress module
    // main audio processing function
    const processAudio = (e) => {
        const buffer = new Float32Array(analyzer.current.fftSize);
        analyzer.current.getFloatTimeDomainData(buffer);

        // LPC analysis
        const { a, err } = lpc(buffer, lpcOrder);
        console.log("Processing audio, live user lpc is ", a);

        if (a && a[0] > 0) {
            // basic check to ensure LPC is valid, otherwise don't overwrite previous valid LPC
            setUserAudioLPC(a);
        } else {
            console.log("No!!!! LPC failed: ", err);
        }
    };

    //const duration = 100;
    const [timeElapsed, setTimeElapsed] = useState(0); // changed from timeLeft
    const [prog, setProg] = useState(5);
    const [isActive, setIsActive] = useState(false);

    // Timer counts up
    useEffect(() => {
        if (!isActive) return;
        const tim = setInterval(() => {
            if (isActive) {
                setTimeElapsed((prev) => prev + 1);
                setProg(prog - 1);
            }
        }, 1000);
        return () => clearInterval(tim);
    }, [isActive, timeElapsed, prog]);

    const [selectedVowel, setSelectedVowel] = useState("a"); //when selectedVowel changes, the canvas should update to show the spectral envelope for that vowel, and the stimulus should change to a random one from the list of stimuli for that vowel
    const vowels = [
        { label: "[a]", value: "a" },
        { label: "[e]", value: "e" },
        { label: "[i]", value: "i" },
        { label: "[o]", value: "o" },
        { label: "[u]", value: "u" },
    ];
    //add state for module (vowel or stress)

    // Add state for submodule
    const [selectedSubmodule, setSelectedSubmodule] = useState(
        getQueryParam("submodule") || "Segment"
    );
    // Add state for stimulus
    const [selectedStimulus, setSelectedStimulus] = useState(null);
    const [stimIndex, setStimIndex] = useState(0); // Global index to keep track of which stimulus to show next

    //update stimulus and graph when vowel changes
    useEffect(() => {
        //console.log("Submodule changed to:", selectedSubmodule);

        let selectedStimulusIndex =
            stimIndex %
            vowelstimuli["Vowel"][selectedVowel][selectedSubmodule].length;
        let stim =
            vowelstimuli["Vowel"][selectedVowel][selectedSubmodule][
                selectedStimulusIndex
            ];
        if (!stim) {
            setSelectedStimulus("No stimulus available");
        } else if (typeof stim === "string") {
            setSelectedStimulus(stim);
        } else if (typeof stim === "object" && Array.isArray(stim)) {
            let hstart;
            let hend;
            if (typeof stim[1] === "number") {
                hstart = stim[1];
                hend = hstart + 1;
            } else if (typeof stim[1] === "object" && Array.isArray(stim[1])) {
                hstart = stim[1][0];
                hend = stim[1][1];
            } else {
                console.error(
                    "Error: Invalid stimulus format: highlighted segment indexes unrecognized",
                    stim
                );
            }

            setSelectedStimulus(
                `${stim[0].slice(
                    0,
                    hstart
                )}<span style="background: #ffe066; color: #222; padding: 0 2px;">${stim[0].slice(
                    hstart,
                    hend
                )}</span>${stim[0].slice(hend)}`
            ); //TODO: injecting the highlighting in this way is probably not the best way, but it works for now
        } else {
            setSelectedStimulus(
                "Error: Invalid stimulus format" + JSON.stringify(stim)
            );
        }

        // Update the canvas by restarting the audio capture if running
        if (audioCtx.current) {
            stopCapture();
            startCapture();
        }

        drawSpectralEnvelope({
            lpcCoefficients: null, // No LPC coefficients yet, just draw axes
            sampleRate: null,
            canvasContext: ctxRef.current,
            vowelStimuli: vowelstimuli,
            selectedVowel,
            onlyDrawAxes: true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedVowel, stimIndex, selectedSubmodule, vowelstimuli]);

    // Update submodule if URL changes
    const handlePopState = useCallback(() => {
        setSelectedSubmodule(getQueryParam("submodule") || "Segment");
    }, []);
    useEffect(() => {
        handlePopState();
        window.addEventListener("popstate", handlePopState);
        return () => window.removeEventListener("popstate", handlePopState);
    }, [handlePopState]);

    // Decode audio when audioURL changes
    useEffect(() => {
        if (!audioURL) return;
        const context = new (window.AudioContext ||
            window.webkitAudioContext)();
        fetch(audioURL)
            .then((res) => res.arrayBuffer())
            .then((arrayBuffer) => {
                context.decodeAudioData(arrayBuffer, (buffer) => {
                    setAudioBuffer(buffer);
                });
            });
    }, [audioURL]);

    // Update LPC analysis during playback
    useEffect(() => {
        const audioEl = audioElementRef.current;
        if (!audioEl || !audioBuffer) return;
        const context = audioBuffer;
        let rafId = null;
        function updateLPC() {
            if (!audioEl.paused && !audioEl.ended) {
                const sr = context.sampleRate;
                const pos = Math.floor(audioEl.currentTime * sr);
                const windowSize = 2048;
                let samples = new Float32Array(windowSize);
                if (pos + windowSize < context.length) {
                    samples = context
                        .getChannelData(0)
                        .slice(pos, pos + windowSize);
                } else {
                    samples = context
                        .getChannelData(0)
                        .slice(context.length - windowSize);
                }
                const { a, err } = lpc(samples, lpcOrder);
                if (a) {
                    setUserAudioLPC(a);
                } else {
                    console.log("Playback error, LPC: ", err);
                }
                rafId = requestAnimationFrame(updateLPC);
            }
        }
        const startRaf = () => {
            if (!rafId) rafId = requestAnimationFrame(updateLPC);
        };
        const stopRaf = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        };
        audioEl.addEventListener("play", startRaf);
        audioEl.addEventListener("pause", stopRaf);
        audioEl.addEventListener("ended", stopRaf);
        return () => {
            updateLPC();
            stopRaf();
            audioEl.removeEventListener("play", startRaf);
            audioEl.removeEventListener("pause", stopRaf);
            audioEl.removeEventListener("ended", stopRaf);
        };
    }, [audioBuffer, lpcOrder, selectedVowel, vowelstimuli]);

    /**
     * Update graph when LPC data changes
     */
    useEffect(() => {
        if (ctxRef.current && canvasRef.current && audioBuffer) {
            drawSpectralEnvelope({
                lpcCoefficients: userAudioLPC,
                lpcCoefficients2: nativeAudioLPC,
                lpcCoefficients3: foreignAudioLPC,
                sampleRate: audioBuffer.sampleRate,
                canvasContext: ctxRef.current,
                vowelStimuli: vowelstimuli,
                selectedVowel,
            });
        }
    }, [
        userAudioLPC,
        nativeAudioLPC,
        foreignAudioLPC,
        audioBuffer,
        selectedVowel,
        vowelstimuli,
    ]);

    // Functions for loading and playing the correct stimulus audio

    // Load the wav file on mount
    useEffect(() => {
        let isMounted = true;
        const loadWav = async () => {
            if (!selectedStimulus) return;
            try {
                const ctx =
                    audioCtx.current ||
                    new (window.AudioContext || window.webkitAudioContext)();
                // remove highlighting tags to get the full stimulus file name
                let stimTrim = selectedStimulus
                    .replace(
                        /<span style="background: #ffe066; color: #222; padding: 0 2px;">/g,
                        ""
                    )
                    .replace("</span>", ""); //TODO: this is cursed
                const folder = moduleType === "Stress" ? "l2" : "l1"; //TODO: we actually need to load two files in stress module, one for L1 and one for L2
                const url = "/audio/" + folder + "/" + stimTrim + ".wav"; // e.g.: /audio/l1/<file>.wav
                console.log("Loading wav file:", url);
                const buffer = await loadWavFile(url, ctx);
                if (isMounted) {
                    setWavBuffer(buffer);
                    if (wavAudioRef.current) {
                        wavAudioRef.current.src = url;
                        console.log("Wav file loaded successfully");
                    }
                }
            } catch (e) {
                console.error("Failed to load wav:", e);
                // TODO: handle error more gracefully. Right now, all we get is a console error, and the audio element just plays the last successful file
            }
        };
        loadWav().catch((e) => console.error("uncaught promise ", e));
        return () => {
            isMounted = false;
        };
    }, [selectedStimulus]);

    // Animate LPC canvas during wav playback
    useEffect(() => {
        const audioEl = wavAudioRef.current;
        if (!audioEl || !wavBuffer) return;
        let rafId = null;
        const updateLPC = () => {
            if (!audioEl.paused && !audioEl.ended) {
                const sr = wavBuffer.sampleRate;
                const pos = Math.floor(audioEl.currentTime * sr);
                const windowSize = 2048;
                let samples;
                if (pos + windowSize < wavBuffer.length) {
                    samples = wavBuffer
                        .getChannelData(0)
                        .slice(pos, pos + windowSize);
                } else {
                    samples = wavBuffer
                        .getChannelData(0)
                        .slice(wavBuffer.length - windowSize);
                }
                const { a } = lpc(samples, lpcOrder);
                if (a && ctxRef.current && canvasRef.current) {
                    setNativeAudioLPC(a);
                }
                rafId = requestAnimationFrame(updateLPC);
            }
        };
        const startRaf = () => {
            if (!rafId) rafId = requestAnimationFrame(updateLPC);
        };
        const stopRaf = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        };
        audioEl.addEventListener("play", startRaf);
        audioEl.addEventListener("pause", stopRaf);
        audioEl.addEventListener("ended", stopRaf);
        return () => {
            stopRaf();
            audioEl.removeEventListener("play", startRaf);
            audioEl.removeEventListener("pause", stopRaf);
            audioEl.removeEventListener("ended", stopRaf);
        };
    }, [wavBuffer, lpcOrder, selectedVowel, vowelstimuli]);

    // Offcanvas (hamburger menu) state
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    // Advanced settings dropdown
    const [settingsOpen, setSettingsOpen] = useState(false);
    const toggleOpen = () => setSettingsOpen(true);
    const toggleClose = () => setSettingsOpen(false);

    // Shared hover handlers for nav links
    const onLinkHover = (e) => {
        e.currentTarget.style.color = styles.ofLinks.hover.color;
        e.currentTarget.style.backgroundColor =
            styles.ofLinks.hover.backgroundColor;
    };
    const onLinkOut = (e) => {
        e.currentTarget.style.color = styles.ofLinks.color;
        e.currentTarget.style.backgroundColor = styles.ofLinks.backgroundColor;
    };
    const submodulesList = [
        "Segment",
        "Syllable",
        "Word",
        "Phrase",
        "Sentence",
    ];

    return (
        <div className="main-container" style={{ backgroundColor: "#F2F1EB" }}>
            <Container className="main">
                <Navbar
                    bg="#F3540F"
                    variant="dark"
                    style={{ marginBottom: "1rem", borderRadius: "0.5rem" }}
                >
                    <Navbar.Brand
                        style={{
                            fontWeight: "bold",
                            fontSize: "1rem",
                            color: "#F2F1EB",
                            cursor: "pointer",
                            padding: "0.5rem",
                            boxShadow: "0 4px 15px rgb(0, 57, 51)",
                        }}
                        onClick={handleShow}
                    >
                        <Logo
                            alt=""
                            width="1.5rem"
                            height="1.5rem"
                            className="d-inline-block align-top"
                            style={{
                                marginRight: "10px",
                                backgroundColor: "#F2F1EB",
                                borderRadius: "5px",
                                padding: "2px",
                            }}
                        />
                        <NavItem
                            style={{
                                display: "inline",
                                color: "#13120F",
                                fontSize: "1rem",
                                fontFamily: "Nexa-Heavy, sans-serif",
                                letterSpacing: "0.08em",
                            }}
                        >
                            Submodules
                        </NavItem>
                    </Navbar.Brand>
                    <Navbar.Toggle
                        onClick={handleShow}
                        aria-controls="offcanvasNavbar"
                    />
                </Navbar>

                <Offcanvas
                    show={show}
                    onHide={handleClose}
                    placement="start"
                    style={styles.offcanva}
                >
                    <Offcanvas.Header closeButton>
                        <Offcanvas.Title>Submodules Menu</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <Nav className="flex-column">
                            {submodulesList.map((sub) => (
                                <Nav.Link
                                    key={sub}
                                    href={`../Main?module=${encodeURIComponent(
                                        moduleType
                                    )}&submodule=${encodeURIComponent(sub)}`}
                                    onClick={handleClose}
                                    style={styles.ofLinks}
                                    onMouseOver={onLinkHover}
                                    onMouseOut={onLinkOut}
                                >
                                    {sub}
                                </Nav.Link>
                            ))}
                            <Nav.Link
                                href="../Modules"
                                onClick={handleClose}
                                style={{
                                    ...styles.ofLinks,
                                    fontWeight: "bold",
                                }}
                                onMouseOver={onLinkHover}
                                onMouseOut={onLinkOut}
                            >
                                Back to Modules
                            </Nav.Link>
                        </Nav>
                    </Offcanvas.Body>
                </Offcanvas>

                <h1 className="header" style={styles.header}>
                    Practice
                </h1>
                {/* Show selected submodule */}
                <div style={styles.submodule}>
                    Submodule: {selectedSubmodule}
                </div>

                {/* Stimulus display section */}
                <div className="stimulus-section" style={styles.submodule}>
                    {/* Stimulus display and controls */}
                    Say:&nbsp;
                    {selectedStimulus ? (
                        <span
                            dangerouslySetInnerHTML={{
                                __html: selectedStimulus,
                            }}
                        />
                    ) : (
                        <span style={{ color: "#9ca3af" }}>
                            No stimulus available
                        </span>
                    )}
                    <div style={{ margin: "1rem 0" }}>
                        <Button
                            style={{ ...styles.buttons, fontWeight: "bold" }}
                            onClick={() => {
                                setStimIndex(stimIndex + 1);
                                console.log("Next stimulus loaded");
                            }} // Increment stimIndex to get next stimulus
                        >
                            Next
                        </Button>
                    </div>
                    <StimulusBar
                        src={wavAudioRef.current?.src}
                        audioElementRef={wavAudioRef}
                        message={"Click play to hear target audio"}
                    />
                    <div
                        className="vowel-selector"
                        style={{ marginTop: "0.5rem", marginBottom: "1rem" }}
                    >
                        <select
                            id="vowelSelect"
                            value={selectedVowel}
                            style={styles.vowelSelect}
                            onChange={(e) => setSelectedVowel(e.target.value)}
                        >
                            {vowels.map((v) => (
                                <option key={v.value} value={v.value}>
                                    {v.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {/* --- Live audio capture and visualization --- */}
                    <div
                        className="canvas-container"
                        style={styles.canvasContainer}
                    >
                        <canvas ref={canvasRef} className="canvas" />
                    </div>
                    <div
                        style={{
                            marginLeft: "1rem",
                            fontSize: "1rem",
                            marginTop: "0.25rem",
                            color: "#f0ead2",
                        }}
                    >
                        <PlaybackSpeed
                            currSpeed={currSpeed}
                            onChange={(e) =>
                                adjustPlaybackSpeed(parseFloat(e.target.value))
                            }
                            speeds={speeds}
                        />
                    </div>
                    <Button
                        variant="primary"
                        onClick={startButton}
                        style={styles.buttons}
                    >
                        {rec ? "Stop" : "Start"} Capture Audio
                    </Button>
                    {/* --- Playback UI & LPC analysis button --- */}
                    {audioURL && (
                        <div style={styles.audioPlayer}>
                            <audio
                                controls
                                src={audioURL}
                                ref={audioElementRef}
                                style={{ width: "100%" }}
                            />
                            <div
                                style={{
                                    fontSize: "0.9rem",
                                    color: "#f0ead2",
                                    marginTop: "0.5rem",
                                }}
                            >
                                Playback your recording above.
                            </div>
                            <PlaybackSpeed
                                currSpeed={currSpeed}
                                onChange={(e) =>
                                    adjustPlaybackSpeed(
                                        parseFloat(e.target.value)
                                    )
                                }
                                speeds={speeds}
                            />
                        </div>
                    )}
                </div>
                <Offcanvas
                    show={settingsOpen}
                    onHide={toggleClose}
                    placement="bottom"
                    style={styles.offcanva}
                >
                    <Offcanvas.Header closeButton>
                        <Offcanvas.Title>Advanced Settings</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <div
                            className="lpc-order"
                            style={styles.canvasContainer}
                        >
                            <label
                                htmlFor="lpcOrder"
                                style={{ color: "#f0ead2", fontSize: "1.2rem" }}
                            >
                                LPC Order:
                            </label>
                            <input
                                type="number"
                                id="lpcOrder"
                                value={lpcOrder}
                                onChange={(e) => setLpc(e.target.value)}
                                min="1"
                                max="100"
                            />
                            <div
                                style={{
                                    fontSize: "1.1rem",
                                    color: "#f0ead2",
                                    marginTop: "0.5rem",
                                }}
                            >
                                Adjust the LPC order to change the wave detail
                                level.
                                <br />
                                Default is 45, which is necessary to capture the
                                details at this sample rate.
                            </div>
                        </div>
                    </Offcanvas.Body>
                </Offcanvas>
                <Button
                    variant="secondary"
                    onClick={toggleOpen}
                    style={{
                        ...styles.buttons,
                        marginTop: "1rem",
                        marginBottom: "1rem",
                    }}
                >
                    Advanced Settings
                </Button>
            </Container>
        </div>
    );
}
