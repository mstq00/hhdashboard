"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Plus, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

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

// 판매처 정의
const CHANNELS = [
  { id: "smartstore", name: "스마트스토어" },
  { id: "ohouse", name: "오늘의집" },
  { id: "YTshopping", name: "유튜브쇼핑" },
  { id: "coupang", name: "쿠팡" },
];

interface SheetMapping {
  originalName: string;
  originalOption: string;
}

interface Memo {
  content: string;
  createdAt: string;
}

export default function CreateProductPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  
  // 상품 기본 정보
  const [productName, setProductName] = useState("");
  const [productOption, setProductOption] = useState("");
  const [productStatus, setProductStatus] = useState("판매중");
  
  // 날짜 범위 상태
  const [dateRanges, setDateRanges] = useState<(DateRange | undefined)[]>([undefined]);

  // 원본 매핑 정보 상태
  const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([
    { originalName: "", originalOption: "" }
  ]);

  // 메모 상태
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState("");

  // 채널 가격 상태
  const [channelPricing, setChannelPricing] = useState<{
    channel: string;
    fee: number;
    sellingPrice: number;
    supplyPrice: number;
    isDefault: boolean;
    dateRange?: DateRange;
  }[]>([
    {
      channel: "smartstore",
      fee: 0,
      sellingPrice: 0,
      supplyPrice: 0,
      isDefault: true,
      dateRange: undefined
    }
  ]);

  // 원본 매핑 추가 함수
  const addSheetMapping = () => {
    const newMapping: SheetMapping = { originalName: "", originalOption: "" };
    setSheetMappings([...sheetMappings, newMapping]);
  };

  // 원본 매핑 제거 함수
  const removeSheetMapping = (index: number) => {
    if (sheetMappings.length === 1) return; // 적어도 하나는 유지
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
  const addMemo = () => {
    if (!newMemo.trim()) return;
    
    const now = new Date();
    const newMemoItem: Memo = {
      content: newMemo,
      createdAt: now.toISOString()
    };
    
    setMemos([newMemoItem, ...memos]);
    setNewMemo("");
  };

  // 메모 삭제 함수
  const removeMemo = (index: number) => {
    const newMemos = [...memos];
    newMemos.splice(index, 1);
    setMemos(newMemos);
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

  // 채널 가격 제거 함수
  const removeChannelPricing = (index: number) => {
    if (channelPricing.length === 1) return; // 적어도 하나는 유지
    const newPricing = [...channelPricing];
    newPricing.splice(index, 1);
    setChannelPricing(newPricing);
    
    // dateRanges도 함께 삭제
    const newDateRanges = [...dateRanges];
    newDateRanges.splice(index, 1);
    setDateRanges(newDateRanges);
  };

  // 채널 가격 업데이트 함수
  const updateChannelPricing = (index: number, field: string, value: any) => {
    const newPricing = [...channelPricing];
    newPricing[index] = { ...newPricing[index], [field]: value };
    setChannelPricing(newPricing);
    
    // dateRange 필드를 업데이트하는 경우 dateRanges 배열도 업데이트
    if (field === 'dateRange') {
      const newDateRanges = [...dateRanges];
      newDateRanges[index] = value;
      setDateRanges(newDateRanges);
    }
  };

  // 상품 저장 함수
  const saveProduct = async () => {
    // 필수 입력값 검증
    if (!productName.trim()) {
      toast.error("상품명을 입력해주세요.");
      return;
    }

    if (!productOption.trim()) {
      toast.error("옵션명을 입력해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      // 1. 상품 정보 저장
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          name: productName,
          option: productOption,
          status: productStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (productError) throw productError;

      const productId = productData.id;

      // 2. 매핑 정보 저장
      if (sheetMappings.length > 0) {
        const mappingsToInsert = sheetMappings
          .filter(mapping => mapping.originalName.trim() || mapping.originalOption.trim())
          .map(mapping => ({
            product_id: productId,
            original_name: mapping.originalName,
            original_option: mapping.originalOption,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

        if (mappingsToInsert.length > 0) {
          const { error: mappingError } = await supabase
            .from('sheet_mappings')
            .insert(mappingsToInsert);

          if (mappingError) throw mappingError;
        }
      }

      // 3. 메모 저장
      if (memos.length > 0) {
        const memosToInsert = memos.map(memo => ({
          product_id: productId,
          content: memo.content,
          created_at: memo.createdAt,
          updated_at: new Date().toISOString()
        }));

        const { error: memoError } = await supabase
          .from('memos')
          .insert(memosToInsert);

        if (memoError) throw memoError;
      }

      // 4. 채널 가격 저장
      if (channelPricing.length > 0) {
        const pricingToInsert = channelPricing.map(pricing => ({
          product_id: productId,
          channel: pricing.channel,
          fee: pricing.fee,
          selling_price: pricing.sellingPrice,
          supply_price: pricing.supplyPrice,
          start_date: pricing.isDefault ? null : pricing.dateRange?.from ? format(pricing.dateRange.from, 'yyyy-MM-dd') : null,
          end_date: pricing.isDefault ? null : pricing.dateRange?.to ? format(pricing.dateRange.to, 'yyyy-MM-dd') : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));

        const { error: pricingError } = await supabase
          .from('channel_pricing')
          .insert(pricingToInsert);

        if (pricingError) throw pricingError;
      }

      toast.success("상품이 성공적으로 등록되었습니다.");
      router.push(`/dashboard/products/${productId}`);
    } catch (err) {
      console.error('상품 등록 중 오류 발생:', err);
      toast.error("상품 등록 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/dashboard/products">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">새 상품 등록</h2>
        </div>
        <Button onClick={saveProduct} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              저장하기
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>상품의 기본 정보를 입력해주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">상품명 *</Label>
              <Input 
                id="name" 
                placeholder="상품명을 입력하세요" 
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="option">옵션명 *</Label>
              <Input 
                id="option" 
                placeholder="예: 대형/블랙" 
                value={productOption}
                onChange={(e) => setProductOption(e.target.value)}
                required 
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
          <CardHeader>
            <CardTitle>메모</CardTitle>
            <CardDescription>상품 관련 메모를 입력해주세요.</CardDescription>
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
                      {new Date(memo.createdAt).toLocaleString('ko-KR')}
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
              <CardDescription>원본 데이터의 매핑 정보를 입력해주세요.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addSheetMapping}>
              <Plus className="mr-2 h-4 w-4" />
              매핑 추가
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {sheetMappings.map((mapping, index) => (
              <div key={index} className="border rounded-md p-4 space-y-4 relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={() => removeSheetMapping(index)}
                  disabled={sheetMappings.length === 1}
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
                      placeholder="구글 시트의 원본 상품명"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`originalOption-${index}`}>원본 옵션명</Label>
                    <Input 
                      id={`originalOption-${index}`} 
                      value={mapping.originalOption} 
                      onChange={(e) => updateSheetMapping(index, 'originalOption', e.target.value)}
                      placeholder="구글 시트의 원본 옵션명"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 이미지 관리 */}
        <Card>
          <CardHeader>
            <CardTitle>상품 이미지</CardTitle>
            <CardDescription>상품의 이미지를 등록해주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-square rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50">
                <p className="text-sm">+ 대표 이미지 추가</p>
              </div>
              <div className="relative aspect-square rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50">
                <p className="text-sm">+ 추가 이미지</p>
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
              <CardDescription>판매처별 가격 및 수수료 정보를 입력해주세요.</CardDescription>
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
                        onValueChange={(value) => updateChannelPricing(index, 'channel', value)}
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
                        placeholder="0" 
                        value={pricing.fee}
                        onChange={(e) => updateChannelPricing(index, 'fee', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">₩</span>
                        <Input
                          type="number"
                          className="pl-8"
                          placeholder="0"
                          value={pricing.sellingPrice}
                          onChange={(e) => updateChannelPricing(index, 'sellingPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">₩</span>
                        <Input
                          type="number"
                          className="pl-8"
                          placeholder="0"
                          value={pricing.supplyPrice}
                          onChange={(e) => updateChannelPricing(index, 'supplyPrice', parseFloat(e.target.value) || 0)}
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
                              updateChannelPricing(index, 'dateRange', newDateRange);
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
                        onClick={() => removeChannelPricing(index)}
                        disabled={channelPricing.length === 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-slate-500">판매처별로 가격과 수수료를 설정할 수 있습니다.</p>
          </CardFooter>
        </Card>
      </div>

      <div className="flex justify-end space-x-2 mt-8">
        <Button 
          variant="outline" 
          onClick={() => router.push('/dashboard/products')}
        >
          취소
        </Button>
        <Button 
          onClick={saveProduct}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              등록 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              상품 등록하기
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 