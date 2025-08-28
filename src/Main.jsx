import React, { useEffect, useState, useRef, useCallback } from 'react';
import { loadWavFile } from './audioUtils';
import { Container, Button, Nav, Navbar, Offcanvas, NavItem } from 'react-bootstrap';
import { ReactComponent as Logo } from "./logo.svg";
import { StyleSheet } from 'react-native';
import { applyWindow, lpc, drawSpectralEnvelope } from './lpcUtils';

// Add this helper to parse query params
function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// Returns a random integer between 0 and n-1
function randint(n) {
    return Math.floor(Math.random() * n);
}

export default function Main() {

    // Toggle to adjust playback speed
    const speeds = [1, 0.75, 0.5];
    const [currSpeed, setCurrSpeed] = useState(1); // default speed
    const adjustPlaybackSpeed = newRate => {
        if (audioElementRef.current) {
            audioElementRef.current.playbackRate = newRate;
        }
        setCurrSpeed(newRate);
    };

    //TODO: Make firefox compatible
    useEffect(() => {
        const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
        if (isFirefox) {
            alert('This application may not work properly in Firefox. Please use Chrome or Edge for best compatibility. \n The live visualization works, but the recording and playback features may not function as expected.');
        }
    }, []);

    const [lpcOrder, setLpc] = useState(20)
    // NOTE: average female LPC is 9-11, average male LPC is 11-13. Notify users of this.
    // For this use case, 20 looks better, don't know why
    const [rec, setRec] = useState(false)
    const audioCtx = useRef(null)
    const analyzer = useRef(null)
    const mic = useRef(null)
    const node = useRef(null)
    const canvasRef = useRef(null)
    const ctxRef = useRef(null)
    const streamRef = useRef(null)
    const chunksRef = useRef([]);

    // state variables for recording and playback
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const audioElementRef = useRef(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [wavBuffer, setWavBuffer] = useState(null);
    const wavAudioRef = useRef(null);

    const vowelstimuli = require('./VowelStimuli.json');

    // set canvas dimensions
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctxRef.current = ctx;
        const resizeCanvas = () => {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 384;
            canvas.style.width = '100%';
            canvas.style.height = '384px';
            canvas.style.borderRadius = '0.5rem'; // rounded-lg
            canvas.style.overflow = 'hidden';
            canvas.style.marginBottom = '1.5rem'; // mb-6
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () =>
            window.removeEventListener('resize', resizeCanvas); // cleanup on unmoun
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
        setRec(r => !r);
        setIsActive(is => !is);
    };

    // start audio capture and recording
    const startCapture = async () => {
        try {
            // Initialize AudioContext
            audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();

            // Get audio stream from microphone
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
            let mimeType = '';

            if (MediaRecorder.isTypeSupported('audio/wav')) {
                mimeType = 'audio/wav';
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                mimeType = 'audio/ogg';
            } else {
                mimeType = 'audio/webm';
            }

            const recorder = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];
            setMediaRecorder(recorder);
            recorder.ondataavailable = e => {
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
            console.log('Error accessing microphone: ' + err.message);
        }
    };

    // stop audio capture and recording
    const stopCapture = async () => {
        if (mic.current) {
            mic.current.disconnect();
            analyzer.current.disconnect();
            node.current.disconnect();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
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
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                console.log("MediaRecorder state:", mediaRecorder.state);
                mediaRecorder.stop();
            }
            setMediaRecorder(null);
            console.log('Audio capture stopped.');
        }

    }

    // main audio processing function
    const processAudio = (e) => {
        const buffer = new Float32Array(analyzer.current.fftSize);
        analyzer.current.getFloatTimeDomainData(buffer);

        // apply the Hamming window
        const windowedBuffer = applyWindow(buffer);

        // LPC analysis
        const { a, err } = lpc(windowedBuffer, lpcOrder);
        if (a) {
            drawSpectralEnvelope({
                lpcCoefficients: a,
                sampleRate: audioCtx.current ? audioCtx.current.sampleRate : 44100,
                canvasContext: ctxRef.current,
                vowelStimuli: vowelstimuli,
                selectedVowel
            });
        } else {
            console.log('No!!!! LPC failed: ', err);
        }

    }

    //const duration = 100;
    const [timeElapsed, setTimeElapsed] = useState(0); // changed from timeLeft
    const [prog, setProg] = useState(5);
    const [isActive, setIsActive] = useState(false);

    // Timer counts up
    useEffect(() => {
        if (!isActive) return;
        const tim = setInterval(() => {
            if (isActive) {
                setTimeElapsed(prev => prev + 1);
                setProg(prog - 1);
            }
        }, 1000);
        return () => clearInterval(tim)
    }, [isActive, timeElapsed, prog]);

    // TODO: create hamburger menu for navigation s.t. when the user clicks on it, it opens a side menu with the different vowels
    // and when they press a specific vowel, it changes the canvas to show the spectral envelope for that vowel
    // Vowel selector state
    const [selectedVowel, setSelectedVowel] = useState('a'); //when selectedVowel changes, the canvas should update to show the spectral envelope for that vowel, and the stimulus should change to a random one from the list of stimuli for that vowel
    const vowels = [
        { label: '[a]', value: 'a' },
        { label: '[e]', value: 'e' },
        { label: '[i]', value: 'i' },
        { label: '[o]', value: 'o' },
        { label: '[u]', value: 'u' },
    ];
    // Add state for submodule
    const [selectedSubmodule, setSelectedSubmodule] = useState(getQueryParam('submodule') || 'Segment');
    // Add state for stimulus
    const [selectedStimulus, setSelectedStimulus] = useState(null);

    //update stimulus and graph when vowel changes
    useEffect(() => {
        //console.log("Submodule changed to:", selectedSubmodule);
        let selectedStimulusIndex = randint(vowelstimuli["Vowel"][selectedVowel][selectedSubmodule].length)
        let stim = vowelstimuli["Vowel"][selectedVowel][selectedSubmodule][selectedStimulusIndex];
        if (!stim) {
            setSelectedStimulus("No stimulus available");
        }
        else if (typeof stim === 'string') {
            setSelectedStimulus(stim);
        } else if (typeof stim === 'object' && Array.isArray(stim)) {
            let hstart;
            let hend;
            if (typeof (stim[1]) === 'number') {
                hstart = stim[1];
                hend = hstart + 1;
            }
            else if (typeof (stim[1]) === 'object' && Array.isArray(stim[1])) {
                hstart = stim[1][0];
                hend = stim[1][1];
            } else {
                console.error("Error: Invalid stimulus format: highlighted segment indexes unrecognized", stim);
            }

            setSelectedStimulus(
                `${stim[0].slice(0, hstart)}<span style="background: #ffe066; color: #222; padding: 0 2px;">${stim[0].slice(hstart, hend)}</span>${stim[0].slice(hend)}`
            ); //TODO: injecting the highlighting in this way is probably not the best way, but it works for now
        }
        else {
            setSelectedStimulus("Error: Invalid stimulus format" + JSON.stringify(stim));
        }

        // Update the canvas by restarting the audio capture if running
        if (audioCtx.current) {
            stopCapture();
            startCapture();
        }
    }, [selectedVowel]);

    // Update submodule if URL changes
    useEffect(() => {
        const handlePopState = () => {
            setSelectedSubmodule(getQueryParam('submodule') || 'Segment');
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Decode audio when audioURL changes
    useEffect(() => {
        if (!audioURL) return;
        const context = new (window.AudioContext || window.webkitAudioContext)();
        fetch(audioURL)
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => {
                context.decodeAudioData(arrayBuffer, buffer => {
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
        const updateLPC = () => {
            if (!audioEl.paused && !audioEl.ended) {
                const sr = context.sampleRate;
                const pos = Math.floor(audioEl.currentTime * sr);
                const windowSize = 2048;
                let samples = new Float32Array(windowSize);
                if (pos + windowSize < context.length) {
                    samples = context.getChannelData(0).slice(pos, pos + windowSize);
                } else {
                    samples = context.getChannelData(0).slice(context.length - windowSize);
                }
                const windowed = applyWindow(samples);
                const { a } = lpc(windowed, lpcOrder);
                if (a && ctxRef.current && canvasRef.current) {
                    drawSpectralEnvelope({
                        lpcCoefficients: a,
                        sampleRate: sr,
                        canvasContext: ctxRef.current,
                        vowelStimuli: vowelstimuli,
                        selectedVowel
                    });
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
        audioEl.addEventListener('play', startRaf);
        audioEl.addEventListener('pause', stopRaf);
        audioEl.addEventListener('ended', stopRaf);
        return () => {
            stopRaf();
            audioEl.removeEventListener('play', startRaf);
            audioEl.removeEventListener('pause', stopRaf);
            audioEl.removeEventListener('ended', stopRaf);
        };
    }, [audioBuffer, lpcOrder]);


    // Functions for loading and playing the correct stimulus audio

    // Load the wav file on mount
    //TODO: load the wav file on stimulus change
    useEffect(() => {
        let isMounted = true;
        const loadWav = async () => {
            try {
                const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
                const buffer = await loadWavFile(process.env.PUBLIC_URL + '/audio/palabra.wav', ctx);
                if (isMounted) setWavBuffer(buffer);
            } catch (e) {
                console.error('Failed to load wav:', e);
            }
        };
        loadWav();
        return () => { isMounted = false; };
    }, []);

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
                    samples = wavBuffer.getChannelData(0).slice(pos, pos + windowSize);
                } else {
                    samples = wavBuffer.getChannelData(0).slice(wavBuffer.length - windowSize);
                }
                const windowed = applyWindow(samples);
                const { a } = lpc(windowed, lpcOrder);
                if (a && ctxRef.current && canvasRef.current) {
                    drawSpectralEnvelope({
                        lpcCoefficients: a,
                        sampleRate: sr,
                        canvasContext: ctxRef.current,
                        vowelStimuli: vowelstimuli,
                        selectedVowel
                    });
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
        audioEl.addEventListener('play', startRaf);
        audioEl.addEventListener('pause', stopRaf);
        audioEl.addEventListener('ended', stopRaf);
        return () => {
            stopRaf();
            audioEl.removeEventListener('play', startRaf);
            audioEl.removeEventListener('pause', stopRaf);
            audioEl.removeEventListener('ended', stopRaf);
        };
    }, [wavBuffer, lpcOrder, selectedVowel]);
    // Remove old handleWavPlay usage from <audio>

    // Offcanvas (hamburger menu) state
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    return (
        <div className="main-container" style={{ backgroundColor: '#05668d', width: '100vw', height: '100vh' }}>
            <Container className="main">
                <Navbar bg="#05668d" variant="dark" style={{ marginBottom: '1rem', borderRadius: '0.5rem' }}>
                    <Navbar.Brand
                        style={{
                            fontWeight: 'bold', fontSize: '1rem', color: '#f0ead2', cursor: 'pointer', padding: '0.5rem', boxShadow: '0 4px 15px rgb(0, 57, 51)'
                        }}
                        onClick={handleShow}
                    >
                        <Logo
                            alt=""
                            width="1.5rem"
                            height="1.5rem"
                            className="d-inline-block align-top"
                            style={{
                                marginRight: '10px',
                                backgroundColor: '#f0ead2',
                                borderRadius: '5px',
                                padding: '2px',
                            }}
                        />
                        <NavItem style={{ display: 'inline', color: '#f0ead2', fontSize: '1rem' }}>Submodules</NavItem>
                    </Navbar.Brand>
                    <Navbar.Toggle onClick={handleShow} aria-controls="offcanvasNavbar" />
                </Navbar>

                <Offcanvas show={show} onHide={handleClose} placement="start" style={styles.offcanva}>
                    <Offcanvas.Header closeButton>
                        <Offcanvas.Title>Menu</Offcanvas.Title>
                    </Offcanvas.Header>
                    <Offcanvas.Body>
                        <Nav className="flex-column">
                            <Nav.Link href="../Main?submodule=Segment" onClick={handleClose} style={styles.ofLinks}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.hover.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.hover.backgroundColor;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.backgroundColor;
                                }}
                            >
                                Segment
                            </Nav.Link>
                            <Nav.Link href="../Main?submodule=Syllable" onClick={handleClose} style={styles.ofLinks}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.hover.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.hover.backgroundColor;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.backgroundColor;
                                }}>
                                Syllable
                            </Nav.Link>
                            <Nav.Link href="../Main?submodule=Word" onClick={handleClose} style={styles.ofLinks}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.hover.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.hover.backgroundColor;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.backgroundColor;
                                }}>
                                Word
                            </Nav.Link>
                            <Nav.Link href="../Main?submodule=Phrase" onClick={handleClose} style={styles.ofLinks}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.hover.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.hover.backgroundColor;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.backgroundColor;
                                }}>
                                Phrase
                            </Nav.Link>
                            <Nav.Link href="../Main?submodule=Sentence" onClick={handleClose} style={styles.ofLinks}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.hover.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.hover.backgroundColor;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.backgroundColor;
                                }}>
                                Sentence
                            </Nav.Link>
                            <Nav.Link href="../Modules" onClick={handleClose} style={{ ...styles.ofLinks, fontWeight: 'bold' }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.hover.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.hover.backgroundColor;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.color = styles.ofLinks.color;
                                    e.currentTarget.style.backgroundColor = styles.ofLinks.backgroundColor;
                                }}>
                                Back to Modules
                            </Nav.Link>
                        </Nav>
                    </Offcanvas.Body>
                </Offcanvas>






                <h1 className="header" style={styles.header}>Practice</h1>
                {/* Show selected submodule */}
                <div style={styles.submodule}>
                    Submodule: {selectedSubmodule}
                </div>
                {/* Stimulus display section */}
                <div className="stimulus-section" style={styles.submodule}>
                    {/* Audio controls for wav file */}
                    <div style={{ marginBottom: '1rem' }}>
                        <audio
                            ref={wavAudioRef}
                            src={process.env.PUBLIC_URL + '/audio/palabra.wav'}
                            controls
                        />
                        <div style={{ color: '#f0ead2', fontSize: '0.9rem' }}>Stimulus: palabra.wav</div>
                    </div>
                    Say:&nbsp;
                    {selectedStimulus ? (
                        <span dangerouslySetInnerHTML={{ __html: selectedStimulus }} />
                    ) : (
                        <span style={{ color: '#9ca3af' }}>No stimulus available</span>
                    )}

                    <div className="vowel-selector" style={{ marginTop: '0.5rem' }}>
                        <select
                            id="vowelSelect"
                            value={selectedVowel}
                            style={styles.vowelSelect}
                            onChange={e => setSelectedVowel(e.target.value)}
                        >
                            {vowels.map(v => (
                                <option key={v.value} value={v.value}>{v.label}</option>
                            ))}
                        </select>
                    </div>

                </div>
                {/* --- Playback UI & LPC analysis button --- */}
                {audioURL && (
                    <div style={styles.audioPlayer}>
                        <audio controls src={audioURL} ref={audioElementRef} />
                        <div style={{ fontSize: '0.9rem', color: '#f0ead2', marginTop: '0.5rem' }}>
                            Playback your recording above.
                        </div>
                        <div className="toggle-speed" style={{ color: '#f0ead2' }}>
                            <label htmlFor="speedSelect">Playback Speed:</label>
                            <select
                                id="speedSelect"
                                value={currSpeed}
                                onChange={e => adjustPlaybackSpeed(parseFloat(e.target.value))}
                            >
                                {speeds.map(s => (
                                    <option key={s} value={s}>{s}x</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
                <div className="canvas-container" style={styles.canvasContainer}>
                    <canvas ref={canvasRef} className="canvas" />
                </div>
                <div className="controls">
                    <Button variant="primary" onClick={startButton} style={styles.buttons}>
                        {rec ? 'Stop' : 'Start'} Capture Audio
                    </Button>
                </div>
                <div className="lpc-order" stlyes={styles.canvasContainer}>
                    <label htmlFor="lpcOrder">LPC Order:</label>
                    <input
                        type="number"
                        id="lpcOrder"
                        value={lpcOrder}
                        onChange={(e) => setLpc(e.target.value)}
                        min="1"
                        max="30"
                    />
                </div>

            </Container>
        </div>
    )
}

const styles = StyleSheet.create({
    main: {
        color: '#05668d',
    },
    header: {
        textAlign: 'center',
        marginBottom: '1rem',
        backgroundColor: '#05668d',
        color: '#f0ead2',
        fontSize: '2rem',
        fontWeight: 'bold',
    },
    submodule: {
        textAlign: 'center',
        marginBottom: '1rem',
        backgroundColor: '#05668d',
        color: '#f0ead2',
        fontSize: '1.25rem',
        fontWeight: 'bold',
        boxShadow: '0 4px 15px rgb(0, 57, 51)',

        padding: '1rem',
    },
    vowelContainer: {
        padding: '0.25rem',
        borderRadius: '0.25rem',
        backgroundColor: '#05668d',
        color: '#f0ead2',
        fontSize: '1.5rem',
    },
    vowelSelect: {
        marginLeft: '0.5rem',
        padding: '0.25rem',
        borderRadius: '0.25rem',
        border: '1px solid #6c584c',
        backgroundColor: '#f0ead2',
        color: '#05668d',
        fontSize: '1.5rem',
    },
    buttons: {
        backgroundColor: '#f0ead2',
        color: '#05668d',
        hover: '#f0ead2',
    },
    canvasContainer: {
        fontSize: '1rem',
        color: '#05668d',
        fontWeight: 'bold',
        padding: '1rem',
        textAlign: 'center',

    },
    audioPlayer: {
        padding: '0.25rem',
        borderRadius: '0.25rem',
        backgroundColor: '#05668d',
        color: '#f0ead2',
        fontSize: '1rem'
    },
    offcanva: {
        backgroundColor: '#028090',
        color: '#f0ead2'
    },
    ofLinks: {
        color: '#f0ead2',
        backgroundColor: '#028090',
        fontSize: '1rem',
        marginBottom: '0.5rem',
        // hover effect
        hover: {
            color: '#05668d', backgroundColor: '#f0ead2'

        }
    }

});

