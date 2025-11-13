import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";

export default function Layout() {
    const navigate = useNavigate();
    return (
        <div style={{ position: "relative", minHeight: "100vh" }}>
            <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                <Button
                    variant="link"
                    style={{
                        color: "#13120F",
                        textDecoration: "underline",
                        fontSize: "1rem",
                        padding: 0,
                    }}
                    onClick={() => navigate("/About")}
                >
                    About
                </Button>
            </div>
            <Outlet />
        </div>
    );
}
