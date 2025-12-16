// Minimal module shims to satisfy TypeScript for third-party packages without types
declare module 'react-day-picker';

declare module 'embla-carousel-react' {
  export type UseEmblaCarouselType = [
    (element?: HTMLElement | null) => void,
    {
      canScrollPrev: () => boolean
      canScrollNext: () => boolean
      scrollPrev: () => void
      scrollNext: () => void
      on: (event: string, cb: (...args: any[]) => void) => void
      off: (event: string, cb: (...args: any[]) => void) => void
    }
  ]
  export default function useEmblaCarousel(opts?: any, plugin?: any): UseEmblaCarouselType
}

declare module 'recharts' {
  export type LegendProps = any
  export const Legend: any
  export const Tooltip: any
  export const LineChart: any
  export const Line: any
  export const ResponsiveContainer: any
}

declare module 'cmdk';
declare module 'vaul';

declare module 'react-hook-form' {
  export type FieldValues = Record<string, any>
  export type FieldPath<T> = string
  export type ControllerProps<TFieldValues = FieldValues, TName = string> = any
  export const Controller: any
  export const FormProvider: any
  export function useFormContext(): any
  export function useForm<T extends Record<string, any> = Record<string, any>>(...args: any[]): any
}

declare module 'input-otp' {
  export const OTPInput: any
  export const OTPInputContext: any
}

declare module 'react-resizable-panels' {
  export const Panel: any
  export const PanelGroup: any
  export const PanelResizeHandle: any
}

declare module '@testing-library/react';
declare module '@testing-library/jest-dom';

// Allow importing prisma client from relative paths if needed
declare module '../../../../lib/prisma' {
  const prisma: any
  export default prisma
}

// Extend jest matchers minimally for testing assertions used in code
declare namespace jest {
  interface Matchers<R> {
    toBeInTheDocument(): R
  }
}
