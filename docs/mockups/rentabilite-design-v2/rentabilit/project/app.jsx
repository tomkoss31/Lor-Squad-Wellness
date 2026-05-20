// app.jsx — Assembles the design canvas

function App() {
  const [modalPageTheme, setModalPageTheme] = React.useState(null); // 'light' | 'dark' | null

  return (
    <DesignCanvas>
      <DCSection
        id="widget"
        title="Widget compact · Co-pilote V5"
        subtitle="Horizontal, ~320px de haut · intégré au feed du copilote"
      >
        <DCArtboard id="widget-light" label="Light" width={1100} height={340}>
          <Widget theme="light" />
        </DCArtboard>
        <DCArtboard id="widget-dark" label="Dark · avec glow signature" width={1100} height={340}>
          <Widget theme="dark" />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="page"
        title="Page /rentabilite"
        subtitle="Hero plein écran · le calcul · équipe · top clients (podium)"
      >
        <DCArtboard id="page-light" label="Light" width={1240} height={2240}>
          <Page theme="light" onOpenModal={() => setModalPageTheme('light')} />
          {modalPageTheme === 'light' && (
            <ModalOverlay onClose={() => setModalPageTheme(null)}>
              <Modale theme="light" onClose={() => setModalPageTheme(null)} />
            </ModalOverlay>
          )}
        </DCArtboard>
        <DCArtboard id="page-dark" label="Dark" width={1240} height={2240}>
          <Page theme="dark" onOpenModal={() => setModalPageTheme('dark')} />
          {modalPageTheme === 'dark' && (
            <ModalOverlay onClose={() => setModalPageTheme(null)}>
              <Modale theme="dark" onClose={() => setModalPageTheme(null)} />
            </ModalOverlay>
          )}
        </DCArtboard>
      </DCSection>

      <DCSection
        id="surprises"
        title="✦ Directions surprises"
        subtitle="Variantes plus audacieuses, à mixer avec le design principal"
      >
        <DCArtboard id="wallet-card" label="« La Carte » · Apple Wallet — clic pour flip" width={640} height={400}>
          <WalletCard theme="light" />
        </DCArtboard>
        <DCArtboard id="sankey" label="« Le Flux » · Sankey du calcul" width={1020} height={680}>
          <SankeyFlow theme="light" />
        </DCArtboard>
        <DCArtboard id="sankey-dark" label="« Le Flux » · Dark" width={1020} height={680}>
          <SankeyFlow theme="dark" />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="modale"
        title="Modale détail"
        subtitle="Couche d'analyse — toggle 12 mois / mois courant, filtres pivot, plan d'action"
      >
        <DCArtboard id="modale-light" label="Vue 12 mois — Light" width={820} height={900}>
          <Modale theme="light" defaultTab="12m" onClose={() => {}} />
        </DCArtboard>
        <DCArtboard id="modale-light-mois" label="Vue mois — Light · filtres pivot" width={820} height={900}>
          <Modale theme="light" defaultTab="mois" onClose={() => {}} />
        </DCArtboard>
        <DCArtboard id="modale-dark" label="Vue 12 mois — Dark" width={820} height={900}>
          <Modale theme="dark" defaultTab="12m" onClose={() => {}} />
        </DCArtboard>
        <DCArtboard id="modale-dark-mois" label="Vue mois — Dark" width={820} height={900}>
          <Modale theme="dark" defaultTab="mois" onClose={() => {}} />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

/* Modal overlay used when the page CTA opens the modale on top of the page */
function ModalOverlay({ children, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,.45)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 40,
      zIndex: 10,
      animation: 'ls-fade-up .25s var(--ls-ease-out) both',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 820, maxWidth: '100%', height: 860, maxHeight: '92%',
      }}>
        {children}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
