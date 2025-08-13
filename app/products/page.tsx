"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { 
  Search, 
  Filter, 
  Plus, 
  Package, 
  Edit, 
  Trash, 
  ArrowUpDown, 
  Loader2,
  Pencil
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";

const CHANNELS = [
  { id: 'smartstore', name: '스마트스토어' },
  { id: 'ohouse', name: '오늘의집' },
  { id: 'ytshopping', name: '유튜브쇼핑' },
  { id: 'coupang', name: '쿠팡' }
] as const;

// 임시 상품 데이터
interface SheetMapping {
  originalName: string;
  originalOption: string;
}

interface ChannelPricing {
  channel: string;
  fee: number;
  sellingPrice: number;
  supplyPrice: number;
  dateRange: string;
  isDefault: boolean;
}

interface Memo {
  content: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  option: string;
  category: string;
  status: string;
  sheetMapping: SheetMapping[];
  channelPricing: ChannelPricing[];
  memos: Memo[];
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [sortField, setSortField] = useState<keyof Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Bulk dialog states
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [bulkSellingPrice, setBulkSellingPrice] = useState<string>("");
  const [bulkSupplyPrice, setBulkSupplyPrice] = useState<string>("");
  const [bulkFee, setBulkFee] = useState<string>("");
  const [isAlwaysApply, setIsAlwaysApply] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [closeOverlaps, setCloseOverlaps] = useState<boolean>(true);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);

  // Supabase에서 데이터 가져오기 (최적화된 버전)
  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🚀 상품 데이터 로딩 시작...');

        // 1. 모든 상품 정보를 한 번에 가져오기
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        if (!productsData || productsData.length === 0) {
          setProducts([]);
          setFilteredProducts([]);
          setIsLoading(false);
          return;
        }

        // 2. 모든 상품 ID 수집
        const productIds = productsData.map(p => p.id);
        console.log(`📦 ${productIds.length}개 상품 데이터 처리 중...`);

        // 3. 모든 관련 데이터를 병렬로 가져오기
        const [mappingsResult, pricingResult, memosResult] = await Promise.all([
          // 매핑 정보 한 번에 가져오기
          supabase
            .from('sheet_mappings')
            .select('*')
            .in('product_id', productIds),
          
          // 채널 가격 정보 한 번에 가져오기
          supabase
            .from('channel_pricing')
            .select('*')
            .in('product_id', productIds),
          
          // 메모 정보 한 번에 가져오기
          supabase
            .from('memos')
            .select('*')
            .in('product_id', productIds)
            .order('created_at', { ascending: false })
        ]);

        // 4. 데이터를 상품별로 그룹화
        const mappingsByProduct = (mappingsResult.data || []).reduce((acc, mapping) => {
          if (!acc[mapping.product_id]) acc[mapping.product_id] = [];
          acc[mapping.product_id].push(mapping);
          return acc;
        }, {} as Record<string, any[]>);

        const pricingByProduct = (pricingResult.data || []).reduce((acc, pricing) => {
          if (!acc[pricing.product_id]) acc[pricing.product_id] = [];
          acc[pricing.product_id].push(pricing);
          return acc;
        }, {} as Record<string, any[]>);

        const memosByProduct = (memosResult.data || []).reduce((acc, memo) => {
          if (!acc[memo.product_id]) acc[memo.product_id] = [];
          acc[memo.product_id].push(memo);
          return acc;
        }, {} as Record<string, any[]>);

        // 5. 상품 데이터 조합
        const fetchedProducts: Product[] = productsData.map(product => {
          const productMappings = mappingsByProduct[product.id] || [];
          const productPricing = pricingByProduct[product.id] || [];
          const productMemos = memosByProduct[product.id] || [];

          // 데이터 변환
          const sheetMappings: SheetMapping[] = productMappings.map((mapping) => ({
            originalName: mapping.original_name || '',
            originalOption: mapping.original_option || ''
          }));

          const channelPricing: ChannelPricing[] = productPricing.map((pricing: any) => {
            const startDate = pricing.start_date ? new Date(pricing.start_date).toISOString().split('T')[0] : '';
            const endDate = pricing.end_date ? new Date(pricing.end_date).toISOString().split('T')[0] : '';
            const dateRange = startDate && endDate ? `${startDate} ~ ${endDate}` : '';

            return {
              channel: pricing.channel || '',
              fee: pricing.fee || 0,
              sellingPrice: pricing.selling_price || 0,
              supplyPrice: pricing.supply_price || 0,
              dateRange,
              isDefault: pricing.is_default || false
            };
          });

          const memos: Memo[] = productMemos.map((memo) => ({
            content: memo.content || '',
            createdAt: memo.created_at
          }));

          return {
            id: product.id,
            name: product.name,
            option: product.option || '',
            category: 'N/A',
            status: product.status || '판매중',
            sheetMapping: sheetMappings,
            channelPricing: channelPricing,
            memos: memos
          };
        });

        console.log(`✅ ${fetchedProducts.length}개 상품 데이터 로딩 완료`);
        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
      } catch (err) {
        console.error('❌ 데이터 로딩 중 오류 발생:', err);
        setError('상품 데이터를 불러오는 데 실패했습니다. 다시 시도해 주세요.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // 검색 함수
  const filterProducts = (products: Product[], query: string) => {
    if (!query.trim()) return products;
    
    const lowercaseQuery = query.toLowerCase();
    return products.filter(product => 
      product.name.toLowerCase().includes(lowercaseQuery) || 
      (product.option?.toLowerCase().includes(lowercaseQuery) || false)
    );
  };

  // 필터 및 정렬 적용 함수 - useCallback으로 메모이제이션
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...products];
    
    // 검색어 적용
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product => 
          product.name.toLowerCase().includes(query) || 
          (product.option?.toLowerCase().includes(query) || false) ||
          product.category.toLowerCase().includes(query)
      );
    }
    
    // 탭 필터 적용
    if (activeTab !== 'all') {
      const statusMap: Record<string, string> = {
        'selling': '판매중',
        'soldout': '품절',
        'suspended': '판매중지'
      };
      
      const statusToFilter = statusMap[activeTab];
      console.log(`필터링: ${activeTab} 탭 -> '${statusToFilter}' 상태로 필터링`);
      
      filtered = filtered.filter(product => {
        const result = product.status === statusToFilter;
        return result;
      });
    }
    
    // 정렬 적용
    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        return 0;
      });
    }
    
    console.log(`필터링 결과: ${filtered.length}개 상품`);
    setFilteredProducts(filtered);
    // 페이지 초기화
    setCurrentPage(1);
  }, [products, searchQuery, activeTab, sortField, sortDirection]);
  
  // 정렬 처리 함수
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      // 같은 필드를 다시 클릭하면 정렬 방향 전환
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 새로운 필드 선택 시 오름차순으로 시작
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 필터 변경 시 적용 - 의존성 배열 수정
  useEffect(() => {
    if (products.length > 0) {
      console.log(`상태 변경 감지: activeTab=${activeTab}, sortField=${sortField}, sortDirection=${sortDirection}`);
      applyFiltersAndSort();
    }
  }, [products, activeTab, sortField, sortDirection, searchQuery, applyFiltersAndSort]);

  // 상품 데이터가 로드된 후 한 번 필터링 적용 - 이 useEffect 제거
  // useEffect(() => {
  //   if (products.length > 0) {
  //     console.log(`상품 데이터 로드됨: ${products.length}개`);
  //     applyFiltersAndSort();
  //   }
  // }, [products, applyFiltersAndSort]);
  
  // 검색 기능
  const handleSearch = () => {
    applyFiltersAndSort();
  };
  
  // 탭 변경 처리
  const handleTabChange = (value: string) => {
    console.log(`탭 변경: ${activeTab} -> ${value}`);
    setActiveTab(value);
  };

  // 상품 삭제 함수
  const deleteProduct = async (id: string) => {
    if (!confirm("정말로 이 상품을 삭제하시겠습니까?")) return;
    
    try {
      // 1. 관련 데이터 삭제
      await supabase.from('sheet_mappings').delete().eq('product_id', id);
      await supabase.from('channel_pricing').delete().eq('product_id', id);
      await supabase.from('memos').delete().eq('product_id', id);
      
      // 2. 상품 삭제
      const { error } = await supabase.from('products').delete().eq('id', id);
      
      if (error) throw error;
      
      toast.success("상품이 성공적으로 삭제되었습니다.");
      
      // 상품 목록 새로고침
      window.location.reload();
    } catch (err) {
      console.error('상품 삭제 중 오류 발생:', err);
      toast.error("상품 삭제 중 오류가 발생했습니다.");
    }
  };

  // 페이지네이션을 위한 현재 페이지 상품 계산
  const paginatedProducts = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };
  
  // 총 페이지 수 계산
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  
  // 페이지 변경 함수
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // 페이지 네비게이션 렌더링
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
              // 현재 페이지 주변 2페이지, 첫 페이지, 마지막 페이지 표시
              return (
                page === 1 || 
                page === totalPages || 
                Math.abs(currentPage - page) <= 1
              );
            })
            .map((page, index, array) => {
              // 이전 페이지와 현재 페이지 사이에 간격이 있으면 생략 부호 표시
              const showEllipsis = index > 0 && array[index - 1] !== page - 1;
              
              return (
                <React.Fragment key={page}>
                  {showEllipsis && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              );
            })}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  // Selection handlers
  const toggleSelectAll = () => {
    const newValue = !selectAll;
    setSelectAll(newValue);
    if (newValue) {
      setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProductIds(new Set());
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const isAnySelected = selectedProductIds.size > 0;

  const formatDateOnly = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleOpenBulkDialog = () => {
    if (!isAnySelected) {
      toast.error("먼저 상품을 선택하세요.");
      return;
    }
    setIsBulkDialogOpen(true);
  };

  const resetBulkForm = () => {
    setSelectedChannels(new Set());
    setBulkSellingPrice("");
    setBulkSupplyPrice("");
    setBulkFee("");
    setIsAlwaysApply(false);
    setDateRange(undefined);
    setCloseOverlaps(true);
  };

  const submitBulkPricing = async () => {
    try {
      // Validation
      if (selectedChannels.size === 0) {
        toast.error("채널을 하나 이상 선택하세요.");
        return;
      }
      const selling = Number(bulkSellingPrice);
      const supply = Number(bulkSupplyPrice);
      const feeNum = Number(bulkFee);
      if (!Number.isFinite(selling) || !Number.isFinite(supply) || !Number.isFinite(feeNum)) {
        toast.error("판매가/공급가/수수료는 숫자여야 합니다.");
        return;
      }
      if (!isAlwaysApply) {
        if (!dateRange?.from && !dateRange?.to) {
          toast.error("기간을 설정하거나 상시 적용을 선택하세요.");
          return;
        }
      }

      const productIds = Array.from(selectedProductIds);
      const channels = Array.from(selectedChannels);
      const startDate = isAlwaysApply ? null : (dateRange?.from ? formatDateOnly(dateRange.from) : null);
      const endDate = isAlwaysApply ? null : (dateRange?.to ? formatDateOnly(dateRange.to) : null);

      const res = await fetch('/api/analytics/channel-pricing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          channels,
          sellingPrice: selling,
          supplyPrice: supply,
          fee: feeNum,
          isAlwaysApply,
          startDate,
          endDate,
          closeOverlaps,
          validateOnly: false
        })
      });

      const result = await res.json();
      if (!res.ok || result?.error) {
        throw new Error(result?.error || '저장 실패');
      }

      toast.success(`일괄 적용 완료: 생성 ${result.created}건, 조정 ${result.adjusted}건`);
      setIsBulkDialogOpen(false);
      resetBulkForm();
      // 새로고침으로 목록 최신화
      window.location.reload();
    } catch (e: any) {
      toast.error(e?.message || '일괄 적용 중 오류가 발생했습니다.');
    }
  };

  const previewBulkPricing = async () => {
    try {
      // 동일 검증 재사용
      if (selectedChannels.size === 0) {
        toast.error("채널을 하나 이상 선택하세요.");
        return;
      }
      const selling = Number(bulkSellingPrice);
      const supply = Number(bulkSupplyPrice);
      const feeNum = Number(bulkFee);
      if (!Number.isFinite(selling) || !Number.isFinite(supply) || !Number.isFinite(feeNum)) {
        toast.error("판매가/공급가/수수료는 숫자여야 합니다.");
        return;
      }
      if (!isAlwaysApply) {
        if (!dateRange?.from && !dateRange?.to) {
          toast.error("기간을 설정하거나 상시 적용을 선택하세요.");
          return;
        }
      }

      setIsPreviewing(true);
      const productIds = Array.from(selectedProductIds);
      const channels = Array.from(selectedChannels);
      const startDate = isAlwaysApply ? null : (dateRange?.from ? formatDateOnly(dateRange.from) : null);
      const endDate = isAlwaysApply ? null : (dateRange?.to ? formatDateOnly(dateRange.to) : null);

      const res = await fetch('/api/analytics/channel-pricing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds,
          channels,
          sellingPrice: selling,
          supplyPrice: supply,
          fee: feeNum,
          isAlwaysApply,
          startDate,
          endDate,
          closeOverlaps,
          validateOnly: true
        })
      });

      const result = await res.json();
      if (!res.ok || result?.error) {
        throw new Error(result?.error || '미리보기 실패');
      }
      setPreviewResult(result);
    } catch (e: any) {
      toast.error(e?.message || '미리보기 중 오류가 발생했습니다.');
    } finally {
      setIsPreviewing(false);
    }
  };

  // 로딩 중 표시
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <p className="text-muted-foreground">데이터를 불러오는 중입니다...</p>
      </div>
    );
  }

  // 오류 표시
  if (error) {
    return (
      <div className="flex justify-center items-center h-[60vh] flex-col">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 검색 및 필터 영역 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex w-full flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="상품명, 옵션명, 카테고리 검색..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
              <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleSearch} className="flex-shrink-0">
              <Filter className="h-4 w-4" />
              <span className="sr-only">필터</span>
            </Button>
            <Link href="/products/create" className="flex-shrink-0">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                상품 등록
              </Button>
            </Link>
                <Button variant="secondary" onClick={handleOpenBulkDialog} className="flex-shrink-0">
                  채널 가격/수수료 일괄 적용
                </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs sm:text-sm">전체 상품</TabsTrigger>
          <TabsTrigger value="selling" className="text-xs sm:text-sm">판매중</TabsTrigger>
          <TabsTrigger value="soldout" className="text-xs sm:text-sm">품절</TabsTrigger>
          <TabsTrigger value="suspended" className="text-xs sm:text-sm">판매중지</TabsTrigger>
        </TabsList>
        
        {/* 각 탭에 동일한 테이블 구조 적용 */}
        {["all", "selling", "soldout", "suspended"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue} className="mt-3 sm:mt-4">
            <Card>
              <CardHeader className="pb-2 px-4 py-4 sm:p-6">
                <CardTitle className="text-base">
                  {tabValue === "all" 
                    ? "전체 상품 목록"
                    : tabValue === "selling" 
                      ? "판매중인 상품 목록" 
                      : tabValue === "soldout"
                        ? "품절된 상품 목록"
                        : "판매중지된 상품 목록"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  총 {filteredProducts.length}개의 상품이 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-24 sm:h-32">
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mr-2" />
                    <span className="text-muted-foreground text-sm">
                      {tabValue === "all" 
                        ? "등록된 상품이 없습니다."
                        : tabValue === "selling" 
                          ? "판매중인 상품이 없습니다." 
                          : tabValue === "soldout"
                            ? "품절된 상품이 없습니다."
                            : "판매중지된 상품이 없습니다."}
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-3 px-3 sm:-mx-6 sm:px-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">
                            <Checkbox checked={selectAll} onCheckedChange={toggleSelectAll as any} />
                          </TableHead>
                          <TableHead className="w-12 text-center">번호</TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              className="flex items-center space-x-1 px-0 hover:bg-transparent"
                              onClick={() => handleSort('name')}
                            >
                              <span>상품명</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="hidden sm:table-cell">
                            <Button 
                              variant="ghost" 
                              className="flex items-center space-x-1 px-0 hover:bg-transparent"
                              onClick={() => handleSort('option')}
                            >
                              <span>옵션명</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button 
                              variant="ghost" 
                              className="flex items-center space-x-1 px-0 hover:bg-transparent"
                              onClick={() => handleSort('status')}
                            >
                              <span>상태</span>
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="hidden md:table-cell">채널수수료</TableHead>
                          <TableHead className="text-center">관리</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts().map((product, index) => (
                          <TableRow key={product.id}>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedProductIds.has(product.id)}
                                onCheckedChange={() => toggleSelectOne(product.id) as any}
                              />
                            </TableCell>
                            <TableCell className="text-center py-2 sm:py-4 text-xs sm:text-sm">{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                            <TableCell className="font-medium py-2 sm:py-4 text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">
                              {product.name}
                              {/* 모바일에서만 보이는 옵션명 */}
                              <div className="sm:hidden text-xs text-muted-foreground mt-1">
                                {product.option || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-2 sm:py-4 text-xs sm:text-sm">{product.option || '-'}</TableCell>
                            <TableCell className="py-2 sm:py-4">
                              <span 
                                className={`inline-flex items-center rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-medium ${
                                  product.status === '판매중' 
                                    ? 'bg-green-50 text-green-700' 
                                    : product.status === '품절' 
                                      ? 'bg-red-50 text-red-700' 
                                      : product.status === '판매중지'
                                        ? 'bg-gray-50 text-gray-700'
                                        : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {product.status}
                              </span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-2 sm:py-4">
                              {Object.values(
                                product.channelPricing
                                  .filter(pricing => pricing.fee > 0)
                                  .reduce((acc, pricing) => {
                                    // 각 채널별로 가장 높은 수수료율을 저장
                                    if (!acc[pricing.channel] || acc[pricing.channel].fee < pricing.fee) {
                                      acc[pricing.channel] = pricing;
                                    }
                                    return acc;
                                  }, {} as Record<string, ChannelPricing>)
                              ).map((pricing, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center rounded-full px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs font-medium bg-blue-50 text-blue-700 mr-1 mb-1"
                                >
                                  {CHANNELS.find(ch => ch.id === pricing.channel)?.name || pricing.channel}: {pricing.fee}%
                                </span>
                              ))}
                            </TableCell>
                            <TableCell className="py-2 sm:py-4">
                              <div className="flex justify-center space-x-1">
                                <Link href={`/products/${product.id}?skip_auth=true`}>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="py-3 px-4 sm:px-6 sm:py-4">
                <div className="flex justify-center w-full">
                  {renderPagination()}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Bulk Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>채널 가격/수수료 일괄 적용</DialogTitle>
            <DialogDescription>
              선택된 {selectedProductIds.size}개 상품에 대해 채널별 가격과 수수료, 기간을 일괄 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">채널 선택</div>
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map(ch => (
                  <Button
                    key={ch.id}
                    type="button"
                    variant={selectedChannels.has(ch.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedChannels(prev => {
                      const next = new Set(prev);
                      if (next.has(ch.id)) next.delete(ch.id); else next.add(ch.id);
                      return next;
                    })}
                  >
                    {ch.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">판매가</div>
                <Input inputMode="numeric" value={bulkSellingPrice} onChange={e => setBulkSellingPrice(e.target.value)} placeholder="ex) 26100" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">공급가</div>
                <Input inputMode="numeric" value={bulkSupplyPrice} onChange={e => setBulkSupplyPrice(e.target.value)} placeholder="ex) 15000" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">수수료(%)</div>
                <Input inputMode="numeric" value={bulkFee} onChange={e => setBulkFee(e.target.value)} placeholder="ex) 12" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox checked={isAlwaysApply} onCheckedChange={(v) => setIsAlwaysApply(Boolean(v)) as any} />
              <span className="text-sm">상시 적용</span>
            </div>
            {!isAlwaysApply && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">기간</div>
                <DateRangePicker dateRange={dateRange} setDateRange={setDateRange} />
                <div className="text-xs text-muted-foreground mt-1">오픈엔드 시작은 시작일만 지정, 종료일 비워두기</div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Checkbox checked={closeOverlaps} onCheckedChange={(v) => setCloseOverlaps(Boolean(v)) as any} />
              <span className="text-sm">겹치는 기존 기간 자동 보정</span>
            </div>
            {previewResult && (
              <div className="rounded-md border p-3 bg-muted/30">
                <div className="text-sm font-medium mb-1">미리보기</div>
                <div className="text-xs text-muted-foreground mb-2">
                  생성 {previewResult.created}건, 조정 {previewResult.adjusted}건, 경고 {previewResult.conflicts?.length || 0}건
                </div>
                <div className="max-h-40 overflow-auto text-xs space-y-1">
                  {previewResult.preview?.slice(0, 50).map((p: any, idx: number) => (
                    <div key={idx}>
                      [{p.action}] {p.productId} / {p.channel} {p.detail ? `- ${p.detail}` : ''}
                    </div>
                  ))}
                  {(previewResult.preview?.length || 0) > 50 && (
                    <div className="text-muted-foreground">... (표시 제한)</div>
                  )}
                  {previewResult.conflicts && previewResult.conflicts.length > 0 && (
                    <div className="text-red-600 mt-2">
                      분할 필요 경고 {previewResult.conflicts.length}건 있음. 기존 기간을 수동으로 분할해야 할 수 있습니다.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsBulkDialogOpen(false); }}>취소</Button>
            <Button variant="secondary" onClick={previewBulkPricing} disabled={isPreviewing}>미리보기</Button>
            <Button onClick={submitBulkPricing} disabled={!selectedChannels.size || (!isAlwaysApply && !dateRange?.from && !dateRange?.to)}>적용</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 