"use client";

import React, { useState, useEffect } from "react";
import {
    Input,
} from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Save,
    Loader2,
    Trash,
    Plus,
    X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

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
    isDefault?: boolean;
}

interface SheetMapping {
    id?: string;
    originalName: string;
    originalOption: string;
}

interface ProductDetailPanelProps {
    productId: string | null;
    onClose?: () => void;
    onSave?: () => void;
}

export function ProductDetailPanel({ productId, onClose, onSave }: ProductDetailPanelProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 폼 상태
    const [productName, setProductName] = useState("");
    const [productOption, setProductOption] = useState("");
    const [productStatus, setProductStatus] = useState("판매중");

    // 매핑 정보
    const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([]);
    const [newMapping, setNewMapping] = useState({ originalName: "", originalOption: "" });

    // 채널별 가격 정보
    const [channelPricing, setChannelPricing] = useState<ChannelPricing[]>([
        { channel: 'smartstore', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
        { channel: 'ohouse', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
        { channel: 'YTshopping', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
        { channel: 'coupang', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' }
    ]);

    // 데이터 초기화 (Create Mode) 또는 로드 (Edit Mode)
    useEffect(() => {
        async function loadProduct() {
            if (!productId) {
                // Create Mode: Reset states
                setProductName("");
                setProductOption("");
                setProductStatus("판매중");
                setSheetMappings([]);
                setNewMapping({ originalName: "", originalOption: "" });
                setChannelPricing([
                    { channel: 'smartstore', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
                    { channel: 'ohouse', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
                    { channel: 'YTshopping', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
                    { channel: 'coupang', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' }
                ]);
                return;
            }

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

                // 3. 매핑 정보 가져오기
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

                setProductName(productData.name);
                setProductOption(productData.option || '');
                setProductStatus(productData.status || '판매중');
                setChannelPricing(pricing);
                setSheetMappings(mappings);

            } catch (error) {
                console.error('상품 데이터 로드 중 오류 발생:', error);
                toast.error("상품 정보를 불러오는 데 실패했습니다.");
            } finally {
                setIsLoading(false);
            }
        }

        loadProduct();
    }, [productId]);

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

    // 채널 가격 정보 업데이트
    const updateChannelPricing = (index: number, field: keyof ChannelPricing, value: any) => {
        const updated = [...channelPricing];
        updated[index] = { ...updated[index], [field]: value };
        setChannelPricing(updated);
    };

    // 상품 정보 저장
    const handleSubmit = async () => {
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
            let currentProductId = productId;

            if (currentProductId) {
                // --- Edit Mode: Update ---

                // 1. 상품 기본 정보 업데이트
                const { error: productError } = await supabase
                    .from('products')
                    .update({
                        name: productName.trim(),
                        option: productOption.trim(),
                        status: productStatus
                    })
                    .eq('id', currentProductId);

                if (productError) throw productError;

                // 2. 기존 매핑 정보 삭제 후 새로 저장
                await supabase.from('sheet_mappings').delete().eq('product_id', currentProductId);
                if (sheetMappings.length > 0) {
                    const mappingPromises = sheetMappings.map(mapping =>
                        supabase
                            .from('sheet_mappings')
                            .insert({
                                product_id: currentProductId,
                                original_name: mapping.originalName,
                                original_option: mapping.originalOption
                            })
                    );
                    await Promise.all(mappingPromises);
                }

                // 3. 기존 채널 가격 정보 삭제 후 새로 저장
                await supabase.from('channel_pricing').delete().eq('product_id', currentProductId);
                const pricingPromises = channelPricing.map(pricing =>
                    supabase
                        .from('channel_pricing')
                        .insert({
                            product_id: currentProductId,
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

                toast.success("상품 정보가 수정되었습니다.");
            } else {
                // --- Create Mode: Insert ---

                // 1. 상품 정보 저장
                const { data: productData, error: productError } = await supabase
                    .from('products')
                    .insert({
                        name: productName.trim(),
                        option: productOption.trim(),
                        status: productStatus
                    })
                    .select()
                    .single();

                if (productError) throw productError;
                currentProductId = productData.id;

                // 2. 매핑 정보 저장
                if (sheetMappings.length > 0) {
                    const mappingPromises = sheetMappings.map(mapping =>
                        supabase
                            .from('sheet_mappings')
                            .insert({
                                product_id: currentProductId,
                                original_name: mapping.originalName,
                                original_option: mapping.originalOption
                            })
                    );
                    await Promise.all(mappingPromises);
                }

                // 3. 채널별 가격 정보 저장
                const pricingPromises = channelPricing.map(pricing =>
                    supabase
                        .from('channel_pricing')
                        .insert({
                            product_id: currentProductId,
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

                // Reset form for new entry if staying in create mode, or just finish
                // For now, let's toast and call onSave
                toast.success("상품이 등록되었습니다.");

                // Clear form if it was create mode to allow another creation
                setProductName("");
                setProductOption("");
                setProductStatus("판매중");
                setSheetMappings([]);
                setNewMapping({ originalName: "", originalOption: "" });
                // Reset pricing to defaults
                setChannelPricing([
                    { channel: 'smartstore', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
                    { channel: 'ohouse', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
                    { channel: 'YTshopping', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' },
                    { channel: 'coupang', fee: 0, sellingPrice: 0, supplyPrice: 0, isAlwaysApply: true, startDate: '', endDate: '' }
                ]);
            }

            if (onSave) onSave();
        } catch (error) {
            console.error('상품 저장 중 오류 발생:', error);
            toast.error("상품 저장 중 오류가 발생했습니다.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-slate-500 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="font-medium animate-pulse">상품 정보를 불러오고 있습니다...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-xl font-bold">{productId ? "상품 정보 수정" : "새 상품 등록"}</h2>
                    <p className="text-sm text-slate-500">{productId ? "등록된 상품 정보를 수정합니다." : "새로운 상품을 등록합니다."}</p>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
                        <X className="w-5 h-5 text-slate-400" />
                    </Button>
                )}
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <div className="w-1 h-4 bg-primary rounded-full"></div>
                    기본 정보
                </h3>
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                    <CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="productName" className="text-xs font-bold text-slate-500">상품명 *</Label>
                            <Input
                                id="productName"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="상품명을 입력하세요"
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="productOption" className="text-xs font-bold text-slate-500">옵션명 *</Label>
                            <Input
                                id="productOption"
                                value={productOption}
                                onChange={(e) => setProductOption(e.target.value)}
                                placeholder="예: 대형/블랙"
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="productStatus" className="text-xs font-bold text-slate-500">상태</Label>
                            <Select value={productStatus} onValueChange={setProductStatus}>
                                <SelectTrigger className="bg-white">
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
            </div>

            {/* Mappings */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                    매핑 정보
                </h3>
                <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                    <CardContent className="p-4 space-y-4">
                        {sheetMappings.length > 0 && (
                            <div className="space-y-3 mb-4">
                                {sheetMappings.map((mapping, index) => (
                                    <div key={index} className="bg-white border rounded-xl p-3 space-y-2 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">#{index + 1}</span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeMapping(index)}
                                                className="h-6 w-6 text-slate-400 hover:text-red-500"
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
                                                className="text-xs h-8"
                                            />
                                            <Input
                                                value={mapping.originalOption}
                                                onChange={(e) => {
                                                    const updated = [...sheetMappings];
                                                    updated[index].originalOption = e.target.value;
                                                    setSheetMappings(updated);
                                                }}
                                                placeholder="원본 옵션명"
                                                className="text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    value={newMapping.originalName}
                                    onChange={(e) => setNewMapping({ ...newMapping, originalName: e.target.value })}
                                    placeholder="원본 상품명"
                                    className="text-sm border-0 bg-slate-50 ring-0 focus-visible:ring-0 focus-visible:bg-white transition-colors"
                                    onKeyDown={(e) => e.key === "Enter" && addMapping()}
                                />
                                <Input
                                    value={newMapping.originalOption}
                                    onChange={(e) => setNewMapping({ ...newMapping, originalOption: e.target.value })}
                                    placeholder="원본 옵션명"
                                    className="text-sm border-0 bg-slate-50 ring-0 focus-visible:ring-0 focus-visible:bg-white transition-colors"
                                    onKeyDown={(e) => e.key === "Enter" && addMapping()}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={addMapping}
                                className="w-full h-8 font-bold text-xs"
                            >
                                <Plus className="mr-1.5 h-3 w-3" />
                                매핑 추가
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                        채널별 가격
                    </h3>
                    <Button variant="ghost" size="sm" onClick={addChannel} className="h-6 text-xs px-2 hover:bg-green-50 hover:text-green-600">
                        <Plus className="w-3 h-3 mr-1" />
                        추가
                    </Button>
                </div>

                <div className="space-y-4">
                    {channelPricing.map((pricing, index) => (
                        <Card key={`${pricing.channel}-${index}`} className="border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 border-b p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {pricing.channel === 'custom' ? (
                                        <Select value={pricing.channel} onValueChange={(value) => updateChannelType(index, value)}>
                                            <SelectTrigger className="w-32 h-8 text-xs bg-white">
                                                <SelectValue placeholder="판매처" />
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
                                        <span className="font-bold text-sm text-slate-700">
                                            {CHANNELS.find(c => c.id === pricing.channel)?.name || pricing.channel}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeChannel(index)}
                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                >
                                    <Trash className="h-3 w-3" />
                                </Button>
                            </div>
                            <CardContent className="p-4 space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-400">수수료 (%)</Label>
                                        <Input
                                            type="number"
                                            value={pricing.fee}
                                            onChange={(e) => updateChannelPricing(index, 'fee', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="text-sm h-8"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-400">판매가</Label>
                                        <Input
                                            type="number"
                                            value={pricing.sellingPrice}
                                            onChange={(e) => updateChannelPricing(index, 'sellingPrice', parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="text-sm h-8"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-400">공급가</Label>
                                        <Input
                                            type="number"
                                            value={pricing.supplyPrice}
                                            onChange={(e) => updateChannelPricing(index, 'supplyPrice', parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="text-sm h-8"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Checkbox
                                            id={`always-${index}`}
                                            checked={pricing.isAlwaysApply}
                                            onCheckedChange={(checked) => updateChannelPricing(index, 'isAlwaysApply', checked)}
                                        />
                                        <Label htmlFor={`always-${index}`} className="text-xs font-medium cursor-pointer">상시 적용</Label>
                                    </div>

                                    {!pricing.isAlwaysApply && (
                                        <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-400">시작일</Label>
                                                <DatePicker
                                                    date={pricing.startDate ? new Date(pricing.startDate) : undefined}
                                                    setDate={(date) => updateChannelPricing(index, 'startDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    placeholder="시작일 선택"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[10px] font-bold text-slate-400">종료일</Label>
                                                <DatePicker
                                                    date={pricing.endDate ? new Date(pricing.endDate) : undefined}
                                                    setDate={(date) => updateChannelPricing(index, 'endDate', date ? format(date, 'yyyy-MM-dd') : '')}
                                                    placeholder="종료일 선택"
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="fixed bottom-0 right-0 w-full lg:w-[350px] p-4 bg-white/80 backdrop-blur-md border-t border-slate-200 z-10 flex gap-2">
                {onClose && (
                    <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
                        닫기
                    </Button>
                )}
                <Button
                    className="flex-1 font-bold shadow-lg shadow-primary/20"
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
                            {productId ? "수정사항 저장" : "상품 등록하기"}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
