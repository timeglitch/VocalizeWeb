const DEFAULT_MAX_FREQ = 5000; // Hz

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
export function lpc(signal, p, opts = {window: "hamming"}) {
    const n = signal.length;
    if (p >= n) return { a: null, err: 0 };

    // Apply windowing if specified
    if (opts.window === "hamming") {
        signal = applyWindow(signal);
    }
    else {
        console.log("No windowing applied");
    }

    // pre-emphasis filtering for stability pre-autocorrelation
    const preEmph = 0.98;
    const preSignal = new Float32Array(n); // copies pre-emphed signal while maintaining original
    preSignal[0] = signal[0]; // first sample unchanged
    for (let i = 1; i < n; i++) {
        preSignal[i] = signal[i] - preEmph * signal[i - 1];
    }
    signal = preSignal; // use pre-emphasized signal for LPC calculation


    // Autocorrelation
    const R = new Float32Array(p + 1);
    for (let i = 0; i <= p; i++) {
        let sum = 0;
        for (let j = 0; j < n - i; j++) {
            sum += signal[j] * signal[j + i];
        }
        R[i] = sum;
    }

    // Levinson-Durbin recursion
    let a = new Float32Array(p + 1);
    let a_prev = new Float32Array(p + 1);
    let err = R[0];

    if (Math.abs(err) < 1e-6) { // If signal is silent, return zero coefficients
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

        // Save current 'a' for next iteration
        for (let j = 1; j <= i; j++) a_prev[j] = a[j];
    }
    return { a, err };
}
/**
 * Simple high-pass filter for removing low frequencies.
 * @param {Float32Array} x input signal
 * @param {number} sampleRate sample rate (HZ)
 * @param {number} cutoffHz cutoff frequency (default should be 80)
 * @returns {Float32Array} filtered signal
 */
export function highPassOnePole(input, sampleRate, cutoffHz = 80) {
    if (input.length === 0) {
        return new Float32Array(0); // shooting myself in the foot otherwise
    }
    // NOTE for the curious: we found these formulas by researching high pass filters online
    const dt = 1 / sampleRate; // dt = change in time
    const rc = 1 / (2 * Math.PI * cutoffHz); // rc = resistance capacitance, which is a time constant
    const a = rc / (rc + dt); // filter coeff
    const y = new Float32Array(input.length); // output
    y[0] = input[0];
    // now we filter...
    for (let i = 1; i < input.length; i++) {
        y[i] = a * (y[i - 1] + input[i] - input[i - 1]);
    }
    return y;
}

/**
 * Simple moving-average smoothing across an array (local frequency smoothing).
 * @param {Float32Array} arr input array
 * @param {number} windowSize odd window size (default 5)
 * @returns {Float32Array} smoothed output
 */
function smoothArray(arr, windowSize = 5) {
    const output = new Float32Array(arr.length);
    const half = Math.floor(windowSize / 2);
    for (let i = 0; i < arr.length; i++) {
        let sum = 0;
        let count = 0;
        for (let j = i - half; j <= i + half; j++) {
            if (j >= 0 && j < arr.length) {
                sum += arr[j];
                count++;
            }
        }
        output[i] = count ? sum / count : 0;
    }
    return output;
}

/**
 * Exponential moving average for frame to frame smoothing of frequencies.
 * In other words, reduces jitter.
 * TODO: do we even need this filter?
 * @param {Float32Array|null} prev previous frame (null if this is the first frame)
 * @param {Float32Array} curr current frame
 * @param {number} alpha smoothing factor (0-1)
 * @returns {Float32Array} smoothed frame
 */
function emaSmooth(prev, curr, alpha = 0.8) {
    if (!prev) {
        return curr.slice ? curr.slice() : new Float32Array(curr);
    }
    const output = new Float32Array(curr.length);
    for (let i = 0; i < curr.length; i++) {
        output[i] = alpha * curr[i] + (1 - alpha) * prev[i];
    }
    return output;
}

/**
 * Reel those poles in when there are sharp resonances (like sibilants or harsh sounds).
 * @param {Float32Array} a LPC coefficients
 * @param {number} bwHz bandwidth expansion (HZ)
 * @param {number} sampleRate sample rate (HZ)
 * @returns {Float32Array}  modified coefficients
 */
export function bandwidthExpand(a, bwHz = 60, sampleRate = 44100) {
    const gamma = Math.exp(-Math.PI * bwHz / sampleRate); // expansion factor
    const output = new Float32Array(a.length);
    output[0] = a[0];
    // filtering applied to all but first coeff so that gain is unchanged
    for (let k = 1; k < a.length; k++) output[k] = a[k] * Math.pow(gamma, k);
    return output;
}
let prevFreqResponse1 = null;
let prevFreqResponse2 = null;
let prevFreqResponse3 = null;
/**
 * Draws the LPC curve on the given canvas context.
 * @param {canvasContext} ctx 
 * @param {Float32Array} coeffs 
 * @param {string} color 
 * @param {Float32Array|null} prevFreqResponse 
 * @returns {Float32Array} the final frequency response, used for smoothing next frame
 */
function drawLPCCurve(ctx, coeffs, color, sampleRate, prevFreqResponse, opts = {}) {
    if (!coeffs || coeffs.length < 2) {
        // nothing to draw
        console.warn("No LPC coefficients to draw");
        return;
    }

    const freqSmoothWindow = opts.freqSmoothWindow || 7; // odd number
    const temporalAlpha = typeof opts.temporalAlpha === 'number' ? opts.temporalAlpha : 0.55;
    const applyBandwidthExpand = opts.applyBandwidthExpand || false;
    const bwHz = opts.bwHz || 60;
    const maxFreq = opts.maxFreq || DEFAULT_MAX_FREQ;


        // Calculate and Draw LPC Curve in dB
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const canvas = ctx.canvas;

    const numPoints = Math.max(2, Math.floor(canvas.width));
    const freqResponse = new Float32Array(numPoints);
    let maxDb = -Infinity, minDb = Infinity;

    // Optionally expand bandwidth to stabilize poles (non-destructive)
    if (!coeffs || coeffs.length < 2) {
        // nothing to draw
        return;
    }
    if (applyBandwidthExpand) {
        coeffs = bandwidthExpand(coeffs, bwHz, sampleRate);
    }

    // compute frequency response in decibels
    for (let i = 0; i < numPoints; i++) {
        const freq = (i / numPoints) * maxFreq;
        const w = 2 * Math.PI * freq / sampleRate;
        let re = 1.0, im = 0.0;
        for (let k = 1; k < coeffs.length; k++) {
            const ck = coeffs[k];
            re += ck * Math.cos(k * w);
            im += ck * Math.sin(k * w);
        }
        const denom = Math.sqrt(re * re + im * im) + 1e-12;
        const mag = 1.0 / denom;
        const db = 20 * Math.log10(mag);
        if (!Number.isFinite(db)) {
            freqResponse[i] = -200; // fallback
        } else {
            freqResponse[i] = db;
        }
        if (freqResponse[i] > maxDb) maxDb = freqResponse[i];
        if (freqResponse[i] < minDb) minDb = freqResponse[i];
    }

    // local smoothing
    const localSmoothed = smoothArray(freqResponse, freqSmoothWindow);

    // smoothing across frames
    const finalResponse = emaSmooth(prevFreqResponse, localSmoothed, temporalAlpha);
    //prevFreqResponse = finalResponse.slice(0); // store a copy (moved outside)

    // recompute min/max 
    maxDb = -Infinity; minDb = Infinity;
    for (let i = 0; i < finalResponse.length; i++) {
        const v = finalResponse[i];
        if (v > maxDb) maxDb = v;
        if (v < minDb) minDb = v;
    }
    // prevent weird ranges
    const range = (maxDb - minDb) || 1;

    for (let i = 0; i < finalResponse.length; i++) {
        const x = i;
        const y = ((maxDb - finalResponse[i]) / range) * (canvas.height - 25) + 5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    //console.log("Min dB:", minDb, "Max dB:", maxDb);
    ctx.stroke();

    return finalResponse;
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
export function drawSpectralEnvelope({ lpcCoefficients, lpcCoefficients2 = null, lpcCoefficients3 = null, sampleRate, canvasContext, vowelStimuli, selectedVowel, onlyDrawAxes = false, opts = {} }) {
    const ctx = canvasContext;
    const canvas = ctx.canvas;
    const sr = sampleRate || 44100;
    const maxFreq = opts.maxFreq || DEFAULT_MAX_FREQ;

    ctx.fillStyle = '#1a202c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    if (!onlyDrawAxes) {  // If only drawing axes, skip LPC curve

        prevFreqResponse1 = drawLPCCurve(ctx, lpcCoefficients, '#4299e1', sr, prevFreqResponse1, opts); //removed the .slice(0) on these since I don't think it is necessary
        if (lpcCoefficients2) {
            prevFreqResponse2 = drawLPCCurve(ctx, lpcCoefficients2, '#48bb78', sr, prevFreqResponse2, opts);
        }
        if (lpcCoefficients3) {
            prevFreqResponse3 = drawLPCCurve(ctx, lpcCoefficients3, '#ed64a6', sr, prevFreqResponse3, opts);
        }
    }

    if (!vowelStimuli || !vowelStimuli["Vowel"] || !vowelStimuli["Vowel"][selectedVowel]) {
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

// /**
//  * Exponential moving average for smoothing the LPC coefficients over frames.
//  * @param {Float32Array|null} prev previous LPC coefficients (null if first frame)
//  * @param {Float32Array} curr current LPC coefficients
//  * @param {number} alpha smoothing factor (0-1)
//  * @returns {Float32Array} smoothed LPC coefficients
//  */
// export function emaFrame(prev, curr, alpha = 0.2) {
//     if (!prev) {
//         return curr;
//     }
//     const newCoeffs = new Float32Array(curr.length);
//     for (let i = 0; i < curr.length; i++) {
//         newCoeffs[i] = alpha * curr[i] + (1 - alpha) * prev[i];
//     }
//     return newCoeffs;
// }