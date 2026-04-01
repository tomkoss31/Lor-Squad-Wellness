var config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#060912",
                panel: "#0d1420",
                "panel-alt": "#121b29",
                line: "rgba(148, 163, 184, 0.16)",
                glow: {
                    blue: "#60a5fa",
                    amber: "#f5c76a",
                    red: "#fb7185",
                    green: "#34d399"
                }
            },
            boxShadow: {
                soft: "0 34px 130px rgba(2, 6, 23, 0.48)",
                panel: "0 28px 80px rgba(2, 6, 23, 0.42)",
                luxe: "0 18px 50px rgba(2, 6, 23, 0.34), inset 0 1px 0 rgba(255,255,255,0.04)"
            },
            fontFamily: {
                display: ["Outfit", "Segoe UI", "sans-serif"],
                body: ["Manrope", "Segoe UI", "sans-serif"]
            },
            backgroundImage: {
                "hero-mesh": "radial-gradient(circle at top left, rgba(245, 199, 106, 0.14), transparent 26%), radial-gradient(circle at top right, rgba(251, 113, 133, 0.12), transparent 22%), radial-gradient(circle at bottom center, rgba(96, 165, 250, 0.1), transparent 30%)"
            }
        }
    },
    plugins: []
};
export default config;
