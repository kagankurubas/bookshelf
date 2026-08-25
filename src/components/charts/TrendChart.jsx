import { useState } from 'react';
import './TrendChart.css';

// Aylık ve yıllık okuma grafiklerinde ortak kullanılan tek serili
// bar/line grafik bileşeni. data: [{ label, tooltipLabel?, value }].
// type: 'bar' (varsayılan) | 'line'. Tek eksen - bir seferde tek metrik
// gösterilir (kitap ya da sayfa), üst bileşen hangi metriği bastığını
// data.value içinde seçer.
function TrendChart({ data, type = 'bar', color = 'var(--accent)', valueSuffix = '', height = 150 }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const values = data.map((d) => d.value);
  const maxValue = Math.max(1, ...values);

  const formatTooltip = (d) => {
    const label = d.tooltipLabel || d.label;
    const value = d.value.toLocaleString();
    return valueSuffix ? `${label} · ${value} ${valueSuffix}` : `${label} · ${value}`;
  };

  if (type === 'line') {
    const width = 100; // yüzde tabanlı viewBox, kap genişliğine göre ölçekleniyor
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const points = data.map((d, i) => {
      const x = data.length > 1 ? i * stepX : width / 2;
      const y = height - (d.value / maxValue) * (height - 12) - 4;
      return { x, y, d, i };
    });
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaD = `${pathD} L ${points[points.length - 1]?.x ?? 0} ${height} L ${points[0]?.x ?? 0} ${height} Z`;

    return (
      <div className="trend-chart trend-chart-line" style={{ height: `${height + 22}px` }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="trend-chart-svg">
          <path d={areaD} fill={color} opacity="0.1" stroke="none" />
          <path d={pathD} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          {points.map((p) => (
            <circle
              key={p.i}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === p.i ? 3.2 : 2.2}
              fill={hoveredIndex === p.i ? color : 'var(--surface)'}
              stroke={color}
              strokeWidth="1.4"
              vectorEffect="non-scaling-stroke"
              onMouseEnter={() => setHoveredIndex(p.i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>
        <div className="trend-chart-labels">
          {data.map((d, i) => (
            <span key={i} className={`trend-chart-label ${hoveredIndex === i ? 'active' : ''}`}>{d.label}</span>
          ))}
        </div>
        {hoveredIndex != null && (
          <div
            className="trend-chart-tooltip"
            style={{ left: `${points[hoveredIndex].x}%`, bottom: `${height - points[hoveredIndex].y + 26}px` }}
          >
            {formatTooltip(data[hoveredIndex])}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="trend-chart trend-chart-bar" style={{ height: `${height + 22}px` }}>
      {data.map((d, i) => {
        const heightPct = d.value === 0 ? 0 : Math.max(4, (d.value / maxValue) * 100);
        return (
          <div
            key={i}
            className="trend-chart-col"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {hoveredIndex === i && <div className="trend-chart-tooltip trend-chart-tooltip-bar">{formatTooltip(d)}</div>}
            <div className="trend-chart-track">
              <div
                className="trend-chart-bar-fill"
                style={{ height: `${heightPct}%`, background: color, opacity: hoveredIndex === i ? 1 : 0.85 }}
              ></div>
            </div>
            <span className="trend-chart-label">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default TrendChart;
