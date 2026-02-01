/**
 * Global TypeScript declarations
 *
 * This file declares the MathLive math-field web component for TypeScript/JSX.
 * React 19 natively supports web components, but TypeScript needs this
 * declaration to type-check JSX containing custom elements.
 */

import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          children?: string;
        },
        HTMLElement
      >;
    }
  }
}
