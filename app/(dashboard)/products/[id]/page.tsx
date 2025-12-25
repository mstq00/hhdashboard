"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Save,
  Loader2,
  Trash,
  Plus,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const CHANNELS = [
  { id: 'smartstore', name: '스마트스토어' },
  { id: 'ohouse', name: '오늘의집' },
  { id: 'YTshopping', name: '유튜브쇼핑' },
  { id: 'coupang', name: '쿠팡' }
] as const;

interface ChannelPricing {
  id?: string;
  channel: string;
  fee: number;
  sellingPrice: number;
  supplyPrice: number;
  isAlwaysApply: boolean;
  startDate: string;
  endDate: string;
}

interface Memo {
  id?: string;
  content: string;
  createdAt: string;
}

interface SheetMapping {
  id?: string;
  originalName: string;
  originalOption: string;
}

interface Product {
  id: string;
  name: string;
  option: string;
  status: string;
  channelPricing: ChannelPricing[];
  memos: Memo[];
  sheetMappings: SheetMapping[];
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  
  // 폼 상태
  const [productName, setProductName] = useState("");
  const [productOption, setProductOption] = useState("");
  const [productStatus, setProductStatus] = useState("판매중");
  const [newMemo, setNewMemo] = useState("");
  
  // 매핑 정보
  const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([]);
  const [newMapping, setNewMapping] = useState({ originalName: "", originalOption: "" });
  
  // 채널별 가격 정보
  const [channelPricing, setChannelPricing] = useState<ChannelPricing[]>([]);

  // 판매처 추가
  const addChannel = () => {
    const newChannel: ChannelPricing = {
      channel: 'custom',
      fee: 0,
      sellingPrice: 0,
      supplyPrice: 0,
      isAlwaysApply: true,
      startDate: '',
      endDate: ''
    };
    setChannelPricing([...channelPricing, newChannel]);
  };

  // 판매처 삭제
  const removeChannel = (index: number) => {
    const channel = channelPricing[index];
    // 기본 4개 채널은 삭제 불가
    if (['smartstore', 'ohouse', 'YTshopping', 'coupang'].includes(channel.channel)) {
      toast.error("기본 판매처는 삭제할 수 없습니다.");
      return;
    }
    setChannelPricing(channelPricing.filter((_, i) => i !== index));
  };

  // 판매처 채널 변경
  const updateChannelType = (index: number, channelType: string) => {
    const updated = [...channelPricing];
    updated[index] = { ...updated[index], channel: channelType };
    setChannelPricing(updated);
  };

  // 상품 데이터 로드
  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      
      try {
        setIsLoading(true);
        
        // 1. 상품 기본 정보 가져오기
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) throw productError;

        // 2. 채널별 가격 정보 가져오기
        const { data: pricingData, error: pricingError } = await supabase
          .from('channel_pricing')
          .select('*')
          .eq('product_id', productId);

        if (pricingError) throw pricingError;

        // 3. 메모 정보 가져오기
        const { data: memosData, error: memosError } = await supabase
          .from('memos')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (memosError) throw memosError;

        // 4. 매핑 정보 가져오기
        const { data: mappingsData, error: mappingsError } = await supabase
          .from('sheet_mappings')
          .select('*')
          .eq('product_id', productId);

        if (mappingsError) throw mappingsError;

        // 데이터 변환
        const pricing: ChannelPricing[] = (pricingData || []).map((p: any) => {
          const startDate = p.start_date ? new Date(p.start_date).toISOString().split('T')[0] : '';
          const endDate = p.end_date ? new Date(p.end_date).toISOString().split('T')[0] : '';

          return {
            id: p.id,
            channel: p.channel,
            fee: p.fee || 0,
            sellingPrice: p.selling_price || 0,
            supplyPrice: p.supply_price || 0,
            isDefault: p.is_default || false,
            isAlwaysApply: !p.start_date && !p.end_date,
            startDate,
            endDate
          };
        });

        const memos: Memo[] = (memosData || []).map((m: any) => ({
          id: m.id,
          content: m.content,
          createdAt: m.created_at
        }));

        const mappings: SheetMapping[] = (mappingsData || []).map((m: any) => ({
          id: m.id,
          originalName: m.original_name,
          originalOption: m.original_option
        }));

        // 모든 채널에 대한 가격 정보가 있는지 확인하고 없으면 추가
        const allChannels = CHANNELS.map(c => c.id);
        const existingChannels = pricing.map(p => p.channel);
        const missingChannels = allChannels.filter(c => !existingChannels.includes(c));

        missingChannels.forEach(channel => {
          pricing.push({
            channel,
            fee: 0,
            sellingPrice: 0,
            supplyPrice: 0,
            isAlwaysApply: true,
            startDate: '',
            endDate: ''
          });
        });

        const productInfo: Product = {
          id: productData.id,
          name: productData.name,
          option: productData.option || '',
          status: productData.status || '판매중',
          channelPricing: pricing,
          memos: memos,
          sheetMappings: mappings
        };

        setProduct(productInfo);
        setProductName(productData.name);
        setProductOption(productData.option || '');
        setProductStatus(productData.status || '판매중');
        setChannelPricing(pricing);
        setSheetMappings(mappings);

      } catch (error) {
        console.error('상품 데이터 로드 중 오류 발생:', error);
        toast.error("상품 정보를 불러오는 데 실패했습니다.");
        router.push("/products");
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [productId, router]);

  // 매핑 추가
  const addMapping = () => {
    if (!newMapping.originalName.trim() || !newMapping.originalOption.trim()) {
      toast.error("원본 상품명과 옵션명을 모두 입력해주세요.");
      return;
    }
    
    setSheetMappings([...sheetMappings, { ...newMapping }]);
    setNewMapping({ originalName: "", originalOption: "" });
  };

  // 매핑 삭제
  const removeMapping = (index: number) => {
    setSheetMappings(sheetMappings.filter((_, i) => i !== index));
  };

  // 메모 추가
  const addMemo = async () => {
    if (!newMemo.trim() || !productId) return;

    try {
      const { data, error } = await supabase
        .from('memos')
        .insert({
          product_id: productId,
          content: newMemo.trim()
        })
        .select()
        .single();

      if (error) throw error;

      const newMemoObj: Memo = {
        id: data.id,
        content: data.content,
        createdAt: data.created_at
      };

      setProduct(prev => prev ? {
        ...prev,
        memos: [newMemoObj, ...prev.memos]
      } : null);
      setNewMemo("");

      toast.success("메모가 추가되었습니다.");
    } catch (error) {
      console.error('메모 추가 중 오류 발생:', error);
      toast.error("메모 추가 중 오류가 발생했습니다.");
    }
  };

  // 메모 삭제
  const deleteMemo = async (memoId: string) => {
    if (!confirm("정말로 이 메모를 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from('memos')
        .delete()
        .eq('id', memoId);

      if (error) throw error;

      setProduct(prev => prev ? {
        ...prev,
        memos: prev.memos.filter(m => m.id !== memoId)
      } : null);

      toast.success("메모가 삭제되었습니다.");
    } catch (error) {
      console.error('메모 삭제 중 오류 발생:', error);
      toast.error("메모 삭제 중 오류가 발생했습니다.");
    }
  };

  // 채널 가격 정보 업데이트
  const updateChannelPricing = (index: number, field: keyof ChannelPricing, value: any) => {
    const updated = [...channelPricing];
    updated[index] = { ...updated[index], [field]: value };
    setChannelPricing(updated);
  };

  // 이미지 업로드 (실제 구현은 파일 업로드 서비스 필요)
  const handleImageUpload = () => {
    // TODO: 실제 이미지 업로드 구현
    toast.info("이미지 업로드 기능은 추후 구현 예정입니다.");
  };

  // 상품 정보 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      // 1. 상품 기본 정보 업데이트
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: productName.trim(),
          option: productOption.trim(),
          status: productStatus
        })
        .eq('id', productId);

      if (productError) throw productError;

      // 2. 기존 매핑 정보 삭제 후 새로 저장
      await supabase
        .from('sheet_mappings')
        .delete()
        .eq('product_id', productId);

      if (sheetMappings.length > 0) {
        const mappingPromises = sheetMappings.map(mapping =>
          supabase
            .from('sheet_mappings')
            .insert({
              product_id: productId,
              original_name: mapping.originalName,
              original_option: mapping.originalOption
            })
        );
        await Promise.all(mappingPromises);
      }

      // 3. 기존 채널 가격 정보 삭제 후 새로 저장
      await supabase
        .from('channel_pricing')
        .delete()
        .eq('product_id', productId);

      const pricingPromises = channelPricing.map(pricing => 
        supabase
          .from('channel_pricing')
          .insert({
            product_id: productId,
            channel: pricing.channel,
            fee: pricing.fee,
            selling_price: pricing.sellingPrice,
            supply_price: pricing.supplyPrice,
            start_date: pricing.isAlwaysApply ? null : (pricing.startDate || null),
            end_date: pricing.isAlwaysApply ? null : (pricing.endDate || null),
            is_default: pricing.isAlwaysApply
          })
      );

      await Promise.all(pricingPromises);

      toast.success("상품 정보가 성공적으로 저장되었습니다.");
      router.push("/products");

    } catch (error) {
      console.error('상품 정보 저장 중 오류 발생:', error);
      toast.error("상품 정보 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-8">
        <p>상품을 찾을 수 없습니다.</p>
        <Button onClick={() => router.push("/products")} className="mt-4">
          상품 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">상품 상세 정보</h1>
            <p className="text-muted-foreground">상품 정보를 수정하고 관리하세요.</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit}
          disabled={isSaving}
        >
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽 컬럼 */}
        <div className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">상품의 기본 정보를 관리합니다.</p>
              
              <div className="space-y-2">
                <Label htmlFor="productName">상품명 *</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="상품명을 입력하세요"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productOption">옵션명 *</Label>
                <Input
                  id="productOption"
                  value={productOption}
                  onChange={(e) => setProductOption(e.target.value)}
                  placeholder="예: 대형/블랙"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  옵션명은 '상품명-옵션명' 형태로 SKU를 구성합니다.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="productStatus">상태</Label>
                <Select value={productStatus} onValueChange={setProductStatus}>
                  <SelectTrigger>
                    <SelectValue />
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

          {/* 매핑 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>매핑 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">원본 데이터의 매핑 정보를 관리합니다.</p>
              
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={addMapping}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                매핑 추가
              </Button>
              
              {sheetMappings.length > 0 && (
                <div className="space-y-3">
                  {sheetMappings.map((mapping, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">매핑 {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeMapping(index)}
                          className="h-6 w-6"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={mapping.originalName}
                          onChange={(e) => {
                            const updated = [...sheetMappings];
                            updated[index].originalName = e.target.value;
                            setSheetMappings(updated);
                          }}
                          placeholder="원본 상품명"
                          className="text-sm"
                        />
                        <Input
                          value={mapping.originalOption}
                          onChange={(e) => {
                            const updated = [...sheetMappings];
                            updated[index].originalOption = e.target.value;
                            setSheetMappings(updated);
                          }}
                          placeholder="원본 옵션명"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={newMapping.originalName}
                  onChange={(e) => setNewMapping({ ...newMapping, originalName: e.target.value })}
                  placeholder="원본 상품명"
                  onKeyDown={(e) => e.key === "Enter" && addMapping()}
                />
                <Input
                  value={newMapping.originalOption}
                  onChange={(e) => setNewMapping({ ...newMapping, originalOption: e.target.value })}
                  placeholder="원본 옵션명"
                  onKeyDown={(e) => e.key === "Enter" && addMapping()}
                />
              </div>
            </CardContent>
          </Card>

          {/* 판매처별 가격 및 수수료 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>판매처별 가격 및 수수료</CardTitle>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={addChannel}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  판매처 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">판매처별 가격 및 수수료 정보를 관리합니다.</p>
              
              <div className="space-y-4">
                {channelPricing.map((pricing, index) => (
                  <div key={`${pricing.channel}-${index}`} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {pricing.channel === 'custom' ? (
                          <Select value={pricing.channel} onValueChange={(value) => updateChannelType(index, value)}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="판매처 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {CHANNELS.map(channel => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  {channel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <h3 className="font-medium">
                            {CHANNELS.find(c => c.id === pricing.channel)?.name}
                          </h3>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeChannel(index)}
                        className="h-6 w-6"
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">수수료 (%)</Label>
                        <Input
                          type="number"
                          value={pricing.fee}
                          onChange={(e) => updateChannelPricing(index, 'fee', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.1"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">판매가 (₩)</Label>
                        <Input
                          type="number"
                          value={pricing.sellingPrice}
                          onChange={(e) => updateChannelPricing(index, 'sellingPrice', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">공급가 (₩)</Label>
                        <Input
                          type="number"
                          value={pricing.supplyPrice}
                          onChange={(e) => updateChannelPricing(index, 'supplyPrice', parseInt(e.target.value) || 0)}
                          placeholder="0"
                          min="0"
                          className="text-sm"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`always-${index}`}
                          checked={pricing.isAlwaysApply}
                          onCheckedChange={(checked) => updateChannelPricing(index, 'isAlwaysApply', checked)}
                        />
                        <Label htmlFor={`always-${index}`} className="text-sm">상시 적용</Label>
                      </div>
                      
                      {!pricing.isAlwaysApply && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="date"
                            value={pricing.startDate}
                            onChange={(e) => updateChannelPricing(index, 'startDate', e.target.value)}
                            className="text-sm"
                          />
                          <Input
                            type="date"
                            value={pricing.endDate}
                            onChange={(e) => updateChannelPricing(index, 'endDate', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽 컬럼 */}
        <div className="space-y-6">
          {/* 메모 */}
          <Card>
            <CardHeader>
              <CardTitle>메모</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">상품 관련 메모를 관리합니다.</p>
              
              <div className="space-y-2">
                <Textarea
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  placeholder="새로운 메모를 입력하세요"
                  rows={3}
                />
                <Button 
                  type="button"
                  onClick={addMemo}
                  disabled={!newMemo.trim()}
                  className="w-full"
                >
                  추가
                </Button>
              </div>
              
              {product.memos.length > 0 ? (
                <div className="space-y-2">
                  {product.memos.map((memo) => (
                    <div key={memo.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm">{memo.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(memo.createdAt).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMemo(memo.id!)}
                          className="h-6 w-6"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  등록된 메모가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 상품 이미지 */}
          <Card>
            <CardHeader>
              <CardTitle>상품 이미지</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">상품의 이미지를 관리합니다.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={handleImageUpload}
                >
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">+ 대표 이미지 추가</p>
                </div>
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={handleImageUpload}
                >
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">+ 추가 이미지</p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                이미지는 1:1 비율로 최대 5개까지 등록 가능합니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => router.back()}
          disabled={isSaving}
        >
          취소
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSaving}
        >
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
    </div>
  );
} 