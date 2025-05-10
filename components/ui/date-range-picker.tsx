"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  setDateRange: (dateRange: DateRange | undefined) => void
  className?: string
  placeholder?: string
  align?: "center" | "start" | "end"
}

export function DateRangePicker({
  dateRange,
  setDateRange,
  className,
  placeholder,
  align = "start",
}: DateRangePickerProps) {
  // 임시 날짜 범위 상태 추가
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange);
  const [isOpen, setIsOpen] = React.useState(false);

  // Popover가 열릴 때 tempDateRange를 초기화
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTempDateRange(undefined);
    } else if (!open && (!tempDateRange?.from || !tempDateRange?.to)) {
      setTempDateRange(dateRange);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal text-xs sm:text-sm",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <span className="text-xs sm:text-sm truncate">
                  {format(dateRange.from, "yyyy.MM.dd", { locale: ko })} ~{" "}
                  {format(dateRange.to, "yyyy.MM.dd", { locale: ko })}
                </span>
              ) : (
                <span className="text-xs sm:text-sm truncate">
                  {format(dateRange.from, "yyyy.MM.dd", { locale: ko })}
                </span>
              )
            ) : (
              <span className="text-xs sm:text-sm">{placeholder || "날짜 범위 선택"}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 sm:w-auto" align={align}>
          <div className="flex flex-col sm:flex-row">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from || new Date()}
              selected={tempDateRange}
              onSelect={(newDateRange) => {
                setTempDateRange(newDateRange);
                // 시작 날짜와 종료 날짜가 모두 선택된 경우에만 적용
                if (newDateRange?.from && newDateRange?.to) {
                  setDateRange(newDateRange);
                  setIsOpen(false);
                }
              }}
              numberOfMonths={1}
              locale={ko}
              classNames={{
                caption: "text-xs sm:text-sm",
                day: "text-xs sm:text-sm h-8 w-8 p-0 font-normal aria-selected:opacity-100"
              }}
            />
          </div>
          <div className="p-2 sm:p-3 border-t border-border flex flex-wrap justify-between gap-2">
            <div className="flex flex-wrap gap-1 sm:gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => {
                  const today = new Date();
                  const newRange = {
                    from: today,
                    to: today,
                  };
                  setTempDateRange(newRange);
                  setDateRange(newRange);
                  setIsOpen(false);
                }}
              >
                오늘
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => {
                  const today = new Date();
                  const yesterday = addDays(today, -1);
                  const newRange = {
                    from: yesterday,
                    to: yesterday,
                  };
                  setTempDateRange(newRange);
                  setDateRange(newRange);
                  setIsOpen(false);
                }}
              >
                어제
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 px-2"
                onClick={() => {
                  const today = new Date();
                  const newRange = {
                    from: addDays(today, -6),
                    to: today,
                  };
                  setTempDateRange(newRange);
                  setDateRange(newRange);
                  setIsOpen(false);
                }}
              >
                최근 7일
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2"
              onClick={() => {
                const today = new Date();
                const newRange = {
                  from: new Date(today.getFullYear(), today.getMonth(), 1),
                  to: today,
                };
                setTempDateRange(newRange);
                setDateRange(newRange);
                setIsOpen(false);
              }}
            >
              이번 달
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
} 