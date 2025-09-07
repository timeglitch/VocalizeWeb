/**
 * Applies a Hamming window to the buffer.
 * @param {Float32Array} buffer The input signal.
 * @returns {Float32Array} The windowed signal.
 */
export function applyWindow(buffer) {
    const N = buffer.length;
    const windowed = new Float32Array(N);
    for (let i = 0; i < N; i++) {
        windowed[i] = buffer[i] * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (N - 1))); // Hamming window coefficients
    }
    return windowed;
}

/**
 * Calculates the LPC coefficients for a given signal.
 * @param {Float32Array} signal The input signal.
 * @param {number} p The order of the LPC analysis.
 * @returns {{a: Float32Array | null, err: number}} The LPC coefficients and the prediction error.
 */
export function lpc(signal, p) {
    // Apply pre-emphasis filter to the signal
    const preEmphasizedSignal = preEmphasis(signal);

    const n = preEmphasizedSignal.length;
    if (p >= n) return { a: null, err: 0 };

    // Autocorrelation
    const R = new Float32Array(p + 1);
    for (let i = 0; i <= p; i++) {
        let sum = 0;
        for (let j = 0; j < n - i; j++) {
            sum += preEmphasizedSignal[j] * preEmphasizedSignal[j + i];
        }
        R[i] = sum;
    }

    console.log('Autocorrelation coefficients:', R);

    // Levinson-Durbin recursion
    let a = new Float32Array(p + 1);
    let a_prev = new Float32Array(p + 1);
    let err = R[0];

    if (Math.abs(err) < 1e-9) { // If signal is silent, return zero coefficients
        console.warn('Signal is silent, returning zero coefficients.');
        return { a: new Float32Array(p + 1), err: 0 };
    }

    a[0] = 1.0;

    for (let i = 1; i <= p; i++) {
        let k = -R[i];
        for (let j = 1; j < i; j++) {
            k -= a_prev[j] * R[i - j];
        }
        k /= err;

        a[i] = k;
        for (let j = 1; j < i; j++) {
            a[j] = a_prev[j] + k * a_prev[i - j];
        }

        err *= (1 - k * k);

        console.log(`Iteration ${i}: Reflection coefficient k = ${k}, Error = ${err}`);

        // Save current 'a' for next iteration
        for (let j = 1; j <= i; j++) a_prev[j] = a[j];
    }

    console.log('LPC coefficients:', a);
    return { a, err };
}

/**
 * Applies a pre-emphasis filter to the signal.
 * This boosts the high-frequency components of the signal.
 * @param {Float32Array} signal The input signal.
 * @param {number} alpha The pre-emphasis coefficient (default is 0.97).
 * @returns {Float32Array} The filtered signal.
 */
export function preEmphasis(signal, alpha = 0.97) {
    const emphasizedSignal = new Float32Array(signal.length);
    emphasizedSignal[0] = signal[0]; // First sample remains the same
    for (let i = 1; i < signal.length; i++) {
        emphasizedSignal[i] = signal[i] - alpha * signal[i - 1];
    }
    return emphasizedSignal;
}

/**
 * Draws the spectral envelope on the canvas, scaled to 0-5000Hz.
 * Also adds frequency labels to the X-axis.
 * @param {Object} params The parameters for drawing.
 * @param {Float32Array} params.lpcCoefficients The LPC coefficients.
 * @param {number} params.sampleRate The sample rate of the audio.
 * @param {Object} params.canvasContext The canvas context to draw on.
 * @param {Object} params.vowelStimuli The vowel stimuli data.
 * @param {string} params.selectedVowel The selected vowel.
 */
export function drawSpectralEnvelope({ lpcCoefficients, sampleRate, canvasContext, vowelStimuli, selectedVowel, onlyDrawAxes = false }) {
    const ctx = canvasContext;
    const canvas = ctx.canvas;
    const sr = sampleRate;

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const maxFreq = 5000;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#374151';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px Inter';

    // Draw X-axis labels and grid lines
    const numGridLines = 5;
    for (let i = 0; i <= numGridLines; i++) {
        const freq = (maxFreq / numGridLines) * i;
        const x = (freq / maxFreq) * canvas.width;
        if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height - 20);
            ctx.stroke();
        }
        const label = `${freq / 1000}k`;
        ctx.fillText(label, x - (i === 0 ? 0 : 10), canvas.height - 5);
    }
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 20);
    ctx.lineTo(canvas.width, canvas.height - 20);
    ctx.stroke();

    if (!onlyDrawAxes) { // If only drawing axes, skip LPC curve

        // Calculate and Draw LPC Curve in dB
        ctx.strokeStyle = '#4299e1';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const numPoints = canvas.width;
        const freqResponse = new Float32Array(numPoints);
        let maxDb = 60; //usually around 40 - 60, but having this as a minimum helps with visualization
        let minDb = 15; //its usually around 5 - 15, but having this as a maximum for the bottom of the graph helps with visualization

        for (let i = 0; i < numPoints; i++) {
            const freq = (i / numPoints) * maxFreq;
            const w = 2 * Math.PI * freq / sr;
            let re = 1.0, im = 0.0;
            for (let k = 1; k < lpcCoefficients.length; k++) {
                re += lpcCoefficients[k] * Math.cos(k * w);
                im += lpcCoefficients[k] * Math.sin(k * w);
            }
            const mag = 1.0 / Math.sqrt(re * re + im * im);
            const db = 20 * Math.log10(mag + 1e-12);
            freqResponse[i] = db;
            if (db > maxDb) maxDb = db;
            if (db < minDb) minDb = db;
        }

        for (let i = 0; i < numPoints; i++) {
            const x = i;
            const y = ((maxDb - freqResponse[i]) / (maxDb - minDb)) * (canvas.height - 25) + 5;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        //console.log("Min dB:", minDb, "Max dB:", maxDb);
        ctx.stroke();
    }

    if (!vowelStimuli || !vowelStimuli["Vowel"][selectedVowel]) {
        console.error('Selected vowel data not found:', selectedVowel);
        return;
    }
    const f1_range = vowelStimuli["Vowel"][selectedVowel]["formant"]["f1"];
    const f2_range = vowelStimuli["Vowel"][selectedVowel]["formant"]["f2"];
    const f1_start = (f1_range[0] / maxFreq) * canvas.width;
    const f1_end = (f1_range[1] / maxFreq) * canvas.width;
    const f2_start = (f2_range[0] / maxFreq) * canvas.width;
    const f2_end = (f2_range[1] / maxFreq) * canvas.width;
    ctx.fillStyle = 'rgba(245, 101, 101, 0.2)';
    ctx.strokeStyle = '#f56565';
    ctx.fillRect(f1_start, 0, f1_end - f1_start, canvas.height - 20);
    ctx.strokeRect(f1_start, 0, f1_end - f1_start, canvas.height - 20);
    ctx.fillRect(f2_start, 0, f2_end - f2_start, canvas.height - 20);
    ctx.strokeRect(f2_start, 0, f2_end - f2_start, canvas.height - 20);
}
