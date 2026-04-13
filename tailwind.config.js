var config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#07111F",
                panel: "#0B1524",
                "panel-alt": "#101A2A",
                line: "rgba(255, 255, 255, 0.08)",
                glow: {
                    blue: "#59B7FF",
                    amber: "#EFC58D",
                    red: "#F08E98",
                    green: "#63D1A6"
                }
            },
            boxShadow: {
                soft: "0 10px 30px rgba(0,0,0,0.22)",
                panel: "0 18px 48px rgba(0,0,0,0.22)",
                luxe: "0 2px 12px rgba(0,0,0,0.16), 0 18px 48px rgba(0,0,0,0.22)"
            },
            fontFamily: {
                display: ["Plus Jakarta Sans", "Segoe UI", "sans-serif"],
                body: ["Plus Jakarta Sans", "Segoe UI", "sans-serif"]
            },
            backgroundImage: {
                "hero-mesh": "radial-gradient(circle at 86% 10%, rgba(89, 183, 255, 0.14), transparent 24%), radial-gradient(circle at 18% 8%, rgba(84, 64, 104, 0.14), transparent 24%), radial-gradient(circle at 50% 0%, rgba(255,255,255,0.03), transparent 28%)"
            }
        }
    },
    plugins: []
};
export default config;
