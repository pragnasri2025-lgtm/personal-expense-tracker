import { useEffect, useRef } from 'react';
import {
  Chart,
  type ChartData,
  type ChartOptions,
  type ChartType,
  registerables,
} from 'chart.js';

Chart.register(...registerables);

interface ChartCanvasProps {
  type: ChartType;
  data: ChartData;
  options?: ChartOptions & Record<string, unknown>;
  heightClass?: string;
}

export function ChartCanvas({
  type,
  data,
  options,
  heightClass = 'h-72',
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvas, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, data, options]);

  return (
    <div className={`relative w-full ${heightClass}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export const BLUE_PALETTE = [
  '#619DC6', // Primary Steel Blue
  '#F4BAA3', // Warm Peach
  '#A6C8E2', // Powder Blue
  '#1D3E58', // Deep Steel Navy
  '#E2987A', // Terracotta Peach
  '#417DA6', // Medium Cerulean
  '#84B2D5', // Sky Mist
  '#D4B896', // Warm Sand
  '#2D587A', // Slate Blue
  '#C7DDF0', // Pale Ice Blue
];
