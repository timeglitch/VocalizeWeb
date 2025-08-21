import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { Text, StyleSheet } from 'react-native';

export default function Modules() {
    const navigate = useNavigate();

    return (
        <div className="modules" style={styles.container}>
            <Text style={styles.text}>Modules</Text>
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
        backgroundColor: '#05668d',

    },
    text: {
        fontSize: '3rem',
        marginBottom: '20px',
        color: '#f0f3bd',
        fontWeight: 'bold',
    },
    button: {
        fontSize: '2rem',
        padding: '20px 40px',
        backgroundColor: '#f0f3bd',
        border: 'none',
        borderRadius: '5px',
        color: '#05668d',
        cursor: 'pointer',
        fontWeight: 'bold',
        marginVertical: 10,
        marginBottom: 20,
        hover: {
            backgroundColor: '#00a896',
            color: '#f0f3bd',
        }
    },
});