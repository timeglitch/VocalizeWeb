import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { Text, StyleSheet } from 'react-native';
import './App.css';

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="home" style={styles.home}>
      <Text style={styles.txt}>VOCAL-ize</Text>
      <Button
        variant="success"
        style={styles.button}
        onClick={() => navigate('/Modules')}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = styles.button.hover.backgroundColor;
          e.currentTarget.style.color = styles.button.hover.color;
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = styles.button.backgroundColor;
          e.currentTarget.style.color = styles.button.color;
        }}
      >
        START
      </Button>
    </div>
  );
}

const styles = StyleSheet.create({
  home: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#F2F1EB',
  },
  txt: {
    fontSize: '3rem',
    marginBottom: '20px',
    color: '#13120F',
    fontWeight: 'bold',
    fontFamily: 'Avigea, serif',
    letterSpacing: '0.08em',
    textShadow: '4px 4px 4px rgba(0, 53, 96, 0.3)',
    width: '100%',
    textAlign: 'center',
    padding: '0.5rem 0.5rem',
    WebkitFontSmoothing: 'antialiased',
  },
  button: {
    fontSize: '2rem',
    padding: '20px 40px',
    backgroundColor: '#00a896',
    border: 'none',
    borderRadius: '5px',
    color: '#F2F1EB',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'Nexa-Heavy, sans-serif',
    letterSpacing: '0.05em',
    hover: {
      backgroundColor: '#F3540F',
    },
    zIndex: 1,
    backdropFilter: 'none',
    WebkitFontSmoothing: 'antialiased',
  },

});
