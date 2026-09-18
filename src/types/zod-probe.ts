import { z } from 'zod';

// Probe: what does Zod v4 infer for these patterns?
const rtspProbe = z.coerce.number().min(1).max(65535).optional().or(z.literal(''));
const pwdProbe = z.string().optional().or(z.literal(''));

export type RtspPortOut = z.output<typeof rtspProbe>;
export type PwdOut = z.output<typeof pwdProbe>;
export type RtspPortInput = z.input<typeof rtspProbe>;
export type PwdInput = z.input<typeof pwdProbe>;
