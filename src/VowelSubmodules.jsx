import SubmoduleDropdown from './SubmoduleDropdown';
import './App.css';

export default function VowelSubmodules() {
  const vowelItems = [
    { label: 'Segment',  path: '../Main?module=Vowel&submodule=Segment' },
    { label: 'Syllable', path: '../Main?module=Vowel&submodule=Syllable' },
    { label: 'Word',     path: '../Main?module=Vowel&submodule=Word' },
    { label: 'Phrase',   path: '../Main?module=Vowel&submodule=Phrase' },
    { label: 'Sentence', path: '../Main?module=Vowel&submodule=Sentence' }
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#F2F1EB',
      }}
    >
      <div
        style={{
          background: '#F2F1EB',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
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
          Vowel Modules
        </h2>
        <div style={{ width: '100%', marginBottom: 16 }}>
          <SubmoduleDropdown
            items={vowelItems}
            moduleType="Vowel"
          />
        </div>
      </div>
    </div>
  );
}