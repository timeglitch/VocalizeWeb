import React, { useEffect, useRef, useState } from "react";
import { loadWavFile } from "../audioUtils";
import { lpc } from "../speechProcessingUtils";
import StimulusBar from "./StimulusBar";

export default function StimulusPlayer({
    selectedStimulus,
    speaker,
    lpcOrder,
    onLpcUpdate,
    currSpeed,
}) {
    const [wavBuffer, setWavBuffer] = useState(null);
    const wavAudioRef = useRef(null);

    // Load the wav file when stimulus changes
    useEffect(() => {
        let isMounted = true;
        const loadWav = async () => {
            if (!selectedStimulus) return;
            try {
                const ctx = new (window.AudioContext ||
                    window.webkitAudioContext)();
                // remove highlighting tags to get the full stimulus file name
                let stimTrim = selectedStimulus
                    .replace(
                        /<span style="background: #ffe066; color: #222; padding: 0 2px;">/g,
                        ""
                    )
                    .replace("</span>", ""); // TODO: this is cursed (too bad, it works!)
                const folder = speaker;
                const url = "/audio/" + folder + "/" + stimTrim + ".wav"; // e.g.: /audio/l1/<file>.wav
                const buffer = await loadWavFile(url, ctx);
                if (isMounted) {
                    setWavBuffer(buffer);
                    if (wavAudioRef.current) {
                        wavAudioRef.current.src = url;
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

    // Update LPC based on current audio position (works for scrubbing and playback)
    useEffect(() => {
        const audioEl = wavAudioRef.current;
        if (!audioEl || !wavBuffer) return;

        let lastPos = -1;
        let cachedLPC = null;
        let animationId = null;

        const updateLPC = () => {
            const sr = wavBuffer.sampleRate;
            const pos = Math.floor(audioEl.currentTime * sr);

            // Skip if we're at the same sample position (avoid redundant calculations)
            if (pos === lastPos && cachedLPC) {
                onLpcUpdate?.(cachedLPC);
                return;
            }
            lastPos = pos;

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
                cachedLPC = a;
                onLpcUpdate(a);
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
            message={
                "Click play to hear " +
                (speaker === "l1" ? "L1 Spanish" : "L2 English") +
                " audio"
            }
        />
    );
}
