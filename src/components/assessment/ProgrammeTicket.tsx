// ProgrammeTicket V2 PREMIUM SANDBOX (2026-04-29).
// Refonte graphique du panier sticky droit dans le step Programme.
// Largeur identique (1fr de la grid 2/1), mais identite visuelle premium :
//   - Header gradient gold "PANIER" + counter produits + couronne
//   - Item programme avec avatar gold + emoji
//   - Items addons avec avatar gold tonal + emoji contextual
//   - Animations fade-in sur ajout
//   - Total grand format Syne 28px gradient + ligne sub PV
//   - Theme-aware : var(--ls-*) uniquement, fonctionne light + dark
//
// La logique reste identique : program.price + sum(addOns price * qty).

import type { ProgramChoice } from "../../data/programs";

export interface TicketAddOn {
  id: string;
  name: string;
  price: number;
  pv: number;
  quantity: number;
}

interface Props {
  program: ProgramChoice;
  addOns: TicketAddOn[];
  /** Callback bouton "+ Catalogue" (ouvre la sandbox catalogue complet) */
  onOpenCatalog?: () => void;
  /** Callback supprimer un addon du panier (V3.3 — 2026-04-29) */
  onRemoveAddOn?: (productId: string) => void;
}

/**
 * Mapping emoji -> nom produit (memes regles que SelectableProductCard).
 * Duplique ici pour autonomie du composant.
 */
const PRODUCT_EMOJI_MAP: Array<{ match: RegExp; emoji: string }> = [
  { match: /formula\s*1|f1\b|boisson nutritionnelle/i, emoji: "🥛" },
  { match: /melange.*proteine|formula\s*3|ppp\b/i, emoji: "💪" },
  { match: /formula\s*2|multivit/i, emoji: "💊" },
  { match: /aloe/i, emoji: "🌿" },
  { match: /\bthe\b|tea\b/i, emoji: "🍵" },
  { match: /hydrate/i, emoji: "💧" },
  { match: /calcium|xtra[-\s]?cal/i, emoji: "🦴" },
  { match: /collag/i, emoji: "✨" },
  { match: /liftoff/i, emoji: "⚡" },
  { match: /cr7|n-r-g|nrg/i, emoji: "🏆" },
  { match: /cell.*activ/i, emoji: "🧬" },
  { match: /niteworks/i, emoji: "🌙" },
  { match: /omega|fish/i, emoji: "🐟" },
  { match: /iron|roseguard/i, emoji: "🛡️" },
  { match: /skin|beaut/i, emoji: "💎" },
  { match: /snack|barre|bar\b/i, emoji: "🍫" },
  { match: /soup|soupe/i, emoji: "🍲" },
  { match: /fibre|cell.*u.*loss/i, emoji: "🌾" },
  { match: /shaker|gourde/i, emoji: "🥤" },
  { match: /creatine/i, emoji: "💥" },
];

function getEmoji(name: string): string {
  for (const { match, emoji } of PRODUCT_EMOJI_MAP) {
    if (match.test(name)) return emoji;
  }
  return "💊";
}

export function ProgrammeTicket({ program, addOns, onOpenCatalog, onRemoveAddOn }: Props) {
  const addOnsTotal = addOns.reduce((sum, a) => sum + a.price * a.quantity, 0);
  const addOnsPv = addOns.reduce((sum, a) => sum + a.pv * a.quantity, 0);
  const total = program.price + addOnsTotal;
  const totalItems = 1 + addOns.reduce((s, a) => s + a.quantity, 0);

  return (
    <>
      <style>{`
        @keyframes ls-ticket-shine {
          0%, 100% { transform: translateX(-30%); opacity: 0; }
          50%      { transform: translateX(180%); opacity: 0.45; }
        }
        @keyframes ls-ticket-mesh {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-8px, 4px) scale(1.04); }
          100% { transform: translate(6px, -2px) scale(1); }
        }
        @keyframes ls-ticket-item-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ls-ticket-item-anim {
          animation: ls-ticket-item-in 0.32s cubic-bezier(0.22, 1, 0.36, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-ticket-shine, .ls-ticket-mesh, .ls-ticket-item-anim { animation: none !important; }
        }
        /* Sur mobile/tablet : pas de hover, le bouton remove reste toujours visible */
        @media (hover: none), (max-width: 768px) {
          .ls-ticket-row .ls-ticket-remove { opacity: 1 !important; }
        }
      `}</style>
      <aside
        aria-label="Panier"
        style={{
          background: "var(--ls-surface)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
          borderRadius: 20,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans', sans-serif",
          color: "var(--ls-text)",
          overflow: "hidden",
          boxShadow:
            "0 1px 0 0 rgba(239,159,39,0.10), 0 12px 32px -16px rgba(186,117,23,0.30)",
        }}
      >
        {/* HEADER GRADIENT GOLD */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: "16px 18px",
            background:
              "linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)",
            color: "#FFFFFF",
          }}
        >
          {/* Mesh anim subtil */}
          <div
            className="ls-ticket-mesh"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: -30,
              opacity: 0.6,
              pointerEvents: "none",
              background:
                "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.20) 0%, transparent 45%), radial-gradient(circle at 100% 100%, rgba(0,0,0,0.18) 0%, transparent 50%)",
              animation: "ls-ticket-mesh 18s ease-in-out infinite alternate",
            }}
          />
          {/* Shine sweep */}
          <div
            className="ls-ticket-shine"
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "30%",
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.40), transparent)",
              animation: "ls-ticket-shine 6s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.90)",
                  marginBottom: 2,
                }}
              >
                🛒 Ton panier
              </div>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: 19,
                  letterSpacing: "-0.02em",
                  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                }}
              >
                {totalItems} produit{totalItems > 1 ? "s" : ""}
              </div>
            </div>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30)",
              }}
            >
              👑
            </div>
          </div>
        </div>

        {/* CORPS — items */}
        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Programme = item premium */}
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: "var(--ls-gold)",
                fontWeight: 700,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--ls-gold)", boxShadow: "0 0 6px rgba(239,159,39,0.50)" }} />
              Programme
            </div>
            <div
              className="ls-ticket-item-anim"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 10%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)",
                borderRadius: 12,
                border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                  boxShadow: "0 3px 8px -3px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
                }}
              >
                ⭐
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--ls-text)",
                    letterSpacing: "-0.01em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {program.title}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--ls-text-muted)",
                    marginTop: 1,
                  }}
                >
                  Programme cœur
                </div>
              </div>
              <div
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "var(--ls-gold)",
                  letterSpacing: "-0.02em",
                  flexShrink: 0,
                }}
              >
                {program.price}€
              </div>
            </div>
          </div>

          {/* Ajouts */}
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: "var(--ls-teal)",
                fontWeight: 700,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--ls-teal)", boxShadow: "0 0 6px rgba(45,212,191,0.50)" }} />
              Ajouts {addOns.length > 0 ? `(${addOns.length})` : ""}
            </div>
            {addOns.length === 0 ? (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px dashed var(--ls-border)",
                  background: "var(--ls-surface2)",
                  fontSize: 11.5,
                  color: "var(--ls-text-hint)",
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                Aucun ajout retenu pour l&apos;instant
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {addOns.map((addOn) => {
                  const emoji = getEmoji(addOn.name);
                  return (
                    <div
                      key={addOn.id}
                      className="ls-ticket-item-anim ls-ticket-row"
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        background: "var(--ls-surface2)",
                        borderRadius: 10,
                        border: "0.5px solid var(--ls-border)",
                        transition: "border-color 0.15s ease, background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))";
                        const rm = e.currentTarget.querySelector<HTMLButtonElement>("[data-ls-remove]");
                        if (rm) rm.style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--ls-border)";
                        const rm = e.currentTarget.querySelector<HTMLButtonElement>("[data-ls-remove]");
                        if (rm) rm.style.opacity = "0";
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background:
                            "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 18%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          flexShrink: 0,
                          border: "0.5px solid color-mix(in srgb, var(--ls-teal) 25%, transparent)",
                        }}
                      >
                        {emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--ls-text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: "DM Sans, sans-serif",
                          }}
                        >
                          {addOn.name}
                        </div>
                        {addOn.quantity > 1 && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: "var(--ls-text-muted)",
                              marginTop: 1,
                            }}
                          >
                            × {addOn.quantity}
                          </div>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: "Syne, serif",
                          fontWeight: 700,
                          fontSize: 13,
                          color: "var(--ls-text)",
                          letterSpacing: "-0.01em",
                          flexShrink: 0,
                        }}
                      >
                        {(addOn.price * addOn.quantity).toFixed(2)}€
                      </div>
                      {/* Remove button — visible au hover desktop, toujours sur mobile */}
                      {onRemoveAddOn && (
                        <button
                          type="button"
                          data-ls-remove
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onRemoveAddOn(addOn.id);
                          }}
                          aria-label={`Retirer ${addOn.name} du panier`}
                          className="ls-ticket-remove"
                          style={{
                            flexShrink: 0,
                            width: 24,
                            height: 24,
                            borderRadius: 999,
                            border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
                            background: "color-mix(in srgb, var(--ls-coral) 12%, var(--ls-surface))",
                            color: "var(--ls-coral)",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0,
                            transition: "opacity 0.15s ease, transform 0.15s ease, background 0.15s ease",
                            padding: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.1)";
                            e.currentTarget.style.background = "var(--ls-coral)";
                            e.currentTarget.style.color = "#FFFFFF";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "none";
                            e.currentTarget.style.background = "color-mix(in srgb, var(--ls-coral) 12%, var(--ls-surface))";
                            e.currentTarget.style.color = "var(--ls-coral)";
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* TOTAL */}
        <div
          style={{
            padding: "14px 18px 16px",
            borderTop: "0.5px dashed var(--ls-border)",
            background:
              "linear-gradient(180deg, var(--ls-surface) 0%, color-mix(in srgb, var(--ls-gold) 4%, var(--ls-surface)) 100%)",
          }}
        >
          {/* Sub-totals */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif" }}>
              Programme
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
              {program.price.toFixed(2)}€
            </span>
          </div>
          {addOns.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif" }}>
                Ajouts × {addOns.length}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
                {addOnsTotal.toFixed(2)}€
              </span>
            </div>
          )}

          {/* Trait separateur subtil */}
          <div
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, transparent 0%, var(--ls-border) 30%, var(--ls-border) 70%, transparent 100%)",
              margin: "8px 0 10px",
            }}
          />

          {/* Total big */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                fontWeight: 800,
                color: "var(--ls-gold)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              Total
            </div>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "-0.03em",
                color: "var(--ls-text)",
              }}
            >
              {total.toFixed(2)}
              <span style={{ color: "var(--ls-gold)", fontSize: 22, marginLeft: 1 }}>€</span>
            </div>
          </div>

          {/* PV info ligne sub */}
          {addOnsPv > 0 && (
            <div
              style={{
                fontSize: 10.5,
                color: "var(--ls-text-hint)",
                marginTop: 6,
                fontFamily: "DM Sans, sans-serif",
                textAlign: "right",
              }}
            >
              + {addOnsPv.toFixed(1)} PV ajouts
            </div>
          )}

          {/* CTA "+ Ajouter du catalogue" — sandbox produits complete */}
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              style={{
                marginTop: 14,
                width: "100%",
                padding: "11px 16px",
                borderRadius: 12,
                border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 50%, transparent)",
                background: "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))",
                color: "var(--ls-gold)",
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: "DM Sans, sans-serif",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                transition: "transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                letterSpacing: "-0.005em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.background = "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface))";
                e.currentTarget.style.borderColor = "var(--ls-gold)";
                e.currentTarget.style.boxShadow = "0 4px 12px -4px rgba(239,159,39,0.30)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.background = "color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface))";
                e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-gold) 50%, transparent)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{ fontSize: 14 }}>🛍️</span>
              Ajouter un produit du catalogue
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
