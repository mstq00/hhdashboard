'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package2, Clock4, CheckCircle2, XCircle } from 'lucide-react';

interface OrderFilterProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  stats: {
    total: number;
    statusCounts: Record<string, number>;
  };
}

const STATUS_CONFIG = {
  'all': {
    label: '전체',
    icon: Package2,
    className: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
  },
  '대기': {
    label: '대기',
    icon: Clock4,
    className: 'bg-yellow-100 text-yellow-900 hover:bg-yellow-200'
  },
  '진행중': {
    label: '진행중',
    icon: Package2,
    className: 'bg-blue-100 text-blue-900 hover:bg-blue-200'
  },
  '완료': {
    label: '완료',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-900 hover:bg-green-200'
  },
  '취소': {
    label: '취소',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
  }
} as const;

export default function OrderFilter({
  selectedStatus,
  onStatusChange,
  searchTerm,
  onSearchChange,
  stats
}: OrderFilterProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          const count = status === 'all' ? stats.total : (stats.statusCounts[status] || 0);
          
          return (
            <Button
              key={status}
              variant="ghost"
              className={`${config.className} ${selectedStatus === status ? 'ring-2 ring-primary' : ''}`}
              onClick={() => onStatusChange(status)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {config.label}
              <span className="ml-2 text-xs font-normal">({count})</span>
            </Button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="발주 코드 또는 발주명으로 검색"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
} 