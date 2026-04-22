import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { formatDate, getLatestAssessment } from "../lib/calculations";
import { getInitials } from "../lib/utils/getInitials";
import type { Client, RecommendationLead } from "../types/domain";

type Tab = "pending" | "contacted";

interface RecoClientRow {
  clientId: string;
  clientName: string;
  distributorId: string;
  distributorName: string;
  programTitle: string;
  assessmentDate: string;
  assessmentId: string;
  recommendations: RecommendationLead[];
  contacted: boolean;
  phone: string;
  email: string;
}

function buildRecoRows(clients: Client[]): RecoClientRow[] {
  return clients
    .map((client) => {
      const latest = client.assessments?.length ? getLatestAssessment(client) : null;
      if (!latest) return null;
      const recos = latest.questionnaire?.recommendations ?? [];
      if (recos.length === 0 && !latest.questionnaire?.recommendationsContacted) return null;
      return {
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        distributorId: client.distributorId,
        distributorName: client.distributorName,
        programTitle: latest.programTitle ?? client.currentProgram,
        assessmentDate: latest.date,
        assessmentId: latest.id,
        recommendations: recos.filter(r => r.name.trim()),
        contacted: latest.questionnaire?.recommendationsContacted ?? false,
        phone: client.phone,
        email: client.email,
      };
    })
    .filter((row): row is RecoClientRow => row !== null && (row.recommendations.length > 0 || row.contacted))
    .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
}

export function RecommendationsPage() {
  const { currentUser, visibleClients, updateAssessment } = useAppContext();
  const [tab, setTab] = useState<Tab>("pending");
  const [marking, setMarking] = useState<Set<string>>(new Set());

  const rows = buildRecoRows(visibleClients);
  const pending = rows.filter(r => !r.contacted);
  const contacted = rows.filter(r => r.contacted);
  const active = tab === "pending" ? pending : contacted;

  async function markContacted(row: RecoClientRow) {
    setMarking(prev => new Set(prev).add(row.assessmentId));
    try {
      const client = visibleClients.find(c => c.id === row.clientId);
      const assessment = client?.assessments.find(a => a.id === row.assessmentId);
      if (assessment) {
        const updated = {
          ...assessment,
          questionnaire: {
            ...assessment.questionnaire,
            recommendationsContacted: true,
            recommendations: [],
          },
        };
        await updateAssessment(row.clientId, updated);
      }
    } finally {
      setMarking(prev => { const next = new Set(prev); next.delete(row.assessmentId); return next; });
    }
  }

  return (
    <div className="space-y-5">
      <PageHeading
        eyebrow="Recommandations"
        title="Suivi des recommandations"
        description="Les contacts notés par tes clients — à reprendre ou déjà traités."
      />

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <p className="eyebrow-label">Dossiers</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--ls-text)' }}>{rows.length}</p>
        </Card>
        <Card>
          <p className="eyebrow-label">À contacter</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--ls-coral)' }}>{pending.reduce((s, r) => s + r.recommendations.length, 0)}</p>
        </Card>
        <Card>
          <p className="eyebrow-label">Contactées</p>
          <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--ls-teal)' }}>{contacted.length}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, background: 'var(--ls-surface)', border: '1px solid var(--ls-border)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {([
          { key: 'pending' as Tab, label: 'À contacter', count: pending.length, color: 'var(--ls-coral)' },
          { key: 'contacted' as Tab, label: 'Contactées', count: contacted.length, color: 'var(--ls-teal)' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontFamily: 'DM Sans, sans-serif',
              fontWeight: tab === t.key ? 600 : 400,
              background: tab === t.key ? 'var(--ls-surface2)' : 'transparent',
              color: tab === t.key ? 'var(--ls-text)' : 'var(--ls-text-muted)',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: `${t.color}18`, color: t.color, fontWeight: 700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Liste */}
      {active.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>{tab === 'pending' ? '✅' : '👥'}</div>
            <div style={{ fontSize: 14, color: 'var(--ls-text-muted)' }}>
              {tab === 'pending' ? 'Toutes les recommandations sont traitées !' : 'Aucune recommandation contactée pour l\'instant.'}
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {active.map(row => {
            const isMarking = marking.has(row.assessmentId);
            const cleanPhone = row.phone.replace(/[^\d+]/g, '');
            const pre = encodeURIComponent(`Bonjour, suite au bilan de ${row.clientName} chez Lor'Squad Wellness.`);

            return (
              <Card key={`${row.clientId}-${row.assessmentId}`}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: row.contacted ? 'rgba(45,212,191,0.1)' : 'rgba(220,38,38,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, fontFamily: 'Syne, sans-serif',
                    color: row.contacted ? 'var(--ls-teal)' : 'var(--ls-coral)',
                  }}>
                    {getInitials(row.clientName)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <Link to={`/clients/${row.clientId}`} style={{ fontSize: 15, fontWeight: 600, color: 'var(--ls-text)', textDecoration: 'none' }}>
                        {row.clientName}
                      </Link>
                      <StatusBadge label={row.contacted ? "Contactées" : "À contacter"} tone={row.contacted ? "green" : "red"} />
                      <span style={{ fontSize: 11, color: 'var(--ls-text-hint)', marginLeft: 'auto' }}>
                        Bilan du {formatDate(row.assessmentDate)}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--ls-text-muted)', marginBottom: 8 }}>
                      {row.programTitle}
                      {currentUser?.role === 'admin' ? ` · Coach : ${row.distributorName}` : ''}
                    </div>

                    {/* Recos list */}
                    {row.recommendations.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                        {row.recommendations.map((reco, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                            borderRadius: 10, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)',
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ls-text)', flex: 1 }}>
                              {reco.name}
                            </span>
                            {reco.contact && (
                              <span style={{ fontSize: 11, color: 'var(--ls-text-hint)' }}>
                                {reco.contact}
                              </span>
                            )}
                            {/* Contact links */}
                            {reco.contact && /[\d+]/.test(reco.contact) && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <a href={`https://wa.me/${reco.contact.replace(/[^\d+]/g, '')}?text=${pre}`} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 9, padding: '3px 7px', borderRadius: 6, background: 'rgba(37,211,102,0.1)', color: '#16A34A', textDecoration: 'none', fontWeight: 600 }}>
                                  WA
                                </a>
                                <a href={`sms:${reco.contact.replace(/[^\d+]/g, '')}?body=${pre}`}
                                  style={{ fontSize: 9, padding: '3px 7px', borderRadius: 6, background: 'var(--ls-surface2)', color: 'var(--ls-text-muted)', textDecoration: 'none' }}>
                                  SMS
                                </a>
                                <a href={`tel:${reco.contact.replace(/[^\d+]/g, '')}`}
                                  style={{ fontSize: 9, padding: '3px 7px', borderRadius: 6, background: 'rgba(201,168,76,0.08)', color: 'var(--ls-gold)', textDecoration: 'none', fontWeight: 600 }}>
                                  📞
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Contact client */}
                      {cleanPhone.length >= 6 && (
                        <>
                          <a href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Bonjour ${row.clientName.split(' ')[0]}, des nouvelles de ton suivi Lor'Squad Wellness ?`)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(37,211,102,0.1)', color: '#16A34A', textDecoration: 'none', fontWeight: 600 }}>
                            WhatsApp client
                          </a>
                          <a href={`tel:${cleanPhone}`}
                            style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'rgba(201,168,76,0.08)', color: 'var(--ls-gold)', textDecoration: 'none', fontWeight: 600 }}>
                            Appeler
                          </a>
                        </>
                      )}

                      <Link to={`/clients/${row.clientId}`}
                        style={{ fontSize: 10, padding: '5px 10px', borderRadius: 7, background: 'var(--ls-surface2)', border: '1px solid var(--ls-border)', color: 'var(--ls-text-muted)', textDecoration: 'none' }}>
                        Fiche
                      </Link>

                      {/* Marquer contacté */}
                      {!row.contacted && (
                        <button onClick={() => void markContacted(row)} disabled={isMarking}
                          style={{
                            fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none',
                            background: isMarking ? 'var(--ls-surface2)' : 'var(--ls-teal)',
                            color: isMarking ? 'var(--ls-text-muted)' : '#fff',
                            cursor: isMarking ? 'wait' : 'pointer',
                            fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                          }}>
                          {isMarking ? '...' : '✓ Contacté'}
                        </button>
                      )}

                      {/* Supprimer les recos */}
                      <button onClick={() => void markContacted(row)} disabled={isMarking}
                        style={{
                          fontSize: 11, padding: '5px 14px', borderRadius: 8, border: 'none',
                          background: 'rgba(220,38,38,0.06)',
                          color: 'var(--ls-coral)',
                          cursor: isMarking ? 'wait' : 'pointer',
                          fontFamily: 'DM Sans, sans-serif', marginLeft: 'auto',
                        }}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
