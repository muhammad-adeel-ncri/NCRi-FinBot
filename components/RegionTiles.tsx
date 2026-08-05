import { REGION_COLORS, REGIONS } from '@/lib/colors';

interface RegionSummary {
  region: string;
  totalGross: number;
  totalEmployees: number;
}

interface Props {
  data: RegionSummary[];
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

export default function RegionTiles({ data }: Props) {
  return (
    <div className="region-tiles">
      {REGIONS.map((region) => {
        const summary = data.find((d) => d.region === region);
        return (
          <div key={region} className="region-tile">
            <div className="region-tile-bar" style={{ background: REGION_COLORS[region] }} />
            <div className="region-tile-body">
              <div className="region-tile-name">
                <span className="region-dot" style={{ background: REGION_COLORS[region] }} />
                {region}
              </div>
              <div className="region-tile-gross">
                {summary ? fmtCompact(summary.totalGross) : '—'}
              </div>
              <div className="region-tile-meta">
                {summary ? `${summary.totalEmployees} employees` : 'No data'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
