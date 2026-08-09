// ClubScreen — Mode BBC member feed inside the app. Same dark family, five carrier accents.
const DSC = window.LaBase360DesignSystem_afe5db;

function ClubScreen() {
  const { Card, Badge, Icon, EyebrowPill } = DSC;
  const feed = [
    { who: 'Le club', accent: 'var(--ls-bbc-lime)', icon: 'megaphone', title: 'Défi petit-déj — semaine 3', body: '18 membres ont déjà validé ce matin.', meta: 'il y a 12 min' },
    { who: 'Léa D.', accent: 'var(--ls-bbc-teal)', icon: 'user-round', title: 'a atteint son objectif protéines', body: '5 jours d\'affilée. Bravo Léa 👏', meta: 'il y a 40 min' },
    { who: 'Urgent', accent: 'var(--ls-bbc-coral)', icon: 'triangle-alert', title: 'Commande à finaliser', body: 'Ta box de la semaine ferme à 18 h.', meta: 'il y a 1 h' },
    { who: 'Silence', accent: 'var(--ls-bbc-amber)', icon: 'moon', title: 'Personne n\'a ouvert le rituel du soir', body: 'Un petit mot du coach ?', meta: 'hier' },
    { who: 'Rituel', accent: 'var(--ls-bbc-purple)', icon: 'sparkles', title: 'Méditation guidée · 8 min', body: 'Ajoutée à ton rituel du soir.', meta: 'hier' },
  ];
  return (
    <div style={{ padding: '20px 18px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <EyebrowPill tone="app">Mode BBC</EyebrowPill>
        <h1 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--ls-bbc-text)', fontSize: 28, letterSpacing: '.01em', margin: '12px 0 0' }}>Le Breakfast Club</h1>
        <p style={{ color: 'var(--ls-bbc-text-muted)', fontFamily: 'var(--font-bbc-body)', fontSize: 14, margin: '6px 0 0' }}>Chaque couleur dit quelque chose : club, membre, urgent, silence, rituel.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {feed.map((f, i) => (
          <Card key={i} tone="app" accent={f.accent} padding={16}>
            <div style={{ display: 'flex', gap: 13 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--ls-radius)', background: 'var(--ls-bbc-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.accent, flex: 'none' }}><Icon name={f.icon} size={20} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: f.accent }}>{f.who}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ls-bbc-text-muted)' }}>{f.meta}</span>
                </div>
                <div style={{ color: 'var(--ls-bbc-text)', fontWeight: 600, fontSize: 15, marginTop: 4 }}>{f.title}</div>
                <div style={{ color: 'var(--ls-bbc-text-muted)', fontSize: 13, marginTop: 3, fontFamily: 'var(--font-bbc-body)' }}>{f.body}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
window.ClubScreen = ClubScreen;
