import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { Text, StyleSheet } from 'react-native';

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
        Start
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
    backgroundColor: '#05668d',
  },
  txt: {
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
    hover: {
      backgroundColor: '#00a896',
      color: '#f0f3bd',
    }
  },

});
