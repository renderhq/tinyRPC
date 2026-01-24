import type { TRPCLink, Operation } from '../links';

export interface SplitLinkOptions {
  /**
   * The condition to use for choosing which link to execute.
   */
  condition: (op: Operation) => boolean;
  /**
   * The link to execute if the condition is true.
   */
  true: TRPCLink;
  /**
   * The link to execute if the condition is false.
   */
  false: TRPCLink;
}

/**
 * A link that branches into one of two links based on a condition.
 * Commonly used to send subscriptions over WebSockets and queries/mutations over HTTP.
 */
export function splitLink(opts: SplitLinkOptions): TRPCLink {
  return (linkOpts) => {
    return opts.condition(linkOpts.op) ? opts.true(linkOpts) : opts.false(linkOpts);
  };
}
