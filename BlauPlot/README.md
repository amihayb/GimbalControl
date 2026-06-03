# BlauPlot

A lightweight, dependency-free ES module library for signal visualization and analysis.
Built by **Blau Robotics** for use across internal projects.

**No npm. No bundler. No build step.** Import directly via `<script type="module">`.

Core plotting flow: `buildLine` → `buildLayout` → `plot`

Supports **line and scatter signals** on NxM subplot grids.
Add horizontal threshold lines with `yline`, vertical event markers with `xline`,
and click-to-pin data labels with `enableDataTips`.
Results can be summarised in a **pass/fail table** (`drawTable`).

---

## Requirements

- A modern browser (Chrome, Edge, Firefox, Safari)
- [Plotly.js](https://plotly.com/javascript/) loaded as a script tag (peer dependency)

---

## File Structure

```
BlauPlot/
├── index.js    ← re-exports parser, plot, table
├── plot.js     ← Plotly grid plotting utilities
├── table.js    ← pass/fail results tables
├── parser.js   ← CSV/text file parsing
└── math.js     ← optional signal processing utilities
```

---

## Quick Start

See [`example.html`](./example.html) for a fully working demo with file loading, a 2×2 subplot grid, limit lines, event markers, data tips, and a results table.

---

## API Reference

### `parser.js`

#### `parseFile(file, options?)`
Parse a `File` object (from drag-drop or `<input type="file">`).

```js
const { header, rows, fileName } = await parseFile(file, options);
```

| Option | Type | Description |
|---|---|---|
| `useLabels` | `boolean` | If true, use `labelsText` as header override |
| `labelsText` | `string` | Comma-separated column names |
| `defaultHeader` | `string[]` | Fallback header when none is detected |

Returns `{ header: string[], rows: object, fileName: string }`.
`rows` is `{ [colName]: number[] }`.

---

#### `parseText(text, options?)`
Parse a CSV string directly. Same options as `parseFile`.

```js
const { header, rows } = parseText(csvString);
```

---

### `plot.js`

#### `buildLine(signalName, rows, subplotIndex, xAxisName, options?)`

Build a single Plotly trace for one signal.

```js
const trace = buildLine('PITCH', rows, 1, 'TIME', {
  gridRows: 2, gridCols: 1,
  pattern: 'coupled',
  mode: 'lines',
  color: 'steelblue',
  name: 'Pitch angle',
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `gridRows` | `number` | `1` | Total grid rows |
| `gridCols` | `number` | `1` | Total grid cols |
| `pattern` | `'coupled'\|'independent'` | `'coupled'` | Axis sharing mode |
| `mode` | `string` | `'lines'` | Plotly mode |
| `color` | `string` | auto | Line/marker color |
| `name` | `string` | signalName | Legend label |

`subplotIndex` is 1-based, left-to-right then top-to-bottom:
```
Grid 2x2:  [1][2]
           [3][4]
```

---

#### `buildLayout(gridRows, gridCols, options?)`

Build a Plotly layout for an NxM subplot grid.

```js
const layout = buildLayout(2, 2, {
  pattern: 'coupled',
  roworder: 'bottom to top',
  theme: { bg: '#111', surface: '#222', border: '#444',
           textPrimary: '#eee', textSecondary: '#aaa' },
  height: 800,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `pattern` | `'coupled'\|'independent'` | `'coupled'` | Axis sharing |
| `roworder` | `string` | `'bottom to top'` | Row ordering |
| `theme` | `ThemeConfig` | `null` | Color config (see below) |
| `height` | `number` | `innerHeight - 80` | Plot height in px |

**ThemeConfig:**
```js
{
  bg:            string,  // paper/plot background
  surface:       string,  // legend background
  border:        string,  // grid/axis line color
  textPrimary:   string,  // title and legend text
  textSecondary: string,  // tick label color
}
```

---

#### `plot(container, traces, layout, config?)`

Render traces into a container. Calls `Plotly.newPlot`.

```js
plot('plot', traces, layout, { responsive: true, editable: true });
```

`container` can be a string ID or an `HTMLElement`.

---

#### `yline(container, value, options?)`

Add a horizontal threshold line to an already-rendered plot.
Uses `Plotly.relayout` — does not re-render traces.

```js
yline('plot', 60,  { label: 'Upper limit', yref: 'y2', color: 'orange' });
yline('plot', -60, { dash: 'dot', yref: 'y2' });
```

| Option | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `'red'` | Line color |
| `dash` | `'solid'\|'dash'\|'dot'` | `'dash'` | Line style |
| `label` | `string` | — | Annotation text (omit to skip) |
| `yref` | `string` | `'y'` | Plotly y-axis ref |
| `xref` | `string` | `'paper'` | Spans full width by default |

---

#### `xline(container, xValue, options?)`

Add a vertical event marker line to an already-rendered plot.

```js
xline('plot', rows.time[fireIndex], { label: 'Fire', color: 'orange' });
```

| Option | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `'forestgreen'` | Line color |
| `dash` | `'solid'\|'dash'\|'dot'` | `'dash'` | Line style |
| `label` | `string` | — | Annotation text |
| `xref` | `string` | `'x'` | Plotly x-axis ref |
| `yref` | `string` | `'paper'` | Spans full height by default |

---

#### `enableDataTips(container, options?)`

Enable click-to-annotate on a rendered plot.
Each click on a data point adds a persistent label.

```js
enableDataTips('plot', { fontSize: 11 });
```

| Option | Type | Default | Description |
|---|---|---|---|
| `fontSize` | `number` | `12` | Annotation font size |

---

### `table.js`

#### `drawTable(container, data, options?)`

Two-axis pass/fail table (e.g. Traverse + Elevation).
Values are green if `|value| <= successCriteria`, red otherwise.

```js
drawTable('results', [
  { parameter: 'Aim Error',    value1: 0.4, value2: 0.3, successCriteria: 0.5 },
  { parameter: 'Missile Eye',  value1: 3.1, value2: 2.8, successCriteria: 6.0 },
]);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `columnNames` | `string[2]` | `['Traverse', 'Elevation']` | Axis column headers |

---

#### `drawTableOneCol(container, data)`

Single-value pass/fail table.

```js
drawTableOneCol('results', [
  { parameter: 'Max Angle', value: 58.2, successCriteria: 60, successMethod: 'smaller' },
  { parameter: 'Min Range', value: 120,  successCriteria: 100, successMethod: 'bigger'  },
]);
```

`successMethod`:
- `'bigger'`  — pass if `value > successCriteria`
- `'smaller'` — pass if `value < successCriteria`

---

#### `clearTable(container)`

Remove all rows and headers from a table container.
Call before rendering a new scenario's results.

```js
clearTable('results');
```

---

### `math.js` (optional)

Import explicitly when needed:

```js
import { diff, integrate, filter, stats } from './BlauPlot/math.js';
```

All functions are **pure** — they return a new array, never modify input.

| Function | Signature | Description |
|---|---|---|
| `mult` | `(arr, factor)` | Multiply every element by a scalar |
| `removeFirst` | `(arr)` | Subtract `arr[0]` from all elements |
| `removeMean` | `(arr)` | Subtract mean from all elements |
| `diff` | `(arr, sampleTime=0.01)` | Numerical derivative (backward difference) |
| `integrate` | `(arr, sampleTime=0.01)` | Rectangular integration |
| `filter` | `(arr, cutoffHz, sampleTime=0.01)` | 2nd-order Butterworth LPF |
| `detrend` | `(arr)` | Remove linear trend |
| `smoothAngle` | `(arr)` | Unwrap 360° jumps (degrees) |
| `mean` | `(arr)` | Arithmetic mean |
| `std` | `(arr)` | Sample standard deviation |
| `stats` | `(arr)` | `{ mean, std, min, max, n }` |

---

## Data Shape

All modules share the same data format:

```js
// rows — the standard data container
rows = {
  TIME:  [0.0, 0.01, 0.02, ...],  // number[]
  PITCH: [0.1, 0.12, ...],
  // ...
}
```

---

## License

MIT — Blau Robotics

---

## Contact

We build Simple and effective tools for advanced control systemss

Amihay Blau  
Blau Robotics  

Email: amihay@blaurobotics.co.il  
LinkedIn: [linkedin.com/in/amihayblau](https://www.linkedin.com/in/amihayblau/)
