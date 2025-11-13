import tutorial from "./assets/VOCAL-ize Tutorial.pdf";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { StyleSheet } from "react-native";

export default function Tutorial() {
    const navigate = useNavigate();
    const pptSrc =
        "https://1drv.ms/p/c/88070f5f1a13974a/IQTNWeP6EkToR5vaKVSqHSWzASgFPBbgtL46cRtd9I_67sY?em=2&wdAr=1.7777777777777777&wdEaaCheck=0";

    return (
        <div style={styles.bg}>
            <h1 style={styles.h1}>Tutorial</h1>

            <iframe
                src={pptSrc}
                width="100%"
                height="600px"
                frameBorder="0"
                title="Vocalize Tutorial Presentation"
                style={{ border: "none" }}
            >
                This is an embedded{" "}
                <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://office.com"
                >
                    Microsoft Office
                </a>{" "}
                presentation, powered by{" "}
                <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://office.com/webapps"
                >
                    Office
                </a>
                .
            </iframe>
            <p style={{ textAlign: "center", marginTop: "0.5rem" }}>
                If the preview is unavailable,{" "}
                <a href={pptSrc} target="_blank" rel="noopener noreferrer">
                    Open or download the presentation
                </a>
                .
            </p>

            <Button
                variant="success"
                style={styles.button}
                onClick={() => navigate("/Modules")}
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
                BACK
            </Button>
        </div>
    );
}

const styles = StyleSheet.create({
    bg: {
        padding: "2rem",
        backgroundColor: "#F2F1EB",
        height: "100vh",
    },
    h1: {
        fontFamily: "Nexa-Heavy, sans-serif",
        textAlign: "center",
        letterSpacing: "0.03em",
        marginBottom: "1rem",
    },
    button: {
        fontSize: "1.5rem",
        padding: "20px 40px",
        backgroundColor: "#00a896",
        border: "none",
        borderRadius: "5px",
        color: "#F2F1EB",
        cursor: "pointer",
        fontWeight: "bold",
        fontFamily: "Nexa-Heavy, sans-serif",
        letterSpacing: "0.05em",
        hover: {
            backgroundColor: "#F3540F",
        },
        zIndex: 1,
        marginTop: "1rem",
        display: "block",
        marginLeft: "auto",
        marginRight: "auto",
    },
});
