"use client";

import React, { useState, useEffect } from "react";
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

const CHANNELS = [
  { id: 'smartstore', name: '스마트스토어' },
  { id: 'ohouse', name: '오늘의집' },
  { id: 'YTshopping', name: '유튜브쇼핑' },
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

  // Supabase에서 데이터 가져오기
  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true);
        setError(null);

        // Supabase에서 상품 정보 가져오기
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        // 가져온 데이터를 Product 인터페이스에 맞게 가공
        const fetchedProducts: Product[] = [];

        for (const product of productsData || []) {
          // 매핑 정보 가져오기
          const { data: mappingsData } = await supabase
            .from('sheet_mappings')
            .select('*')
            .eq('product_id', product.id);

          // 채널별 가격 정보 가져오기
          const { data: pricingData } = await supabase
            .from('channel_pricing')
            .select('*')
            .eq('product_id', product.id);

          console.log('채널 가격 정보:', JSON.stringify(pricingData, null, 2));

          // 메모 정보 가져오기
          const { data: memosData } = await supabase
            .from('memos')
            .select('*')
            .eq('product_id', product.id)
            .order('created_at', { ascending: false });

          // 데이터 변환
          const sheetMappings: SheetMapping[] = (mappingsData || []).map((mapping) => ({
            originalName: mapping.original_name || '',
            originalOption: mapping.original_option || ''
          }));

          const channelPricing: ChannelPricing[] = (pricingData || []).map((pricing: any) => {
            console.log('개별 채널 가격 정보:', JSON.stringify(pricing, null, 2));
            
            const startDate = pricing.start_date ? new Date(pricing.start_date).toISOString().split('T')[0] : '';
            const endDate = pricing.end_date ? new Date(pricing.end_date).toISOString().split('T')[0] : '';
            const dateRange = startDate && endDate ? `${startDate} ~ ${endDate}` : '';

            return {
              channel: pricing.channel || '',
              fee: pricing.fee || 0,
              sellingPrice: pricing.selling_price || 0,
              supplyPrice: pricing.supply_price || 0,
              dateRange,
              isDefault: true // 일단 모든 수수료를 표시하도록 true로 설정
            };
          });

          const memos: Memo[] = (memosData || []).map((memo) => ({
            content: memo.content || '',
            createdAt: memo.created_at
          }));

          // 상품 객체 생성
          fetchedProducts.push({
            id: product.id,
            name: product.name,
            option: product.option || '',
            category: 'N/A',  // 데이터베이스에 없는 필드이지만 인터페이스를 변경하지 않기 위해 유지
            status: product.status || '판매중',
            sheetMapping: sheetMappings,
            channelPricing: channelPricing,
            memos: memos
          });
        }

        setProducts(fetchedProducts);
        setFilteredProducts(fetchedProducts);
      } catch (err) {
        console.error('데이터 로딩 중 오류 발생:', err);
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

  // 필터 및 정렬 적용 함수
  const applyFiltersAndSort = () => {
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
  };
  
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
  
  // 필터 변경 시 적용
  useEffect(() => {
    if (products.length > 0) {
      console.log(`상태 변경 감지: activeTab=${activeTab}, sortField=${sortField}, sortDirection=${sortDirection}`);
      applyFiltersAndSort();
    }
  }, [activeTab, sortField, sortDirection, searchQuery]);

  // 상품 데이터가 로드된 후 한 번 필터링 적용
  useEffect(() => {
    if (products.length > 0) {
      console.log(`상품 데이터 로드됨: ${products.length}개`);
      applyFiltersAndSort();
    }
  }, [products]);
  
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
            <Link href="/dashboard/products/create" className="flex-shrink-0">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                상품 등록
              </Button>
            </Link>
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
                                <Link href={`/dashboard/products/${product.id}?skip_auth=true`}>
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
    </div>
  );
} 