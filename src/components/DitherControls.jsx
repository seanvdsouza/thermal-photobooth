import { DEFAULT_LOOK, LOOK_OPTIONS } from '../../shared/photo-look.js';

export default function DitherControls({ look, onChange, disabled = false }) {
  function update(patch) { onChange({ ...look, ...patch }); }
  return (
    <fieldset className="dither-controls" aria-label="Effect" disabled={disabled}>
      <label className="look-label" htmlFor="dithering-method">Effect</label>
      <select id="dithering-method" value={look.method} onChange={event => update({ method: event.target.value })}>
        {LOOK_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      {look.method === 'floyd-steinberg' && <div className="floyd-controls">
        <div className="slider-control">
          <div className="slider-label"><label htmlFor="diffusion-strength">Diffusion strength</label><output htmlFor="diffusion-strength">{Math.round(look.strength * 100)}%</output></div>
          <input id="diffusion-strength" type="range" min="0" max="100" step="5" value={Math.round(look.strength * 100)} onChange={event => update({ strength: Number(event.target.value) / 100 })} />
          <p className="control-hint">Lower values give broader light and dark areas. Try 75%.</p>
        </div>
        <div className="slider-control">
          <div className="slider-label"><label htmlFor="dither-threshold">Black threshold</label><output htmlFor="dither-threshold">{look.threshold}</output></div>
          <input id="dither-threshold" type="range" min="64" max="192" value={look.threshold} onChange={event => update({ threshold: Number(event.target.value) })} />
          <p className="control-hint">Higher values favour black; 128 is the standard midpoint.</p>
        </div>
        <label className="scan-toggle"><input type="checkbox" checked={look.serpentine} onChange={event => update({ serpentine: event.target.checked })} />Alternate scan direction each row</label>
        <button type="button" className="text-button" onClick={() => update({ strength: DEFAULT_LOOK.strength, threshold: DEFAULT_LOOK.threshold, serpentine: DEFAULT_LOOK.serpentine })}>Restore standard Floyd–Steinberg</button>
      </div>}
    </fieldset>
  );
}
