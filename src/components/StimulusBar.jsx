import React from 'react'
import styles from '../styles'

const StimulusBar = ({ src, audioElementRef, message }) => {
  return (
    <>
    {message || "Click play to hear the stimulus."}
    <audio controls ref={audioElementRef} style={styles.audioPlayer}>
        <source src={src} type="audio/mpeg" />
        Your browser does not support the audio element.
    </audio>
    </>
  )
}

export default StimulusBar
