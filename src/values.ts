// Values for operations and the stack.

export enum Type {
  Boolean = "boolean",
  Number = "number",
  String = "string",
  Nil = "nil",
  Symbol = "symbol",
}

export type BooleanValue = [Type.Boolean, boolean];
export type NumberValue = [Type.Number, number];
export type StringValue = [Type.String, string];
export type NilValue = [Type.Nil, null];
export type SymbolValue = [Type.Symbol, string];

export type Value = BooleanValue | NumberValue | StringValue | NilValue | SymbolValue;

export const Nil: NilValue = [Type.Nil, null];
