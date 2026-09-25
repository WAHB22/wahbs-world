/**
 * A real object in place of an icon: 3D renders from Microsoft's Fluent Emoji set
 * (MIT licence, public/objects/LICENSE-fluentui-emoji.txt). Always decorative: the text beside
 * it carries the meaning.
 */
export type ObjectName =
  | "hourglass" | "test-tube" | "bell" | "jar" | "ruler" | "compass" | "crystal-ball" | "lifting" | "wine-glass"
  | "clipboard" | "alarm-clock" | "banknote" | "camera" | "gear" | "glass-milk";

export function ObjectImage({ name, size = 32, className = "" }: { name: ObjectName; size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`object-img ${className}`} src={`/objects/${name}.png`} width={size} height={size} alt="" aria-hidden="true" decoding="async" draggable={false} />;
}
