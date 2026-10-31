import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'md' | 'sm'

export function btnClass(variant: Variant = 'secondary', size: Size = 'md') {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap select-none transition-[background-color,border-color,box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)] active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0 aria-disabled:cursor-not-allowed'
  const sizes = size === 'sm' ? 'min-h-10 px-4 text-caption' : 'min-h-11 px-5 text-ui'
  const variants: Record<Variant, string> = {
    primary: 'bg-ink text-on-ink hover:opacity-90 active:opacity-80 disabled:bg-line-strong disabled:text-ink-soft aria-disabled:bg-line-strong',
    secondary:
      'bg-surface text-ink border border-line-strong hover:bg-hover hover:border-field active:bg-sunken disabled:text-muted disabled:bg-sunken disabled:border-line',
    ghost: 'bg-transparent text-ink hover:bg-sunken active:bg-line disabled:text-muted',
    danger: 'bg-surface text-err border border-err-line hover:bg-err-soft active:bg-err-line/60 disabled:text-muted disabled:border-line',
  }
  return `${base} ${sizes} ${variants[variant]}`
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: IconName
  loading?: boolean
  children: ReactNode
}

export function Button({ variant, size, icon, loading, children, className = '', disabled, type = 'button', ...rest }: Props) {
  return (
    <button
      type={type}
      className={`${btnClass(variant, size)} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden="true" />
      ) : icon ? (
        <Icon name={icon} size={16} />
      ) : null}
      {children}
    </button>
  )
}

export function ButtonLink({
  variant,
  size,
  icon,
  className = '',
  children,
  ...rest
}: LinkProps & { variant?: Variant; size?: Size; icon?: IconName }) {
  return (
    <Link className={`${btnClass(variant, size)} ${className}`} {...rest}>
      {icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </Link>
  )
}
