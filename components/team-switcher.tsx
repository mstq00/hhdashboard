"use client"

import { GalleryVerticalEnd } from "lucide-react"
import Image from "next/image"

export function TeamSwitcher() {
  return (
    <div className="flex w-full items-center gap-2 p-2">
      <div className="flex flex-1 items-center gap-2">
        <Image
          src="/hejdoohomelogo.png"
          alt="헤이두 홈 로고"
          width={120}
          height={35}
          className="h-8 w-auto"
        />
      </div>
      <span className="text-xs text-muted-foreground">Ver. 1.2.0</span>
    </div>
  )
}
