import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';

let registered = false;

export function ensureChartsRegistered() {
  if (registered) return;
  ChartJS.register(
    Title,
    Tooltip,
    Legend,
    Filler,
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
  );
  registered = true;
}

const muted = '#94a3b8';
const grid = 'rgba(255, 255, 255, 0.08)';

/** Dark theme defaults shared by admin charts. */
export function darkChartOptions(overrides: ChartOptions = {}): ChartOptions {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: muted, boxWidth: 12, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: '#1f1f1f',
        titleColor: '#ececec',
        bodyColor: '#b4b4b4',
        borderColor: grid,
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: muted, font: { size: 10 }, maxRotation: 0 },
        grid: { color: grid },
        border: { display: false },
      },
      y: {
        ticks: { color: muted, font: { size: 10 } },
        grid: { color: grid },
        border: { display: false },
      },
    },
    ...overrides,
  };
}
