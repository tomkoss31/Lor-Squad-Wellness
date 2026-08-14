Surface container. `app` = green surface + hairline border (no heavy shadow); `club` = white, 22px radius, 5px top accent rule + soft green shadow.

```jsx
<Card tone="app">…</Card>
<Card tone="club" accent="var(--bc-orange)">…</Card>
<Card tone="app" accent="var(--ls-coral)">Alerte</Card>
```

`tone`: app · light · club. `accent` draws a rule (top on club, left on app).
