import { mockWorldState } from '../contracts/mocks';

/** Placeholder. The lead wires the three screens together here once workers deliver components. */
export function App() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: 24 }}>
      <h1>AI 2126</h1>
      <p>Year {mockWorldState.year}. Scaffold only; screens are built by the workers.</p>
    </main>
  );
}
