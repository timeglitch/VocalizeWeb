import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { Text, StyleSheet, View } from "react-native";
import "./App.css";
import l1variation from "./assets/L1 Variation About Page Blurb.pdf";

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
                    Thanks to our volunteers for providing stimulus audios. We
                    are working on adding more stimuli and features to better
                    capture variation in Spanish and improve usability.
                </p>
                <p>
                    Our team includes Annika Brody Wallander (Project Lead),
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
                <details>
                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                        Summarized Project Abstract
                    </summary>
                    <div style={{ marginTop: "0.5rem" }}>
                        Previous research emphasizes the challenges L2 Spanish
                        learners face due to transfer of L1 U.S. English vowel
                        reduction in unstressed contexts and centralization of
                        the vowel space (Reeder, 1999; Stevens, 2011; Cobb &
                        Simonet, 2015). Vowel sounds serve as the foundational
                        elements of word nuclei in Spanish, and difficulties
                        with their production can negatively impact learners’
                        intelligibility and comprehensibility (the degree to
                        which they are understood) in their L2 Spanish (Levis,
                        2005; Derwing & Munro, 2012; Nagle & Huensch, 2020).
                        Despite many gaps in pronunciation teaching in current
                        Spanish classrooms (Counselman, 2015; Offerman, 2024),
                        visual acoustic feedback (VF) has been used to address
                        vowel learning challenges in both L2 English (Dowd et
                        al., 1998; Kartushina et al., 2015) and L2 Spanish
                        (Olson & Offerman, 2021). VF helps learners enhance
                        their pronunciation through real-time or delayed visual
                        cues. Using VF in their novel staRt app, Peterson et al.
                        (2022) observed improved production of the North
                        American English /ɹ/ in four children. While various
                        apps exist, none have applied real-time VF to Spanish
                        vowel learning as effectively as staRt has for English
                        /ɹ/. Additionally, very few studies have investigated
                        learner goals and aspirations as a qualitative component
                        within a mixed methods approach to Spanish pronunciation
                        learning; to date, the only known example is Nagle
                        (2018). The present study addresses these understudied
                        gaps by creating and piloting an app, VOCAL-ize, adapted
                        from Peterson et al.’s (2022){" "}
                        <a href="https://bitslabstart.com/">staRt app</a> to
                        support L2 Spanish vowel learning for L1 American
                        English speakers. The app features modules targeting
                        Spanish monophthongal vowels ([i, e, a, o, u]) in
                        stressed and unstressed contexts, addresses English
                        vowel reduction, and provides tutorials on acoustic
                        features. The app will be piloted with a small group of
                        learners.
                    </div>
                </details>
                <details>
                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                        On L1 Variation
                    </summary>
                    <div style={{ marginTop: "1rem" }}>
                        <object
                            data={l1variation}
                            type="application/pdf"
                            width="100%"
                            height="600px"
                        >
                            <p>
                                PDF preview not available.<a href={l1variation} target="_blank" rel="noopener noreferrer">Open or download the PDF</a>.
                            </p>
                        </object>
                    </div>
                </details>
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
