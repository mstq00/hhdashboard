"use client";

import { notFound, useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Plus, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from 'sonner';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { supabase } from "@/lib/supabase";

// 판매처 정의
const CHANNELS = [
  { id: "smartstore", name: "스마트스토어" },
  { id: "ohouse", name: "오늘의집" },
  { id: "YTshopping", name: "유튜브쇼핑" },
  { id: "coupang", name: "쿠팡" },
];

interface SheetMapping {
  id?: string;
  originalName: string;
  originalOption: string;
}

interface ChannelPricing {
  id?: string;
  channel: string;
  fee: number;
  sellingPrice: number;
  supplyPrice: number;
  isDefault: boolean;
  dateRange?: DateRange;
  startDate?: Date;
  endDate?: Date;
}

interface Memo {
  id?: string;
  content: string | null;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  option: string;
  status: string;
  images?: string[];
  sheetMapping: SheetMapping[];
  channelPricing: ChannelPricing[];
  memos: Memo[];
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 상태 관리
  const [productName, setProductName] = useState("");
  const [productOption, setProductOption] = useState("");
  const [productStatus, setProductStatus] = useState("판매중");
  
  // 원본 매핑 정보 상태
  const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([]);

  // 메모 상태 관리
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState("");

  // 채널 가격 상태 관리
  const [channelPricing, setChannelPricing] = useState<ChannelPricing[]>([]);

  // 날짜 범위를 관리하기 위한 상태 배열 추가
  const [dateRanges, setDateRanges] = useState<(DateRange | undefined)[]>([]);

  // 초기 데이터 로딩
  useEffect(() => {
    async function fetchProductData() {
      try {
        setIsLoading(true);
        setError(null);

        // 상품 정보 가져오기
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) {
          if (productError.code === 'PGRST116') {
            notFound();
          }
          throw productError;
        }

        if (!productData) {
          notFound();
        }

        // 매핑 정보 가져오기
        const { data: mappingsData } = await supabase
          .from('sheet_mappings')
          .select('*')
          .eq('product_id', productId);

        // 채널별 가격 정보 가져오기
        const { data: pricingData } = await supabase
          .from('channel_pricing')
          .select('*')
          .eq('product_id', productId);

        // 메모 정보 가져오기
        const { data: memosData } = await supabase
          .from('memos')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        // 데이터 변환
        const mappings: SheetMapping[] = (mappingsData || []).map((mapping) => ({
          id: mapping.id,
          originalName: mapping.original_name || '',
          originalOption: mapping.original_option || ''
        }));

        const pricing: ChannelPricing[] = (pricingData || []).map((pricing) => {
          const startDate = pricing.start_date ? new Date(pricing.start_date) : undefined;
          const endDate = pricing.end_date ? new Date(pricing.end_date) : undefined;
          const isDefault = !pricing.start_date && !pricing.end_date;

          return {
            id: pricing.id,
            channel: pricing.channel || '',
            fee: pricing.fee || 0,
            sellingPrice: pricing.selling_price || 0,
            supplyPrice: pricing.supply_price || 0,
            isDefault,
            dateRange: startDate && endDate ? { from: startDate, to: endDate } : undefined,
            startDate,
            endDate
          };
        });

        // 초기 dateRanges 설정
        const initialDateRanges = pricing.map(p => p.dateRange);
        setDateRanges(initialDateRanges);

        const productMemos: Memo[] = (memosData || []).map((memo) => ({
          id: memo.id,
          content: memo.content || '',
          createdAt: memo.created_at
        }));

        // 상품 객체 설정
        const fullProduct: Product = {
          id: productData.id,
          name: productData.name,
          option: productData.option || '',
          status: productData.status || '판매중',
          images: [],
          sheetMapping: mappings,
          channelPricing: pricing,
          memos: productMemos
        };

        setProduct(fullProduct);
        setProductName(fullProduct.name);
        setProductOption(fullProduct.option);
        setProductStatus(fullProduct.status);
        setSheetMappings(fullProduct.sheetMapping);
        setChannelPricing(fullProduct.channelPricing);
        setMemos(fullProduct.memos);
      } catch (err) {
        console.error('데이터 로딩 중 오류 발생:', err);
        setError('상품 정보를 불러오는 데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProductData();
  }, [productId]);

  // 원본 매핑 추가 함수
  const addSheetMapping = () => {
    const newMapping: SheetMapping = { originalName: "", originalOption: "" };
    setSheetMappings([...sheetMappings, newMapping]);
  };

  // 원본 매핑 제거 함수
  const removeSheetMapping = async (index: number) => {
    const newMappings = [...sheetMappings];
    newMappings.splice(index, 1);
    setSheetMappings(newMappings);
  };

  // 원본 매핑 업데이트 함수
  const updateSheetMapping = (index: number, field: keyof SheetMapping, value: string) => {
    const newMappings = [...sheetMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setSheetMappings(newMappings);
  };

  // 메모 추가 함수
  const addMemo = async () => {
    if (!newMemo.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('memos')
        .insert({
          product_id: productId,
          content: newMemo,
        })
        .select()
        .single();

      if (error) throw error;

      const newMemoItem: Memo = {
        id: data.id,
        content: data.content || '',
        createdAt: data.created_at
      };
      
      setMemos([newMemoItem, ...memos]);
      setNewMemo("");
    } catch (err) {
      console.error('메모 추가 중 오류 발생:', err);
      toast.error("메모를 추가하는 데 실패했습니다.");
    }
  };

  // 메모 삭제 함수
  const removeMemo = async (index: number) => {
    const memoToDelete = memos[index];
    if (!memoToDelete.id) return;

    try {
      const { error } = await supabase
        .from('memos')
        .delete()
        .eq('id', memoToDelete.id);

      if (error) throw error;

      const newMemos = [...memos];
      newMemos.splice(index, 1);
      setMemos(newMemos);
    } catch (err) {
      console.error('메모 삭제 중 오류 발생:', err);
      toast.error("메모를 삭제하는 데 실패했습니다.");
    }
  };

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy년 MM월 dd일 HH:mm', { locale: ko });
  };

  // 저장 함수
  const saveProduct = async () => {
    if (!product) return;
    
    setIsSaving(true);
    
    try {
      // 상품 정보 업데이트
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: productName,
          option: productOption,
          status: productStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (productError) throw productError;

      // 매핑 정보 처리
      // 1. 기존 매핑 삭제
      await supabase
        .from('sheet_mappings')
        .delete()
        .eq('product_id', productId);

      // 2. 새 매핑 추가
      if (sheetMappings.length > 0) {
        const mappingsToInsert = sheetMappings.map(mapping => ({
          product_id: productId,
          original_name: mapping.originalName,
          original_option: mapping.originalOption
        }));

        const { error: mappingError } = await supabase
          .from('sheet_mappings')
          .insert(mappingsToInsert);

        if (mappingError) throw mappingError;
      }

      // 채널 가격 처리
      // 1. 기존 채널 가격 삭제
      await supabase
        .from('channel_pricing')
        .delete()
        .eq('product_id', productId);

      // 2. 새 채널 가격 추가
      if (channelPricing.length > 0) {
        const pricingToInsert = channelPricing.map(pricing => ({
          product_id: productId,
          channel: pricing.channel,
          fee: pricing.fee,
          selling_price: pricing.sellingPrice,
          supply_price: pricing.supplyPrice,
          start_date: pricing.isDefault ? null : pricing.startDate ? format(pricing.startDate, 'yyyy-MM-dd') : null,
          end_date: pricing.isDefault ? null : pricing.endDate ? format(pricing.endDate, 'yyyy-MM-dd') : null
        }));

        const { error: pricingError } = await supabase
          .from('channel_pricing')
          .insert(pricingToInsert);

        if (pricingError) throw pricingError;
      }

      toast.success("상품 정보가 성공적으로 저장되었습니다.");

    } catch (err) {
      console.error('상품 저장 중 오류 발생:', err);
      toast.error("상품 정보를 저장하는 데 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 채널 가격 추가 함수
  const addChannelPricing = () => {
    setChannelPricing([
      ...channelPricing,
      {
        channel: "smartstore",
        fee: 0,
        sellingPrice: 0,
        supplyPrice: 0,
        isDefault: true,
        dateRange: undefined
      }
    ]);
    // 새로운 채널에 대한 dateRange도 추가
    setDateRanges([...dateRanges, undefined]);
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
        <Button onClick={() => router.push('/dashboard/products')}>상품 목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/products">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">상품 상세 정보</h2>
        </div>
        <Button onClick={saveProduct} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? '저장 중...' : '저장하기'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>상품의 기본 정보를 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">상품명</Label>
              <Input
                id="name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="option">옵션명</Label>
              <Input
                id="option"
                value={productOption}
                onChange={(e) => setProductOption(e.target.value)}
              />
              <p className="text-xs text-slate-500">옵션명은 '상품명-옵션명' 형태로 SKU를 구성합니다.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <Select
                value={productStatus}
                onValueChange={setProductStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="판매중">판매중</SelectItem>
                  <SelectItem value="품절">품절</SelectItem>
                  <SelectItem value="판매중지">판매중지</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 메모 관리 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>메모</CardTitle>
              <CardDescription>상품 관련 메모를 관리합니다.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newMemo">새 메모</Label>
              <div className="flex space-x-2">
                <Textarea
                  id="newMemo"
                  placeholder="새로운 메모를 입력하세요"
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  rows={2}
                  className="flex-grow"
                />
                <Button onClick={addMemo} className="self-end">추가</Button>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {memos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">등록된 메모가 없습니다.</p>
              ) : (
                memos.map((memo, index) => (
                  <div key={index} className="border rounded-md p-3 relative">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="absolute top-2 right-2"
                      onClick={() => removeMemo(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <p className="text-sm mb-2 pr-8">{memo.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(memo.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 구글 시트 매핑 정보 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>매핑 정보</CardTitle>
              <CardDescription>원본 데이터의 매핑 정보를 관리합니다.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addSheetMapping}>
              <Plus className="mr-2 h-4 w-4" />
              매핑 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {sheetMappings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">등록된 매핑 정보가 없습니다.</p>
            ) : (
              sheetMappings.map((mapping, index) => (
                <div key={index} className="border rounded-md p-4 space-y-4 relative">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-2 right-2"
                    onClick={() => removeSheetMapping(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`originalName-${index}`}>원본 상품명</Label>
                      <Input 
                        id={`originalName-${index}`} 
                        value={mapping.originalName} 
                        onChange={(e) => updateSheetMapping(index, 'originalName', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`originalOption-${index}`}>원본 옵션명</Label>
                      <Input 
                        id={`originalOption-${index}`} 
                        value={mapping.originalOption} 
                        onChange={(e) => updateSheetMapping(index, 'originalOption', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 이미지 관리 */}
        <Card>
          <CardHeader>
            <CardTitle>상품 이미지</CardTitle>
            <CardDescription>상품의 이미지를 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {product?.images?.map((image, index) => (
                <div key={index} className="relative aspect-square rounded-md bg-slate-100 flex items-center justify-center text-slate-500">
                  {/* 실제 구현 시 이미지 표시 */}
                  <p className="text-sm">이미지 {index + 1}</p>
                </div>
              ))}
              <div className="relative aspect-square rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50">
                <p className="text-sm">+ 이미지 추가</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-slate-500">이미지는 1:1 비율로 최대 5개까지 등록 가능합니다.</p>
          </CardFooter>
        </Card>

        {/* 판매처별 가격 및 수수료 */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>판매처별 가격 및 수수료</CardTitle>
              <CardDescription>판매처별 가격 및 수수료 정보를 관리합니다.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={addChannelPricing}
            >
              <Plus className="mr-2 h-4 w-4" />
              판매처 추가
            </Button>
          </CardHeader>
          <CardContent>
            {channelPricing.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">등록된 판매처 정보가 없습니다.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>판매처</TableHead>
                    <TableHead>수수료(%)</TableHead>
                    <TableHead>판매가</TableHead>
                    <TableHead>공급가</TableHead>
                    <TableHead>적용 기간</TableHead>
                    <TableHead className="w-[80px]">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelPricing.map((pricing, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select 
                          value={pricing.channel}
                          onValueChange={(value) => {
                            const newPricing = [...channelPricing];
                            newPricing[index] = { ...newPricing[index], channel: value };
                            setChannelPricing(newPricing);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="판매처 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {CHANNELS.map(ch => (
                              <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number" 
                          value={pricing.fee}
                          onChange={(e) => {
                            const newPricing = [...channelPricing];
                            newPricing[index] = { 
                              ...newPricing[index], 
                              fee: parseFloat(e.target.value) || 0 
                            };
                            setChannelPricing(newPricing);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3">₩</span>
                          <Input
                            type="number"
                            className="pl-8"
                            value={pricing.sellingPrice}
                            onChange={(e) => {
                              const newPricing = [...channelPricing];
                              newPricing[index] = { 
                                ...newPricing[index], 
                                sellingPrice: parseFloat(e.target.value) || 0 
                              };
                              setChannelPricing(newPricing);
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3">₩</span>
                          <Input
                            type="number"
                            className="pl-8"
                            value={pricing.supplyPrice}
                            onChange={(e) => {
                              const newPricing = [...channelPricing];
                              newPricing[index] = { 
                                ...newPricing[index], 
                                supplyPrice: parseFloat(e.target.value) || 0 
                              };
                              setChannelPricing(newPricing);
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id={`isDefault-${index}`}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              checked={pricing.isDefault}
                              onChange={(e) => {
                                const newPricing = [...channelPricing];
                                newPricing[index] = { 
                                  ...newPricing[index], 
                                  isDefault: e.target.checked,
                                  dateRange: e.target.checked ? undefined : newPricing[index].dateRange
                                };
                                setChannelPricing(newPricing);
                                
                                // 기본 적용으로 변경된 경우 dateRange도 업데이트
                                if (e.target.checked) {
                                  const newDateRanges = [...dateRanges];
                                  newDateRanges[index] = undefined;
                                  setDateRanges(newDateRanges);
                                }
                              }}
                            />
                            <label htmlFor={`isDefault-${index}`} className="text-sm">기본 적용</label>
                          </div>
                          
                          {!pricing.isDefault && (
                            <DateRangePicker 
                              dateRange={dateRanges[index]}
                              setDateRange={(newDateRange) => {
                                // dateRanges 업데이트
                                const newDateRanges = [...dateRanges];
                                newDateRanges[index] = newDateRange;
                                setDateRanges(newDateRanges);
                                
                                // channelPricing도 업데이트
                                const newPricing = [...channelPricing];
                                newPricing[index] = { 
                                  ...newPricing[index], 
                                  dateRange: newDateRange,
                                  startDate: newDateRange?.from,
                                  endDate: newDateRange?.to
                                };
                                setChannelPricing(newPricing);
                              }}
                              placeholder="기간 선택"
                              align="start"
                            />
                          )}
                          {pricing.isDefault && (
                            <p className="text-xs text-muted-foreground">상시 적용</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const newPricing = [...channelPricing];
                            newPricing.splice(index, 1);
                            setChannelPricing(newPricing);
                            
                            // dateRanges도 함께 삭제
                            const newDateRanges = [...dateRanges];
                            newDateRanges.splice(index, 1);
                            setDateRanges(newDateRanges);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 