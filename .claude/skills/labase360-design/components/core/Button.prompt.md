The La Base 360 button — teal primary (the app's structural color); use `variant="cta"` for the Breakfast Club warm-gradient pill. Lime is never a button fill.

```jsx
<Button variant="primary" onClick={save}>Enregistrer</Button>
<Button variant="cta" size="lg">Réserver ma place</Button>
<Button variant="outline" iconLeft={<Icon name="plus" size={16} />}>Ajouter</Button>
```

Variants: `primary` · `secondary` · `ghost` · `outline` · `danger` · `cta`. Sizes: `sm` · `md` · `lg`. `pill` forces 999px radius (CTA is always a pill). Hover brightens; press shrinks slightly.
