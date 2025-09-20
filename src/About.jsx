import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { Text, StyleSheet } from "react-native";
import "./App.css";

export default function About() {
    const navigate = useNavigate();
    return (
        <div style={styles.page}>
            <Text style={styles.title}>About VOCAL-ize</Text>
            <div style={styles.body}>
                <p>
                    VOCAL-ize is an educational web app to practice
                    pronunciation with visual feedback. It provides stimuli,
                    recording, and spectral envelope visualization.
                </p>
                <p>
                    Thanks to our volunteers for providing stimulus audio. We
                    are working on adding more stimuli and features, to better
                    capture variation in Spanish and improve usability.
                </p>
                <p>
                    Our team includes Annika Brody Wallender (Project Lead),
                    Frank Jie Zhang (Developer), and Camden Zhu (Developer).
                </p>
                <p>
                    Check out the project repository on GitHub:{" "}
                    <a
                        href="https://github.com/timeglitch/VocalizeWeb"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        https://github.com/timeglitch/VocalizeWeb
                    </a>
                    <br />
                    Feel free to contribute or report issues!
                </p>
            </div>
            <div>
                <Button
                    variant="secondary"
                    style={styles.button}
                    onClick={() => navigate(-1)}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor =
                            styles.button.hover.backgroundColor;
                        e.currentTarget.style.color = styles.button.hover.color;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor =
                            styles.button.backgroundColor;
                        e.currentTarget.style.color = styles.button.color;
                    }}
                >
                    Back
                </Button>
            </div>
        </div>
    );
}

const styles = StyleSheet.create({
    page: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#F2F1EB",
        padding: "2rem",
    },
    title: {
        fontSize: "2.5rem",
        marginBottom: "1rem",
        color: "#13120F",
        fontWeight: "bold",
        fontFamily: "Avigea, serif",
        letterSpacing: "0.08em",
        textAlign: "center",
    },
    body: {
        maxWidth: 800,
        color: "#13120F",
        fontSize: "1.1rem",
        lineHeight: 1.6,
        marginBottom: "2rem",
    },
    button: {
        fontSize: "1.25rem",
        padding: "12px 24px",
        backgroundColor: "#00a896",
        border: "none",
        borderRadius: "6px",
        color: "#F2F1EB",
        cursor: "pointer",
        fontWeight: "bold",
        fontFamily: "Nexa-Heavy, sans-serif",
        letterSpacing: "0.05em",
        hover: {
            backgroundColor: "#F3540F",
            color: "#F2F1EB",
        },
    },
});
