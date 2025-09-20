export default function PlaybackSpeed({ currSpeed, onChange, speeds }) {
    return (
        <div className="toggle-speed" style={{ color: '#13120F' }}>
            <label htmlFor="speedSelect">Playback Speed:</label>
            <select
                id="speedSelect"
                value={currSpeed}
                onChange={onChange}
                style={{ marginLeft: '0.5rem' }}
            >
                {speeds.map(s => (
                    <option key={s} value={s}>{s}x</option>
                ))}
            </select>
        </div>
    );
}