# Testing Guide

Ce projet utilise **Vitest** pour les tests unitaires et d'intégration, avec **React Testing Library** pour tester les composants React.

## Scripts de Test

```bash
# Lancer les tests en mode watch (recommandé pour le développement)
npm test

# Lancer les tests avec l'interface UI interactive
npm run test:ui

# Lancer les tests avec le rapport de couverture
npm run test:coverage

# Lancer les tests une seule fois (utile pour CI/CD)
npm run test -- --run
```

## Structure des Tests

Les tests sont organisés dans le dossier `__tests__/` :

```
__tests__/
├── components/          # Tests des composants React
│   ├── Button.test.tsx
│   └── Input.test.tsx
└── lib/                 # Tests des fonctions utilitaires
    └── auth.test.ts
```

## Exemples de Tests

### Test d'un Composant

```typescript
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import Button from "@/components/Button"

describe("Button Component", () => {
  it("renders button with text", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText("Click me")).toBeInTheDocument()
  })

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    await user.click(screen.getByText("Click me"))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### Test d'une Fonction

```typescript
import { describe, it, expect } from "vitest"
import { myFunction } from "@/lib/utils"

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(myFunction("input")).toBe("expected output")
  })
})
```

## Bonnes Pratiques

### 1. Nommer les Tests Clairement

```typescript
// ✅ Bon
it("displays error message when email is invalid", () => {})

// ❌ Mauvais
it("test 1", () => {})
```

### 2. Utiliser les Queries Appropriées

```typescript
// ✅ Préférer getByRole
screen.getByRole("button", { name: "Submit" })

// ✅ Pour les champs de formulaire
screen.getByLabelText("Email")

// ⚠️ Éviter getByTestId sauf si nécessaire
screen.getByTestId("custom-element")
```

### 3. Tester le Comportement Utilisateur

```typescript
// ✅ Bon - teste l'interaction utilisateur
const user = userEvent.setup()
await user.type(screen.getByLabelText("Email"), "test@example.com")
await user.click(screen.getByRole("button", { name: "Submit" }))

// ❌ Mauvais - teste les détails d'implémentation
fireEvent.change(input, { target: { value: "test@example.com" } })
```

### 4. Utiliser les Mocks Avec Parcimonie

```typescript
// ✅ Bon - mock les dépendances externes
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// ⚠️ Éviter de mocker trop de logique interne
```

### 5. Tests Isolés

```typescript
// ✅ Chaque test doit être indépendant
describe("Component", () => {
  it("test 1", () => {
    // Setup propre à ce test
  })

  it("test 2", () => {
    // Setup propre à ce test
  })
})
```

## Couverture de Code

La couverture de code minimale recommandée :
- **Composants UI** : 80%+ (focus sur les interactions principales)
- **Fonctions utilitaires** : 90%+ (logique critique)
- **API routes** : 70%+ (cas principaux + erreurs)

Pour voir le rapport de couverture :

```bash
npm run test:coverage
```

Le rapport sera généré dans `coverage/` et affiché dans le terminal.

## Tests des Composants Next.js

### Server Components

Les Server Components ne peuvent pas être testés directement avec React Testing Library. Testez plutôt :
- La logique qu'ils contiennent (extraite dans des fonctions)
- Les Client Components qu'ils utilisent

### Client Components

```typescript
"use client"

// Component à tester
export function MyComponent() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}

// Test
it("increments counter on click", async () => {
  const user = userEvent.setup()
  render(<MyComponent />)

  await user.click(screen.getByRole("button"))
  expect(screen.getByRole("button")).toHaveTextContent("1")
})
```

## Debugging des Tests

### Mode Debug

```bash
# Lancer un test spécifique en mode debug
npm test -- Button.test.tsx

# Utiliser l'UI interactive pour débugger
npm run test:ui
```

### Console Log dans les Tests

```typescript
import { screen, debug } from "@testing-library/react"

it("my test", () => {
  render(<MyComponent />)

  // Affiche le DOM actuel
  screen.debug()

  // Ou utiliser console.log
  console.log(screen.getByRole("button").textContent)
})
```

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro)
