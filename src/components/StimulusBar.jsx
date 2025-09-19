import React from 'react'
import styles from '../styles'

const StimulusBar = ({ src, audioElementRef }) => {
  return (
    <>
    <audio controls ref={audioElementRef} style={styles.audioPlayer}>
        <source src={src} type="audio/mpeg" style={{ width: '100%' }} />
        Your browser does not support the audio element.
    </audio>
    </>
  )
}

export default StimulusBar
