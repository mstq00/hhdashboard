'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface OrderItem {
  id: string;
  발주코드: string;
  발주명: string;
  발주차수: string;
  발주일: string;
  발주수량: number;
  단가: number;
  발주액: number;
  선금송금액: number;
  선금환율: number;
  잔금송금액: number;
  잔금환율: number;
  입항후비용: number;
  원화발주액: number;
  상태: string;
  입항예정일: string;
  최종입고일: string;
}

interface OrderTrendsProps {
  orders: OrderItem[];
}

export default function OrderTrends({ orders }: OrderTrendsProps) {
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, { amount: number; quantity: number; count: number }>();
    
    orders.forEach(order => {
      const date = new Date(order.발주일);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, { amount: 0, quantity: 0, count: 0 });
      }
      
      const data = monthlyMap.get(monthKey)!;
      data.amount += order.원화발주액 || order.발주액;
      data.quantity += order.발주수량;
      data.count += 1;
    });

    const sortedMonths = Array.from(monthlyMap.keys()).sort();
    
    return {
      labels: sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        return `${year}년 ${monthNum}월`;
      }),
      amounts: sortedMonths.map(month => monthlyMap.get(month)!.amount),
      quantities: sortedMonths.map(month => monthlyMap.get(month)!.quantity),
      counts: sortedMonths.map(month => monthlyMap.get(month)!.count)
    };
  }, [orders]);

  const statusData = useMemo(() => {
    const statusMap = new Map<string, { count: number; amount: number }>();
    
    orders.forEach(order => {
      if (!statusMap.has(order.상태)) {
        statusMap.set(order.상태, { count: 0, amount: 0 });
      }
      
      const data = statusMap.get(order.상태)!;
      data.count += 1;
      data.amount += order.원화발주액 || order.발주액;
    });

    return {
      labels: Array.from(statusMap.keys()),
      counts: Array.from(statusMap.values()).map(data => data.count),
      amounts: Array.from(statusMap.values()).map(data => data.amount)
    };
  }, [orders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0
    }).format(value);
  };

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: '발주액 (원)'
        },
        ticks: {
          callback: (value) => formatCurrency(value as number)
        }
      },
      y2: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: '발주수량 (개)'
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: '월별 발주 동향'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            if (label.includes('발주액')) {
              return `${label}: ${formatCurrency(value)}`;
            }
            return `${label}: ${value.toLocaleString()}개`;
          }
        }
      }
    }
  };

  const lineData: ChartData<'line'> = {
    labels: monthlyData.labels,
    datasets: [
      {
        label: '월별 발주액',
        data: monthlyData.amounts,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        yAxisID: 'y1',
      },
      {
        label: '월별 발주수량',
        data: monthlyData.quantities,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        yAxisID: 'y2',
      },
    ],
  };

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '건수'
        }
      }
    },
    plugins: {
      title: {
        display: true,
        text: '상태별 발주 현황'
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toLocaleString()}건`;
          }
        }
      }
    }
  };

  const barData: ChartData<'bar'> = {
    labels: statusData.labels,
    datasets: [
      {
        label: '발주 건수',
        data: statusData.counts,
        backgroundColor: [
          'rgba(255, 206, 86, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(201, 203, 207, 0.5)'
        ],
        borderColor: [
          'rgb(255, 206, 86)',
          'rgb(54, 162, 235)',
          'rgb(75, 192, 192)',
          'rgb(201, 203, 207)'
        ],
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>발주 동향 분석</CardTitle>
        </CardHeader>
        <CardContent>
          <Line options={lineOptions} data={lineData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>상태별 발주 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Bar options={barOptions} data={barData} />
        </CardContent>
      </Card>
    </div>
  );
} 