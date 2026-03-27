declare module '@profoundlogic/hogan' {
  export interface Template {
    render(context?: Context, partials?: Partials): string;
  }
  export type Context = Record<string, unknown>;
  export type Partials = Record<string, Template>;
  export function compile(template: string): Template;
}
