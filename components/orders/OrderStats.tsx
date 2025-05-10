'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package2, Clock4, CheckCircle2, XCircle } from 'lucide-react';

interface OrderStatsProps {
  stats: {
    total: number;
    statusCounts: Record<string, number>;
  };
}

const STATUS_ICONS = {
  '대기': Clock4,
  '진행중': Package2,
  '완료': CheckCircle2,
  '취소': XCircle
} as const;

const STATUS_COLORS = {
  '대기': 'text-yellow-600',
  '진행중': 'text-blue-600',
  '완료': 'text-green-600',
  '취소': 'text-gray-600'
} as const;

export default function OrderStats({ stats }: OrderStatsProps) {
  const getStatusIcon = (status: keyof typeof STATUS_ICONS) => {
    const Icon = STATUS_ICONS[status];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const getStatusColor = (status: keyof typeof STATUS_COLORS) => {
    return STATUS_COLORS[status] || 'text-gray-600';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">총 발주</CardTitle>
          <Package2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">
            전체 발주 건수
          </p>
        </CardContent>
      </Card>

      {Object.entries(stats.statusCounts).map(([status, count]) => (
        <Card key={status}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {status}
            </CardTitle>
            <div className={getStatusColor(status as keyof typeof STATUS_COLORS)}>
              {getStatusIcon(status as keyof typeof STATUS_ICONS)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{count}</div>
            <p className="text-xs text-muted-foreground">
              {((count / stats.total) * 100).toFixed(1)}% 비율
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 