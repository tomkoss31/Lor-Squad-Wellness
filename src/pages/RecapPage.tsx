/**
 * Page récap publique — accessible sans auth via /recap/:clientId
 * Affiche un résumé lisible du dernier bilan pour le client.
 */
import { useParams } from "react-router-dom"
import { useAppContext } from "../context/AppContext"
import { formatDate, getLatestAssessment } from "../lib/calculations"

export function RecapPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { getClientById } = useAppContext()
  const client = clientId ? getClientById(clientId) : undefined

  if (!client) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0D11', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✦</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 700, color: '#F0EDE8', margin: '0 0 8px' }}>Récap indisponible</h1>
          <p style={{ fontSize: 14, color: '#7A8099' }}>Ce lien n'est plus actif ou le dossier est introuvable.</p>
        </div>
      </div>
    )
  }

  const latestAssessment = getLatestAssessment(client)
  const bodyScan = latestAssessment?.bodyScan ?? null
  const questionnaire = latestAssessment?.questionnaire

  const metrics = [
    { label: 'Poids', value: bodyScan?.weight ? `${bodyScan.weight} kg` : null, color: '#C9A84C' },
    { label: 'Masse grasse', value: bodyScan?.bodyFat ? `${bodyScan.bodyFat}%` : null, color: '#FB7185' },
    { label: 'Masse musculaire', value: bodyScan?.muscleMass ? `${bodyScan.muscleMass} kg` : null, color: '#2DD4BF' },
    { label: 'Hydratation', value: bodyScan?.hydration ? `${bodyScan.hydration}%` : null, color: '#A78BFA' },
    { label: 'Graisse viscérale', value: bodyScan?.visceralFat ? `Niv. ${bodyScan.visceralFat}` : null, color: '#C9A84C' },
    { label: 'Âge métabolique', value: bodyScan?.metabolicAge ? `${bodyScan.metabolicAge} ans` : null, color: '#A78BFA' },
  ].filter(m => m.value !== null)

  return (
    <div style={{ minHeight: '100vh', background: '#0B0D11', fontFamily: 'DM Sans, sans-serif', padding: '24px 16px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px',
            background: 'rgba(201,168,76,0.15)', color: '#C9A84C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700,
            border: '2px solid rgba(201,168,76,0.3)'
          }}>
            {client.firstName[0]}{client.lastName[0]}
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: '#F0EDE8', margin: '0 0 4px' }}>
            {client.firstName} {client.lastName}
          </h1>
          <p style={{ fontSize: 13, color: '#7A8099', margin: 0 }}>
            Bilan du {latestAssessment ? formatDate(latestAssessment.date) : '—'}
          </p>
          <div style={{ marginTop: 8, display: 'inline-flex', padding: '4px 14px', borderRadius: 20, background: 'rgba(201,168,76,0.1)', color: '#C9A84C', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Lor'Squad Wellness
          </div>
        </div>

        {/* Objectif */}
        {questionnaire?.objectiveFocus && (
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#4A5068', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Objectif</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, color: '#C9A84C' }}>
              {questionnaire.objectiveFocus}
            </div>
          </div>
        )}

        {/* Body Scan */}
        {metrics.length > 0 && (
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#4A5068', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>Résultats Body Scan</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {metrics.map(m => (
                <div key={m.label} style={{ background: '#1A1E27', borderRadius: 12, padding: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 11, color: '#7A8099', marginTop: 6 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Programme */}
        {client.currentProgram && (
          <div style={{ background: '#13161C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#4A5068', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Programme retenu</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#F0EDE8' }}>{client.currentProgram}</div>
          </div>
        )}

        {/* Prochain RDV */}
        {client.nextFollowUp && (
          <div style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#2DD4BF', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Prochain rendez-vous</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#2DD4BF' }}>
              {formatDate(client.nextFollowUp)}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: '#F0EDE8' }}>
            Lor'<span style={{ color: '#C9A84C' }}>Squad</span> Wellness
          </div>
          <p style={{ fontSize: 11, color: '#4A5068', marginTop: 4 }}>
            {client.distributorName} · Coach nutrition & bien-être
          </p>
        </div>
      </div>
    </div>
  )
}
