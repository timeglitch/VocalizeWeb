import React, { useEffect, useRef, useState } from 'react';
import { loadWavFile } from '../audioUtils';
import { lpc } from '../speechProcessingUtils';
import StimulusBar from './StimulusBar';

export default function StimulusPlayer({
    selectedStimulus,
    speaker,
    lpcOrder,
    onLpcUpdate,
    currSpeed
}) {
    const [wavBuffer, setWavBuffer] = useState(null);
    const wavAudioRef = useRef(null);

    // Load the wav file when stimulus changes
    useEffect(() => {
        let isMounted = true;
        const loadWav = async () => {
            if (!selectedStimulus) return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                // remove highlighting tags to get the full stimulus file name
                let stimTrim = selectedStimulus
                    .replace(
                        /<span style="background: #ffe066; color: #222; padding: 0 2px;">/g,
                        ""
                    )
                    .replace("</span>", ""); //TODO: this is cursed
                const folder = speaker;
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
    }, [selectedStimulus, speaker]);

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
                if (a && onLpcUpdate) {
                    onLpcUpdate(a);
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
    }, [wavBuffer, lpcOrder, onLpcUpdate]);

    // Update playback speed
    useEffect(() => {
        if (wavAudioRef.current) {
            wavAudioRef.current.playbackRate = currSpeed;
        }
    }, [currSpeed]);

    return (
        <StimulusBar
            src={wavAudioRef.current?.src}
            audioElementRef={wavAudioRef}
            message={"Click play to hear " + (speaker === 'l1' ? "L1 Spanish" : "L1 English") + " audio"}
        />
    );
}
