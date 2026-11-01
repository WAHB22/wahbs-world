import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Press feedback: a quick scale on :active (transform only, 120 ms ease out),
 * so taps feel physical without waiting on anything.
 */
const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,background-color,color,box-shadow] duration-150 ease-[var(--ease-out-quint)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-[1.125rem] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-cobalt text-on-cobalt shadow-card hover:bg-cobalt-press',
        secondary: 'border border-rule bg-surface text-ink hover:bg-cobalt-wash',
        ghost: 'text-ink-soft hover:bg-cobalt-wash hover:text-ink',
        quiet: 'text-cobalt hover:bg-cobalt-wash',
        danger: 'text-vase hover:bg-vase-wash',
        attention: 'bg-kiln-wash text-kiln hover:brightness-95',
      },
      size: {
        md: 'min-h-11 rounded-[var(--radius-md)] px-4 text-[0.9375rem]',
        sm: 'min-h-11 rounded-[var(--radius-md)] px-3 text-sm',
        lg: 'min-h-12 rounded-[var(--radius-lg)] px-5 text-base',
        icon: 'size-11 rounded-full',
        pill: 'min-h-12 rounded-full px-5 text-[0.9375rem]',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, type, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return <Comp ref={ref} type={asChild ? undefined : (type ?? 'button')} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export { buttonVariants };
