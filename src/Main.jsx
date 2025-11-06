import React, { useEffect, useState, useRef, useCallback } from "react";
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
import StimulusPlayer from "./components/StimulusPlayer";
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
        setCurrSpeed(newRate);
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

    const vowelstimuli = require("./VowelStimuli.json");
    const stresstimuli = require("./StressStimuli.json");
    // eslint-disable-next-line
    const [showStim, selectStimToShow] = useState(null); // displayed stimulus
    const [currStimList, setCurrStimList] = useState([]); // active lists

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
                mediaRecorder.stop();
            }
            setMediaRecorder(null);
        }
    }

    // main audio processing function
    const processAudio = (e) => {
        const buffer = new Float32Array(analyzer.current.fftSize);
        analyzer.current.getFloatTimeDomainData(buffer);

        // LPC analysis
        const { a, err } = lpc(buffer, lpcOrder);

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

    // Add state for submodule
    const [selectedSubmodule, setSelectedSubmodule] = useState(
        getQueryParam("submodule") || "Segment"
    );
    // Add state for stimulus
    const [selectedStimulus, setSelectedStimulus] = useState(null);
    const [stimIndex, setStimIndex] = useState(0); // Global index to keep track of which stimulus to show next

    // Update stimulus and graph when vowel changes
    useEffect(() => {
        const source = moduleType === "Vowel" ? vowelstimuli?.Vowel : stresstimuli?.Stress;
        const lst = source?.[selectedVowel]?.[selectedSubmodule] ?? [];
        setCurrStimList(lst);
        setStimIndex(lst.length);
        // eslint-disable-next-line
    }, [moduleType, selectedVowel, selectedSubmodule]);

    useEffect(() => {
        const lst = currStimList;
        if (lst.length === 0) {
            selectStimToShow(null);
            setSelectedStimulus("No stimulus available");
            return;
        } else {
            if (lst.length === 1) {
                setStimIndex(0);
                selectStimToShow(lst[0]); // basically what segments do
            }
            const idx = stimIndex % lst.length;
            selectStimToShow(lst[idx]);

            if (typeof lst[idx] === "string") {
                setSelectedStimulus(lst[idx]);
            } else if (Array.isArray(lst[idx]) && typeof lst[idx][0] === "string" && (typeof lst[idx][1] === "number" || Array.isArray(lst[idx][1]))) {
                let hstart;
                let hend;
                if (typeof lst[idx][1] === "number") {
                    hstart = lst[idx][1];
                    hend = hstart + 1;
                } else if (Array.isArray(lst[idx][1]) && lst[idx][1].length >= 2) {
                    [hstart, hend] = lst[idx][1];
                }
                const txt = String(lst[idx][0] || "");
                setSelectedStimulus(
                    `${txt.slice(
                        0,
                        hstart
                    )}<span style="background: #ffe066; color: #222; padding: 0 2px;">${txt.slice(
                        hstart,
                        hend
                    )}</span>${txt.slice(hend)}`
                );
            } else if (selectedSubmodule === "Segment") {
                setSelectedStimulus("[" + selectedVowel + "]");
            } else {
                console.error(
                    "Error: Invalid stimulus format: highlighted segment indexes unrecognized",
                    lst[idx]
                );
            }


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
    }, [currStimList, stimIndex, selectedVowel]);

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

        let lastPos = -1;
        let cachedLPC = null;
        let animationId = null;

        const updateLPC = () => {
            const sr = audioBuffer.sampleRate;
            const pos = Math.floor(audioEl.currentTime * sr);

            // Skip if we're at the same sample position (avoid redundant calculations)
            if (pos === lastPos && cachedLPC) {
                setUserAudioLPC(cachedLPC);
                return;
            }
            lastPos = pos;

            const windowSize = 2048;
            let samples;
            if (pos + windowSize < audioBuffer.length) {
                samples = audioBuffer
                    .getChannelData(0)
                    .slice(pos, pos + windowSize);
            } else {
                samples = audioBuffer
                    .getChannelData(0)
                    .slice(audioBuffer.length - windowSize);
            }
            const { a, err } = lpc(samples, lpcOrder);
            if (a) {
                cachedLPC = a;
                setUserAudioLPC(a);
            } else {
                console.log("Playback error, LPC: ", err);
            }
        };

        const animate = () => {
            if (!audioEl.paused && !audioEl.ended) {
                updateLPC();
                animationId = requestAnimationFrame(animate);
            }
        };

        const handlePlay = () => {
            animationId = requestAnimationFrame(animate);
        };

        const handlePause = () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        };

        const handleEnded = () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
        };

        // Use timeupdate for scrubbing (when user manually changes position)
        audioEl.addEventListener("timeupdate", updateLPC);
        // Use RAF for smooth playback updates
        audioEl.addEventListener("play", handlePlay);
        audioEl.addEventListener("pause", handlePause);
        audioEl.addEventListener("ended", handleEnded);

        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            audioEl.removeEventListener("timeupdate", updateLPC);
            audioEl.removeEventListener("play", handlePlay);
            audioEl.removeEventListener("pause", handlePause);
            audioEl.removeEventListener("ended", handleEnded);
        };
    }, [audioBuffer, lpcOrder]);

    /**
     * Update graph when LPC data changes
     */
    useEffect(() => {
        if (ctxRef.current && canvasRef.current) {
            // Use stimulus sample rate if available, fallback to default
            let sampleRate = audioBuffer?.sampleRate;
            if (!sampleRate && (nativeAudioLPC || foreignAudioLPC)) {
                sampleRate = 44100; // Default sample rate for stimulus files
            }

            drawSpectralEnvelope({
                lpcCoefficients: userAudioLPC,
                lpcCoefficients2: nativeAudioLPC,
                lpcCoefficients3: foreignAudioLPC,
                sampleRate: sampleRate,
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

    // Callback to handle LPC updates from StimulusPlayer
    const handleNativeLpcUpdate = useCallback((lpcCoeffs) => {
        setNativeAudioLPC(lpcCoeffs);
    }, []);

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
    const submodulesList = moduleType === "Vowel"
        ? [
            "Segment",
            "Syllable",
            "Word",
            "Phrase",
            "Sentence",
        ]
        : [
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
                        <span style={{ color: "#000" }}>
                            No stimulus available
                        </span>
                    )}
                    <div style={{ margin: "1rem 0" }}>
                        {selectedSubmodule !== "Segment" && (
                            <>
                                <Button
                                    style={{ ...styles.buttons, fontWeight: "bold" }}
                                    onClick={() => {
                                        setStimIndex(stimIndex + 1);
                                    }} // Increment stimIndex to get next stimulus
                                >
                                    Next
                                </Button>
                            </>
                        )}
                    </div>

                    {moduleType === "Vowel" && (
                        <>
                            <StimulusPlayer
                                selectedStimulus={selectedStimulus}
                                speaker="l1"
                                lpcOrder={lpcOrder}
                                onLpcUpdate={handleNativeLpcUpdate}
                                currSpeed={currSpeed}
                            />
                        </>
                    )}
                    {moduleType === "Stress" && (
                        <StimulusPlayer
                            selectedStimulus={selectedStimulus}
                            speaker="l1"
                            lpcOrder={lpcOrder}
                            onLpcUpdate={setForeignAudioLPC}
                            currSpeed={currSpeed}
                        />
                    )}
                    {moduleType === "Stress" && (
                        <StimulusPlayer
                            selectedStimulus={selectedStimulus}
                            speaker="l2"
                            lpcOrder={lpcOrder}
                            onLpcUpdate={setForeignAudioLPC}
                            currSpeed={currSpeed}
                        />
                    )}


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
                            <PlaybackSpeed
                                currSpeed={currSpeed}
                                onChange={(e) =>
                                    adjustPlaybackSpeed(
                                        parseFloat(e.target.value)
                                    )
                                }
                                speeds={speeds}
                            />
                            <div
                                style={{
                                    fontSize: "0.9rem",
                                    color: "#000",
                                    marginTop: "0.5rem",
                                }}
                            >
                                Playback your recording above.
                            </div>
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
