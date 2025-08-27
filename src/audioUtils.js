// Utility to load and decode a wav file as an AudioBuffer
export async function loadWavFile(url, audioContext) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}
