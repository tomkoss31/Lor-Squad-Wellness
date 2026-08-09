// Hero — Breakfast Club landing hero. Cream ground, ghost numeral, framed image, CTA.
const { Button, EyebrowPill } = window.LaBase360DesignSystem_afe5db;

function Hero({ onReserve }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', background: 'var(--bc-cream)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 28px 84px', display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 48, alignItems: 'center' }}>
        <div>
          <EyebrowPill tone="yellow">The Wellness Nutrition Club</EyebrowPill>
          <h1 style={{ fontFamily: 'var(--font-title)', textTransform: 'uppercase', color: 'var(--bc-ink)', fontSize: 68, lineHeight: 1.02, letterSpacing: '.005em', margin: '18px 0 0' }}>Le petit-déj<br/>qui change<br/>ta journée</h1>
          <p style={{ fontFamily: 'var(--font-bc-body)', color: 'var(--bc-text)', fontSize: 18, lineHeight: 1.6, maxWidth: 440, margin: '20px 0 30px' }}>Rejoins un club de nutrition bien-être : des repas pensés par des coachs, une communauté qui te suit, et des rituels qui tiennent.</p>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <Button variant="cta" size="lg" onClick={onReserve}>Réserver ma place</Button>
            <a href="#" style={{ color: 'var(--bc-link)', fontFamily: 'var(--font-bc-body)', fontWeight: 600, textDecoration: 'none' }}>Voir la méthode →</a>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', top: -46, right: -8, fontFamily: 'var(--font-title)', fontSize: 240, color: 'var(--bc-peach)', opacity: .5, lineHeight: 1, zIndex: 0, pointerEvents: 'none' }}>360</span>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ position: 'absolute', inset: '18px -18px -18px 18px', background: 'var(--bc-sage)', opacity: .3, borderRadius: 'var(--bc-radius-card)' }} />
            <div style={{ position: 'relative', borderRadius: 'var(--bc-radius-card)', overflow: 'hidden', boxShadow: 'var(--shadow-card)', background: 'var(--bc-card-dark)', aspectRatio: '4/5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="../../assets/breakfast-club/logo-mark.png" alt="Breakfast Club" style={{ width: '72%' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
