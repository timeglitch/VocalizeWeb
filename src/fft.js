//Shamelessly taken from polarity at https://github.com/polarity/app.spectrogram/blob/master/utils/fft.js


/**
 * FFT implementation for signal processing
 * @param {Float32Array} data - The input data
 * @param {Float32Array} window - The window function
 * @returns {Float32Array} - The FFT result
 */
export function computeSTFT(data, window) {
  const N = data.length
  const result = new Float32Array(N * 2)

  // Apply window and normalize
  const windowedData = new Float32Array(N)
  let maxWindowed = 0
  let sumWindowed = 0

  if (window === undefined || window.length !== N || window === null) {
    window = new Float32Array(N) // Default to rectangular window
    window.fill(1)
  }

  for (let i = 0; i < N; i++) {
    const windowed = data[i] * window[i]
    windowedData[i] = windowed
    maxWindowed = Math.max(maxWindowed, Math.abs(windowed))
    sumWindowed += Math.abs(windowed)
  }

  // Prepare FFT input
  for (let i = 0; i < N; i++) {
    result[i * 2] = windowedData[i]
    result[i * 2 + 1] = 0
  }

  return performFFT(result)
}

/**
 * Performs the FFT on the input data
 * @param {Float32Array} input - The input data
 * @returns {Float32Array} - The FFT result
 */
function performFFT(input) {
  const N = input.length / 2
  const fft = new Float32Array(input.length)
  fft.set(input)

  // Bit reversal
  let j = 0
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      // Swap complex values
      const tempReal = fft[i * 2]
      const tempImag = fft[i * 2 + 1]
      fft[i * 2] = fft[j * 2]
      fft[i * 2 + 1] = fft[j * 2 + 1]
      fft[j * 2] = tempReal
      fft[j * 2 + 1] = tempImag
    }

    let k = N >> 1
    while (k <= j) {
      j -= k
      k >>= 1
    }
    j += k
  }

  // FFT computation
  for (let step = 1; step < N; step <<= 1) {
    const halfStep = step
    const angle = -Math.PI / halfStep

    for (let group = 0; group < N; group += step * 2) {
      const cosVal = Math.cos(angle)
      const sinVal = Math.sin(angle)

      for (let pair = 0; pair < step; pair++) {
        const groupOffset = group * 2
        const pairOffset = pair * 2
        const evenIndex = groupOffset + pairOffset
        const oddIndex = evenIndex + step * 2

        const evenReal = fft[evenIndex]
        const evenImag = fft[evenIndex + 1]
        const oddReal = fft[oddIndex]
        const oddImag = fft[oddIndex + 1]

        const factor = pair / step
        const rotReal = cosVal * factor
        const rotImag = sinVal * factor

        // Complex multiplication
        const tempReal = oddReal * rotReal - oddImag * rotImag
        const tempImag = oddReal * rotImag + oddImag * rotReal

        fft[oddIndex] = evenReal - tempReal
        fft[oddIndex + 1] = evenImag - tempImag
        fft[evenIndex] = evenReal + tempReal
        fft[evenIndex + 1] = evenImag + tempImag
      }
    }
  }

  return fft
}