'use client'

import Image from 'next/image'

export default function Hero() {
  return (
    <section className="relative min-h-screen w-full flex items-center justify-center bg-black">
      <div className="w-full h-full flex items-center justify-center">
        <Image
          src="/nessi.svg"
          alt="Nessi"
          width={1920}
          height={1080}
          priority
          className="w-full h-auto max-h-screen object-contain"
        />
      </div>
    </section>
  )
}
