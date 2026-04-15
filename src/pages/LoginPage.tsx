import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { useInstallPrompt } from "../context/InstallPromptContext";

export function LoginPage() {
  const { authReady, storageMode, users, loginWithCredentials } = useAppContext();
  const { canPromptInstall, isIos, isMobile, isStandalone, promptInstall } = useInstallPrompt();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const demoAccounts = useMemo(() => {
    const admin = users.find((user) => user.role === "admin");
    const distributor = users.find((user) => user.role === "distributor");
    return { admin, distributor };
  }, [users]);

  function fillDemoAccess(role: "admin" | "distributor") {
    const account = role === "admin" ? demoAccounts.admin : demoAccounts.distributor;
    if (!account) return;
    setEmail(account.email);
    setPassword("demo1234");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authReady) return;

    try {
      const result = await loginWithCredentials({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });
      if (!result.ok) {
        setError(
          result.error ??
            (storageMode === "supabase"
              ? "Email ou mot de passe invalides pour cet accès."
              : "Email ou mot de passe non reconnus pour cette version de démonstration.")
        );
        return;
      }
      setError("");
      navigate("/dashboard");
    } catch (submitError) {
      console.error("Soumission du login impossible.", submitError);
      setError(
        storageMode === "supabase"
          ? "La connexion sécurisée ne répond pas correctement pour le moment."
          : "La version de démonstration ne répond pas correctement pour le moment."
      );
    }
  }

  async function handleInstallClick() {
    await promptInstall();
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-left { display: none !important; }
          .login-right { padding: 36px 24px !important; justify-content: flex-start !important; padding-top: 52px !important; }
        }
        @keyframes lor-pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(45,212,191,0.2); }
          50% { box-shadow: 0 0 0 6px rgba(45,212,191,0.05); }
        }
      `}</style>

      <div className="login-grid" style={{ minHeight: '100vh', background: 'var(--ls-bg)', display: 'grid', gridTemplateColumns: '1fr 1fr', fontFamily: 'DM Sans, sans-serif' }}>

        {/* ── PANNEAU GAUCHE ── */}
        <div className="login-left" style={{ padding: '52px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'rgba(201,168,76,0.07)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-80, left:-40, width:240, height:240, borderRadius:'50%', background:'rgba(45,212,191,0.05)', pointerEvents:'none' }} />

          <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:44 }}>
            {/* Logo */}
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, background:'#C9A84C', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#0B0D11"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:18, color:'var(--ls-text)', letterSpacing:'-0.3px' }}>
                Lor&apos;<span style={{ color:'#C9A84C' }}>Squad</span> Wellness
              </div>
            </div>

            {/* Hero */}
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                <div style={{ width:28, height:1, background:'#C9A84C' }} />
                <span style={{ fontSize:11, color:'#C9A84C', letterSpacing:'2px', textTransform:'uppercase', fontWeight:500 }}>Outil coach professionnel</span>
              </div>
              <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:'clamp(28px, 3.2vw, 40px)', fontWeight:800, color:'var(--ls-text)', lineHeight:1.1, letterSpacing:'-0.5px', margin:'0 0 18px' }}>
                L&apos;accompagnement<br />nutrition <span style={{ color:'#2DD4BF' }}>réinventé</span>
              </h1>
              <p style={{ fontSize:14, color:'var(--ls-text-muted)', lineHeight:1.75, maxWidth:360, fontWeight:300, margin:'0 0 32px' }}>
                Bilan bien-être, body scan, suivi client et recommandations personnalisées — tout en un seul cockpit.
              </p>

              {/* Features card */}
              <div style={{ background:'var(--ls-surface)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#2DD4BF', animation:'lor-pulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize:11, color:'#2DD4BF', fontWeight:500, letterSpacing:'0.5px' }}>Application active</span>
                </div>
                {[
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>, label:'14 étapes de bilan guidé', color:'#C9A84C' },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, label:'Body scan & suivi terrain', color:'#2DD4BF' },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label:'Recommandations & Suivi PV', color:'#A78BFA' },
                ].map((f, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop: i > 0 ? '1px solid rgba(128,128,128,0.08)' : 'none' }}>
                    <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, background:`${f.color}15`, color:f.color, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.icon}</div>
                    <span style={{ fontSize:13, color:'var(--ls-text-muted)', fontWeight:400 }}>{f.label}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF" strokeWidth="2" style={{ marginLeft:'auto', flexShrink:0 }}><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trust footer */}
          <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ display:'flex' }}>
              {[{ initials:'LC', color:'#C9A84C' }, { initials:'SC', color:'#2DD4BF' }, { initials:'MR', color:'#A78BFA' }].map((av, i) => (
                <div key={av.initials} style={{ width:30, height:30, borderRadius:'50%', background:`${av.color}25`, color:av.color, border:'2px solid #0B0D11', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'Syne, sans-serif', marginLeft: i === 0 ? 0 : -8 }}>{av.initials}</div>
              ))}
            </div>
            <span style={{ fontSize:12, color:'var(--ls-text-hint)' }}>Utilisé par <strong style={{ color:'var(--ls-text-muted)', fontWeight:500 }}>votre équipe</strong> au quotidien</span>
          </div>
        </div>

        {/* ── PANNEAU DROIT ── */}
        <div className="login-right" style={{ background:'var(--ls-surface)', padding:'52px', display:'flex', flexDirection:'column', justifyContent:'center', gap:28 }}>
          <div>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:'var(--ls-text)', margin:'0 0 6px', letterSpacing:'-0.2px' }}>Connexion coach</h2>
            <p style={{ fontSize:13, color:'var(--ls-text-muted)', margin:0, fontWeight:300 }}>Accédez à votre espace professionnel</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <div>
              <label style={{ fontSize:11, color:'var(--ls-text-muted)', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:8, fontWeight:500 }}>Adresse email</label>
              <div style={{ position:'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5068" strokeWidth="1.5" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input type="email" placeholder="E-mail professionnel" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoCorrect="off" autoComplete="username" inputMode="email" spellCheck={false}
                  style={{ width:'100%', boxSizing:'border-box' as const, background:'var(--ls-surface2)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'13px 14px 13px 42px', fontSize:14, color:'var(--ls-text)', fontFamily:'DM Sans, sans-serif', outline:'none', transition:'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.45)'} onBlur={e => e.target.style.borderColor = 'var(--ls-border)'} />
              </div>
            </div>

            <div>
              <label style={{ fontSize:11, color:'var(--ls-text-muted)', letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:8, fontWeight:500 }}>Mot de passe</label>
              <div style={{ position:'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5068" strokeWidth="1.5" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input type={showPassword ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  style={{ width:'100%', boxSizing:'border-box' as const, background:'var(--ls-surface2)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'13px 14px 13px 42px', fontSize:14, color:'var(--ls-text)', fontFamily:'DM Sans, sans-serif', outline:'none', transition:'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(201,168,76,0.45)'} onBlur={e => e.target.style.borderColor = 'var(--ls-border)'} />
              </div>
              <button type="button" onClick={() => setShowPassword(v => !v)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:11, color:'var(--ls-text-muted)', marginTop:6, fontFamily:'DM Sans, sans-serif', padding:0, transition:'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'} onMouseLeave={e => e.currentTarget.style.color = 'var(--ls-text-muted)'}>
                {showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              </button>
            </div>

            {error ? (
              <div style={{ background:'var(--ls-coral-bg)', border:'1px solid rgba(251,113,133,0.2)', borderRadius:10, padding:'11px 14px', fontSize:13, color:'#FB7185' }}>{error}</div>
            ) : null}

            <button type="submit" disabled={!authReady} style={{ width:'100%', background: authReady ? '#C9A84C' : 'rgba(201,168,76,0.4)', color:'var(--ls-bg)', border:'none', borderRadius:10, padding:'14px', fontFamily:'Syne, sans-serif', fontSize:15, fontWeight:700, cursor: authReady ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'opacity 0.2s' }}
              onMouseEnter={e => { if (authReady) e.currentTarget.style.opacity = '0.9' }} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              Ouvrir mon espace
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>

          {/* PWA Install */}
          {!isStandalone ? (
            <div style={{ background:'var(--ls-surface2)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div>
                  <p style={{ fontSize:11, color:'#C9A84C', letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>Installer l&apos;app</p>
                  <p style={{ fontSize:15, fontFamily:'Syne, sans-serif', fontWeight:700, color:'var(--ls-text)', marginBottom:6 }}>Ajoute Lor&apos;Squad à ton écran d&apos;accueil</p>
                  <p style={{ fontSize:12, color:'var(--ls-text-muted)', lineHeight:1.6 }}>Plus rapide en rendez-vous, surtout sur tablette.</p>
                </div>
                <span style={{ fontSize:10, padding:'3px 10px', borderRadius:20, background:'rgba(45,212,191,0.1)', color:'#2DD4BF', whiteSpace:'nowrap' }}>Accès direct</span>
              </div>
              {canPromptInstall ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--ls-text-muted)]">Installation directe disponible.</p>
                  <Button variant="secondary" onClick={() => void handleInstallClick()}>Installer</Button>
                </div>
              ) : isIos ? (
                <div className="mt-4 rounded-[12px] bg-[var(--ls-surface2)] px-4 py-3 text-sm leading-6 text-[var(--ls-text-muted)]">
                  Sur iPhone/iPad : Safari → <span className="font-semibold text-white">Partager</span> → <span className="font-semibold text-white">Sur l&apos;écran d&apos;accueil</span>
                </div>
              ) : isMobile ? (
                <div className="mt-4 rounded-[12px] bg-[var(--ls-surface2)] px-4 py-3 text-sm leading-6 text-[var(--ls-text-muted)]">
                  Sur Android : Chrome → <span className="font-semibold text-white">Installer l&apos;app</span>
                </div>
              ) : (
                <div className="mt-4 rounded-[12px] bg-[var(--ls-surface2)] px-4 py-3 text-sm leading-6 text-[var(--ls-text-muted)]">
                  Icône d&apos;installation dans la barre d&apos;adresse Chrome/Edge.
                </div>
              )}
            </div>
          ) : null}

          {/* Démo */}
          {storageMode === "local" ? (
            <div style={{ background:'var(--ls-surface2)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:14 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--ls-text)' }}>Accès démonstration</p>
                  <p style={{ fontSize:11, color:'var(--ls-text-muted)', marginTop:2 }}>Tester l&apos;interface sans comptes réels</p>
                </div>
                <StatusBadge label="Démo" tone="blue" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <button type="button" onClick={() => fillDemoAccess("distributor")} style={{ background:'rgba(128,128,128,0.05)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:14, textAlign:'left', cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(128,128,128,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(128,128,128,0.05)'}>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--ls-text)', margin:0 }}>Distributeur</p>
                  <p style={{ fontSize:10, color:'var(--ls-text-muted)', margin:'4px 0 0', lineHeight:1.5 }}>Vue limitée</p>
                </button>
                <button type="button" onClick={() => fillDemoAccess("admin")} style={{ background:'rgba(128,128,128,0.05)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:14, textAlign:'left', cursor:'pointer', transition:'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(128,128,128,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(128,128,128,0.05)'}>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--ls-text)', margin:0 }}>Admin</p>
                  <p style={{ fontSize:10, color:'var(--ls-text-muted)', margin:'4px 0 0', lineHeight:1.5 }}>Vue complète</p>
                </button>
              </div>
              <p style={{ fontSize:10, color:'var(--ls-text-hint)', marginTop:10 }}>Mot de passe : demo1234</p>
            </div>
          ) : null}

          {/* Accès */}
          <div style={{ background:'var(--ls-surface2)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:20 }}>
            <p style={{ fontSize:10, color:'var(--ls-text-hint)', letterSpacing:'1.5px', textTransform:'uppercase', margin:'0 0 14px' }}>Comment créer les accès</p>
            {[
              { n:'01', title:"Tu crées le compte depuis l'admin", text:"Nom, email professionnel, rôle et état actif." },
              { n:'02', title:"L'email devient l'identifiant", text:"Pas de pseudo séparé." },
              { n:'03', title:"Mot de passe défini par l'admin", text:"Il peut être redéfini depuis la page équipe." },
            ].map((step, i) => (
              <div key={step.n} style={{ display:'flex', gap:12, alignItems:'flex-start', marginBottom: i < 2 ? 12 : 0 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, background:'var(--ls-gold-bg)', color:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'Syne, sans-serif' }}>{step.n}</div>
                <div>
                  <p style={{ fontSize:12, fontWeight:600, color:'var(--ls-text)', margin:'0 0 3px' }}>{step.title}</p>
                  <p style={{ fontSize:11, color:'var(--ls-text-muted)', margin:0, lineHeight:1.6 }}>{step.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Sécurité */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:11, color:'var(--ls-text-hint)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Connexion sécurisée — données chiffrées
          </div>
        </div>
      </div>
    </>
  );
}
