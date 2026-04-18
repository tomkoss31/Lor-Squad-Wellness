import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PvClientTrackingRecord, PvProductUsage } from '../../types/pv'
import { useAppContext } from '../../context/AppContext'
import { getPvProductStatusMeta, getPvTypeLabel } from '../../data/mockPvModule'

type Tab = 'products' | 'order' | 'history'

function formatDateLocal(d: string | Date | null | undefined) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function PvClientFullPage({ record, onClose }: { record: PvClientTrackingRecord; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('products')

  // Parser le nom en prénom/nom
  const nameParts = (record.clientName ?? '').trim().split(/\s+/)
  const firstName = nameParts[0] ?? ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Retour */}
      <button
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 9,
          border: '1px solid var(--ls-border)', background: 'transparent',
          color: 'var(--ls-text-muted)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif', alignSelf: 'flex-start',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour à la liste
      </button>

      {/* HEADER CLIENT */}
      <div style={{
        background: 'var(--ls-surface)', border: '1px solid var(--ls-border)',
        borderRadius: 14, padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(184,146,42,0.15)',
          border: '2px solid rgba(184,146,42,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--ls-gold)',
          flexShrink: 0,
        }}>
          {firstName[0]}{lastName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--ls-text)' }}>
            {record.clientName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ls-text-hint)', marginTop: 2 }}>
            {record.program ?? 'Programme'} · Coach {record.responsibleName ?? '—'}
          </div>
        </div>
        <Link
          to={`/clients/${record.clientId}`}
          style={{
            padding: '9px 14px', borderRadius: 10,
            border: '1px solid var(--ls-border)', background: 'var(--ls-surface2)',
            color: 'var(--ls-text-muted)', fontSize: 12, fontWeight: 500,
            textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Ouvrir dossier complet →
        </Link>
      </div>

      {/* ONGLETS */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--ls-border)' }}>
        {([
          { key: 'products', label: 'Produits actifs' },
          { key: 'order', label: '+ Commander' },
          { key: 'history', label: 'Historique' },
        ] as const).map(({ key, label }) => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, padding: '12px', border: 'none', background: 'transparent',
                color: isActive ? 'var(--ls-gold)' : 'var(--ls-text-muted)',
                fontSize: 13, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--ls-gold)' : '2px solid transparent',
                marginBottom: -1, fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {activeTab === 'products' && <ProductsTab record={record} />}
      {activeTab === 'order' && <OrderTab record={record} />}
      {activeTab === 'history' && <HistoryTab record={record} />}
    </div>
  )
}

// ─── ONGLET PRODUITS ─────────────────────────────────────────────────────
function ProductsTab({ record }: { record: PvClientTrackingRecord }) {
  const { savePvClientProduct } = useAppContext()
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftQuantity, setDraftQuantity] = useState('1')
  const [draftDuration, setDraftDuration] = useState('21')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const products = record.activeProducts ?? []

  if (products.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ls-text-hint)', fontSize: 13 }}>
        Aucun produit actif pour ce client.
      </div>
    )
  }

  function startEditing(p: PvProductUsage) {
    setEditingProductId(p.recordId)
    setDraftStartDate(p.startDate.slice(0, 10))
    setDraftQuantity(String(p.quantityStart))
    setDraftDuration(String(p.durationReferenceDays))
    setSaveError('')
  }

  function cancelEditing() {
    setEditingProductId(null)
    setSaveError('')
  }

  async function handleSaveProduct(p: PvProductUsage) {
    setIsSaving(true)
    setSaveError('')
    try {
      await savePvClientProduct({
        id: p.recordId,
        clientId: record.clientId,
        responsibleId: record.responsibleId,
        responsibleName: record.responsibleName,
        programId: p.programId,
        productId: p.productId,
        productName: p.productName,
        quantityStart: Math.max(1, Number(draftQuantity) || 1),
        startDate: draftStartDate || p.startDate.slice(0, 10),
        durationReferenceDays: Math.max(1, Number(draftDuration) || p.durationReferenceDays),
        pvPerUnit: p.pvPerUnit,
        pricePublicPerUnit: p.pricePublicPerUnit,
        quantiteLabel: p.quantiteLabel,
        noteMetier: p.noteMetier,
        active: true,
      })
      setEditingProductId(null)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {products.map((p) => {
        const statusMeta = getPvProductStatusMeta(p.status)
        const dotColor =
          p.status === 'ok' ? 'var(--ls-teal)'
            : p.status === 'restock' ? 'var(--ls-coral)'
            : p.status === 'watch' ? 'var(--ls-gold)'
            : 'var(--ls-text-hint)'
        const isEditing = editingProductId === p.recordId

        return (
          <div key={p.id} style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ls-text)' }}>{p.productName}</div>
                <div style={{ fontSize: 11, color: 'var(--ls-text-hint)' }}>
                  Quantité {p.quantityStart} {p.quantiteLabel ? `· ${p.quantiteLabel}` : ''} · Démarré le {formatDateLocal(p.startDate)}
                </div>
              </div>
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', fontWeight: 500, flexShrink: 0 }}>
                {statusMeta.label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11, marginBottom: 12 }}>
              <div>
                <div style={{ color: 'var(--ls-text-hint)', marginBottom: 2 }}>Reste estimé</div>
                <div style={{ fontWeight: 600, color: 'var(--ls-text)' }}>{p.estimatedRemainingDays} jours</div>
              </div>
              <div>
                <div style={{ color: 'var(--ls-text-hint)', marginBottom: 2 }}>Prochaine commande</div>
                <div style={{ fontWeight: 600, color: 'var(--ls-gold)' }}>{formatDateLocal(p.nextProbableOrderDate)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--ls-text-hint)', marginBottom: 2 }}>Durée de référence</div>
                <div style={{ fontWeight: 600, color: 'var(--ls-text)' }}>{p.durationReferenceDays} j</div>
              </div>
              <div>
                <div style={{ color: 'var(--ls-text-hint)', marginBottom: 2 }}>Prix / PV</div>
                <div style={{ fontWeight: 600, color: 'var(--ls-text)' }}>{p.pricePublicPerUnit.toFixed(2)} € · {p.pvPerUnit} PV</div>
              </div>
            </div>

            {!isEditing ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Link
                  to={`/pv/orders?client=${record.clientId}&product=${p.productId}&type=commande`}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8,
                    border: '1px solid rgba(184,146,42,0.3)',
                    background: 'rgba(184,146,42,0.08)',
                    color: 'var(--ls-gold)',
                    fontSize: 11, fontWeight: 600, textAlign: 'center',
                    textDecoration: 'none', fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Commander
                </Link>
                <button
                  onClick={() => startEditing(p)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8,
                    border: '1px solid var(--ls-border)', background: 'transparent',
                    color: 'var(--ls-text-muted)', fontSize: 11, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Modifier
                </button>
              </div>
            ) : (
              <div style={{ padding: 12, borderRadius: 10, background: 'var(--ls-surface2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--ls-text-hint)', fontWeight: 500, marginBottom: 4, display: 'block' }}>Date début</label>
                    <input type="date" value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--ls-text-hint)', fontWeight: 500, marginBottom: 4, display: 'block' }}>Quantité</label>
                    <input value={draftQuantity} onChange={(e) => setDraftQuantity(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: 'var(--ls-text-hint)', fontWeight: 500, marginBottom: 4, display: 'block' }}>Durée (jours)</label>
                    <input value={draftDuration} onChange={(e) => setDraftDuration(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ls-border)', background: 'var(--ls-surface)', color: 'var(--ls-text)', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }} />
                  </div>
                </div>
                {saveError && (
                  <div style={{ fontSize: 11, color: 'var(--ls-coral)', marginBottom: 8 }}>{saveError}</div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={cancelEditing}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--ls-border)', background: 'transparent', color: 'var(--ls-text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    Annuler
                  </button>
                  <button onClick={() => void handleSaveProduct(p)} disabled={isSaving}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--ls-gold)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: isSaving ? 'wait' : 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            )}

            {p.noteMetier && !isEditing && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ls-text-hint)', fontStyle: 'italic' }}>
                {p.noteMetier}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── ONGLET COMMANDER ────────────────────────────────────────────────────
function OrderTab({ record }: { record: PvClientTrackingRecord }) {
  return (
    <div style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 13, color: 'var(--ls-text-muted)', marginBottom: 16, textAlign: 'center' }}>
        Ajouter une commande pour <strong style={{ color: 'var(--ls-text)' }}>{record.clientName}</strong>
      </div>
      <Link
        to={`/pv/orders?client=${record.clientId}&type=commande`}
        style={{
          display: 'block', textAlign: 'center',
          padding: '14px 20px', borderRadius: 12,
          background: 'var(--ls-gold)', color: '#fff',
          fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 2px 8px rgba(184,146,42,0.25)',
        }}
      >
        Aller au formulaire de commande →
      </Link>
      <div style={{ fontSize: 11, color: 'var(--ls-text-hint)', marginTop: 12, textAlign: 'center' }}>
        Tu seras redirigé vers la page Commandes avec ce client pré-sélectionné.
      </div>
    </div>
  )
}

// ─── ONGLET HISTORIQUE ───────────────────────────────────────────────────
function HistoryTab({ record }: { record: PvClientTrackingRecord }) {
  const transactions = record.transactions ?? []
  if (transactions.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ls-text-hint)', fontSize: 13 }}>
        Aucune transaction pour ce client.
      </div>
    )
  }
  return (
    <div style={{ background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 14, overflow: 'hidden' }}>
      {transactions.map((tx, i) => (
        <div key={tx.id ?? i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          borderBottom: i < transactions.length - 1 ? '1px solid var(--ls-border)' : 'none',
        }}>
          <div style={{ width: 90, fontSize: 11, color: 'var(--ls-text-hint)', flexShrink: 0 }}>
            {formatDateLocal(tx.date)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ls-text)' }}>{tx.productName}</div>
            <div style={{ fontSize: 10, color: 'var(--ls-text-hint)' }}>
              {getPvTypeLabel(tx.type)} · Qté {tx.quantity}
            </div>
          </div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: 'var(--ls-gold)', flexShrink: 0 }}>
            {tx.pv?.toFixed(2)} PV
          </div>
        </div>
      ))}
    </div>
  )
}
