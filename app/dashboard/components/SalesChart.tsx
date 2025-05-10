'use client';

import { ko } from 'date-fns/locale';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TimeUnit,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
);

interface SalesChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  };
  fromDate: Date;
  toDate: Date;
  periodType: 'daily' | 'weekly' | 'monthly';
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
};

export function SalesChart({ data, fromDate, toDate, periodType }: SalesChartProps) {
  const getTimeUnit = (type: 'daily' | 'weekly' | 'monthly'): TimeUnit => {
    switch (type) {
      case 'daily':
        return 'day';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      default:
        return 'day';
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        stacked: true,
        min: fromDate.toISOString().split('T')[0],
        max: toDate.toISOString().split('T')[0],
        type: 'time' as const,
        time: {
          unit: getTimeUnit(periodType),
          displayFormats: {
            day: 'MM/dd',
            week: 'yyyy/MM/dd',
            month: 'yyyy/MM'
          },
          tooltipFormat: periodType === 'daily' ? 'MM/dd' : 
                        periodType === 'weekly' ? 'yyyy/MM/dd' : 
                        'yyyy/MM',
        },
        adapters: {
          date: {
            locale: ko,
          },
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value),
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: false,
      },
    },
  };

  return (
    <div className="w-full h-[400px]">
      <Bar options={options} data={data} />
    </div>
  );
} 