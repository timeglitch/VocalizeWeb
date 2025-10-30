import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { Text, StyleSheet } from 'react-native';
import './App.css';

export default function Modules() {
    const navigate = useNavigate();

    return (
        <div className="modules" style={styles.container}>
            <Text style={styles.text}>Modules</Text>
            <Button
                variant="success"
                style={styles.button}
                onClick={() => navigate('/Tutorial')}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = styles.button.hover.backgroundColor;
                    e.currentTarget.style.color = styles.button.hover.color;
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = styles.button.backgroundColor;
                    e.currentTarget.style.color = styles.button.color;
                }}
            >
                Tutorial
            </Button>
            <Button
                variant="success"
                style={styles.button}
                onClick={() => navigate('/VowelSubmodules')}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = styles.button.hover.backgroundColor;
                    e.currentTarget.style.color = styles.button.hover.color;
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = styles.button.backgroundColor;
                    e.currentTarget.style.color = styles.button.color;
                }}
            >
                Vowel
            </Button>
            <Button
                variant="success"
                style={styles.button}
                onClick={() => navigate('/StressSubmodules')}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = styles.button.hover.backgroundColor;
                    e.currentTarget.style.color = styles.button.hover.color;
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = styles.button.backgroundColor;
                    e.currentTarget.style.color = styles.button.color;
                }}
            >
                Stress
            </Button>
        </div>
    );
}

const styles = StyleSheet.create({
    container: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#F2F1EB',

    },
    text: {
        fontSize: '3rem',
        marginBottom: '20px',
        color: '#13120F',
        fontWeight: 'bold',
        fontFamily: 'Avigea, serif',
        letterSpacing: '0.08em',
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
        marginVertical: 10,
        letterSpacing: '0.05em',
        marginBottom: 20,
        hover: {
            backgroundColor: '#F3540F',
        }
    },
});