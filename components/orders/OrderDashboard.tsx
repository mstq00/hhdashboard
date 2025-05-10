'use client';

import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotionService } from '@/services/notionService';
import OrderStats from './OrderStats';
import OrderList from './OrderList';
import OrderFilter from './OrderFilter';
import OrderTrends from './OrderTrends';

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

interface OrderGroup {
  발주코드: string;
  총발주액: number;
  총발주수량: number;
  차수목록: string[];
  최초발주일: string;
  최근발주일: string;
  상태: string;
  items: OrderItem[];
}

export default function OrderDashboard() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('list');

  const notionService = new NotionService('1541d84cc1ac80bc8696fe96b2cc86b8');

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await notionService.fetchDatabase();
      setOrders(data);
    } catch (err) {
      setError('발주 데이터를 불러오는 중 오류가 발생했습니다.');
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const processOrderGroups = (orders: OrderItem[]): OrderGroup[] => {
    const groupMap = new Map<string, OrderGroup>();

    orders.forEach(order => {
      if (!groupMap.has(order.발주코드)) {
        groupMap.set(order.발주코드, {
          발주코드: order.발주코드,
          총발주액: 0,
          총발주수량: 0,
          차수목록: [],
          최초발주일: order.발주일,
          최근발주일: order.발주일,
          상태: order.상태,
          items: []
        });
      }

      const group = groupMap.get(order.발주코드)!;
      group.총발주액 += order.원화발주액 || order.발주액;
      group.총발주수량 += order.발주수량;
      group.차수목록.push(order.발주차수);
      
      if (new Date(order.발주일) < new Date(group.최초발주일)) {
        group.최초발주일 = order.발주일;
      }
      if (new Date(order.발주일) > new Date(group.최근발주일)) {
        group.최근발주일 = order.발주일;
      }

      // 상태 우선순위: 진행중 > 대기 > 완료 > 취소
      const statusPriority = {
        '진행중': 3,
        '대기': 2,
        '완료': 1,
        '취소': 0
      };

      if (statusPriority[order.상태 as keyof typeof statusPriority] > 
          statusPriority[group.상태 as keyof typeof statusPriority]) {
        group.상태 = order.상태;
      }

      group.items.push(order);
    });

    return Array.from(groupMap.values()).map(group => ({
      ...group,
      차수목록: [...new Set(group.차수목록)].sort()
    }));
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesStatus = selectedStatus === 'all' || order.상태 === selectedStatus;
      const matchesSearch = searchTerm === '' || 
        order.발주코드.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.발주명.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, selectedStatus, searchTerm]);

  const orderGroups = useMemo(() => {
    return processOrderGroups(filteredOrders);
  }, [filteredOrders]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const statusCounts = orders.reduce((acc, order) => {
      acc[order.상태] = (acc[order.상태] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalOrders,
      statusCounts
    };
  }, [orders]);

  return (
    <div className="space-y-8">
      <OrderStats stats={stats} />
      
      <OrderFilter
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        stats={stats}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">발주 목록</TabsTrigger>
          <TabsTrigger value="trends">발주 동향</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-6">
          <OrderList
            orderGroups={orderGroups}
            isLoading={isLoading}
            error={error}
            onRefresh={fetchOrders}
          />
        </TabsContent>
        <TabsContent value="trends" className="mt-6">
          <OrderTrends orders={orders} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 