// Opcodes for the VM
import { StringValue, NumberValue, BooleanValue, SymbolValue } from "./values";

export enum Opcode {
  PushString = "PushString", PushNumber = "PushNumber", PushBool = "PushBool", PushNull = "PushNull", PopValue = "PopValue",
  Concat = "Concat", And = "And", Or = "Or", Not = "Not", Equal = "Equal", GreaterThan = "GreaterThan", Lessthan = "Lessthan",
  Add = "Add", Subtract = "Subtract", Multiply = "Multiply", Divide = "Divide", Increment = "Increment", Decrement = "Decrement",
  LoadVariable = "LoadVariable", StoreVariable = "StoreVariable",
  ShowLine = "ShowLine", Jump = "Jump", JumpIfFalse = "JumpIfFalse", PushChoice = "PushChoice", ShowChoice = "ShowChoice",
  EnterNode = "EnterNode", ExitNode = "ExitNode", EndDialogue = "EndDialogue", Call = "Call",
};

export const stackNeeded: { [opcode in Opcode]: number } = {
  PopValue: 1, PushBool: 0, PushNull: 0, PushNumber: 0, PushString: 0, GreaterThan: 2, Lessthan: 2,
  Concat: 2, And: 2, Or: 2, Not: 1, Equal: 2, Add: 2, Subtract: 2, Multiply: 2, Divide: 2, Increment: 1, Decrement: 1,
  LoadVariable: 0, StoreVariable: 1,
  ShowLine: 1, Jump: 0, JumpIfFalse: 1, PushChoice: 1, ShowChoice: 0, EnterNode: 0, ExitNode: 0, EndDialogue: 0, Call: 0,
};

export type PushString = [Opcode.PushString, StringValue];
export type PushNumber = [Opcode.PushNumber, NumberValue];
export type PushBool = [Opcode.PushBool, BooleanValue];
export type PushNull = [Opcode.PushNull];
export type PopValue = [Opcode.PopValue];
export type Jump = [Opcode.Jump, NumberValue];
export type JumpIfFalse = [Opcode.JumpIfFalse, NumberValue];
export type Concat = [Opcode.Concat];
export type And = [Opcode.And];
export type Or = [Opcode.Or];
export type Not = [Opcode.Not];
export type Equal = [Opcode.Equal];
export type GreaterThan = [Opcode.GreaterThan];
export type Lessthan = [Opcode.Lessthan];
export type Add = [Opcode.Add];
export type Subtract = [Opcode.Subtract];
export type Multiply = [Opcode.Multiply];
export type Divide = [Opcode.Divide];
export type Increment = [Opcode.Increment];
export type Decrement = [Opcode.Decrement];
export type LoadVariable = [Opcode.LoadVariable, SymbolValue];
export type StoreVariable = [Opcode.StoreVariable, SymbolValue];
export type ShowLine = [Opcode.ShowLine];
export type PushChoice = [Opcode.PushChoice, NumberValue];
export type ShowChoice = [Opcode.ShowChoice, SymbolValue];
export type EnterNode = [Opcode.EnterNode, SymbolValue];
export type ExitNode = [Opcode.ExitNode, SymbolValue];
export type EndDialogue = [Opcode.EndDialogue];
export type Call = [Opcode.Call, SymbolValue];

export type Instruction =
  PushString | PushBool | PushNumber | PushNull | PopValue | GreaterThan | Lessthan |
  Concat | And | Or | Not | Equal | Add | Subtract | Multiply | Divide | Increment | Decrement |
  LoadVariable | StoreVariable |
  EnterNode | ExitNode | Jump | JumpIfFalse | ShowLine | PushChoice | ShowChoice | EndDialogue | Call;

export interface Program {
  start: number;
  code: Instruction[];
};
