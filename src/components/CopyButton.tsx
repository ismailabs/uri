import { useEffect, useRef, useState } from 'react';
import { copyText } from '../lib/clipboard';
import { Icon } from './Icons';

interface Props {
  getText: () => string;
  label?: string;
  className?: string;
  showText?: boolean;
}

export function CopyButton({ getText, label = 'Copy', className = '', showText = false }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    const ok = await copyText(getText());
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 1600);
  };

  return (
    <button type="button" onClick={onClick} className={className} aria-label={label} title={label}>
      <Icon name={state === 'copied' ? 'check' : 'copy'} className="size-4" />
      {showText && <span>{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}</span>}
      <span className="sr-only" role="status">
        {state === 'copied' ? 'Copied to clipboard' : ''}
      </span>
    </button>
  );
}
