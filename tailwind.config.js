var config = {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                ink: "#0B0D11",
                panel: "#13161C",
                "panel-alt": "#1A1E27",
                line: "rgba(255, 255, 255, 0.07)",
                glow: {
                    blue: "#2DD4BF",
                    amber: "#C9A84C",
                    red: "#FB7185",
                    green: "#2DD4BF"
                },
                lor: {
                    bg: '#0B0D11',
                    surface: '#13161C',
                    surface2: '#1A1E27',
                    gold: '#C9A84C',
                    teal: '#2DD4BF',
                    purple: '#A78BFA',
                    coral: '#FB7185',
                    text: '#F0EDE8',
                    muted: '#7A8099',
                    hint: '#4A5068',
                },
                // ─── La Base 360 — G3 Vital Fusion (rebrand 2026-05-05) ─────
                lb360: {
                    emerald:   '#10B981',
                    cyan:      '#06B6D4',
                    violet:    '#8B5CF6',
                    white:     '#FFFFFF',
                    mist:      '#F8FAFC',
                    ink:       '#0F172A',
                    'ink-soft': '#475569',
                    border:    '#E2E8F0',
                    success:   '#10B981',
                    warning:   '#F59E0B',
                    danger:    '#EF4444',
                    info:      '#06B6D4',
                },
            },
            boxShadow: {
                soft: "0 10px 30px rgba(0,0,0,0.22)",
                panel: "0 18px 48px rgba(0,0,0,0.22)",
                luxe: "0 2px 12px rgba(0,0,0,0.16), 0 18px 48px rgba(0,0,0,0.22)"
            },
            fontFamily: {
                display: ["Syne", "sans-serif"],
                body: ["DM Sans", "sans-serif"],
                sans: ["DM Sans", "sans-serif"],
                // La Base 360
                sora: ["Sora", "system-ui", "sans-serif"],
                inter: ["Inter", "system-ui", "sans-serif"],
            },
            backgroundImage: {
                "hero-mesh": "radial-gradient(ellipse 60% 40% at 15% 15%, rgba(201,168,76,0.09) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 85% 85%, rgba(45,212,191,0.07) 0%, transparent 60%)",
                // La Base 360 — G3 Vital Fusion 135deg
                "lb360-gradient": "linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%)",
                "lb360-gradient-soft": "linear-gradient(135deg, #F0FDF4 0%, #ECFEFF 50%, #F5F3FF 100%)",
            }
        }
    },
    plugins: []
};
export default config;
