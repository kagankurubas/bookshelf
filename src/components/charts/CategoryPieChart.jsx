import { useState } from 'react';
import './CategoryPieChart.css';

const RADIUS = 62;
const STROKE = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Kategoriye göre dağılımı gösteren donut grafik + lejant. data:
// [{ category, value, color }] - zaten foldCategoriesForChart ile
// renk-körlüğü güvenli 8 renk + "Diğer"e katlanmış olmalı. Dilim rengi
// tek başına anlam taşımasın diye her dilimin yanında lejantta isim ve
// sayı da yazıyor (identity never color-alone).
function CategoryPieChart({ data, total, totalLabel, valueSuffix = '' }) {
  const [hovered, setHovered] = useState(null);
  const sum = data.reduce((acc, d) => acc + d.value, 0);

  const segments = data.reduce((acc, d) => {
    const fraction = sum > 0 ? d.value / sum : 0;
    const length = fraction * CIRCUMFERENCE;
    const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    acc.push({ ...d, length, offset });
    return acc;
  }, []);

  return (
    <div className="category-pie-wrap">
      <div className="category-pie-svg-wrap">
        <svg viewBox="0 0 160 160" className="category-pie-svg">
          <circle cx="80" cy="80" r={RADIUS} fill="none" stroke="var(--surface-alt)" strokeWidth={STROKE} />
          {segments.map((seg) => (
            <circle
              key={seg.category}
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={hovered === seg.category ? STROKE + 4 : STROKE}
              strokeDasharray={`${seg.length} ${CIRCUMFERENCE - seg.length}`}
              strokeDashoffset={-seg.offset}
              transform="rotate(-90 80 80)"
              opacity={hovered && hovered !== seg.category ? 0.45 : 1}
              className="category-pie-segment"
              onMouseEnter={() => setHovered(seg.category)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        <div className="category-pie-center">
          <div className="category-pie-center-value">{total.toLocaleString()}</div>
          <div className="category-pie-center-label">{totalLabel}</div>
        </div>
      </div>

      <div className="category-pie-legend">
        {segments.map((seg) => (
          <div
            key={seg.category}
            className={`category-pie-legend-row ${hovered === seg.category ? 'hovered' : ''}`}
            onMouseEnter={() => setHovered(seg.category)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="category-pie-swatch" style={{ background: seg.color }}></span>
            <span className="category-pie-legend-label">{seg.label}</span>
            <span className="category-pie-legend-value">{seg.value.toLocaleString()}{valueSuffix ? ` ${valueSuffix}` : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryPieChart;
