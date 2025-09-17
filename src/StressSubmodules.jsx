import SubmoduleDropdown from './SubmoduleDropdown'
import './App.css';

export default function StressSubmodules() {
  const stressItems = [
    { label: 'Segment',  path: '../Main?submodule=Segment' },
    { label: 'Word',     path: '../Main?submodule=Word' },
    { label: 'Phrase',   path: '../Main?submodule=Phrase' },
    { label: 'Sentence', path: '../Main?submodule=Sentence' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#F2F1EB',
      }}
    >
      <div
        style={{
          background: '#F2F1EB',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 15px rgb(0, 57, 51)',
          padding: '2.5rem 2rem',
          minWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h2
          style={{
            marginBottom: 24,
            fontWeight: 700,
            fontSize: '2.5rem',
            color: '#13120F',
            textAlign: 'center',
            fontFamily: 'Avigea, serif',
            letterSpacing: '0.08em',
          }}
        >
          Stress Modules
        </h2>
        <div style={{ width: '100%', marginBottom: 16 }}>
          <SubmoduleDropdown
            items={stressItems}
          />
        </div>
      </div>
    </div>
  );
}