import { parseEDNString as parse } from 'edn-data'

import { compile, compileSExpr, Context } from "./compiler";
import { Instruction, Opcode, Program } from "./instruction-set";
import { Type } from "./values";

const src = `
# Node1

Markdown headers separate the dialogue into blocks (or nodes) that can be targets for links. The header name is the destination name (or "url" for links and choices).

This is paragraph is interpreted as a single line of dialogue - a bit of text transmitted to the client as a single unit. There must be a blank row separating each line. Newlines are interpreted as spaces.

Lines can also have some limited formatting, though this is just passed through as-is to the client to decide how to format them. This includes **bold** and *italicized* text.

Lines can be interspersed with \`inlineExpressions\`. These expressions are part of the dialogue expression language. The delimiter is the same as markdown inline code. It can only have an expression that evaluates to a value (string, number, boolean, null).

Links are used to transition control to another node. They have the regular Markdown hyperlink format.

[Example Link](Node2)

# Node2

Choices are like Markdown unordered lists of links.

1. [Choice 1: Go to node 1](Node1)
2. [Choice 2: Go to node 2](Node2)
3. [Choice 3: Go to node 3](Node3)
4. [Choice 4: Go to node 4](Node4)

# Node3

Actions are blocks of code to be executed in the Dialog expression language. You can insert an action in a node by making a fenced code block. The following is dialogue expression language.

\`\`\`
(do
  (set! variable1 3)
  (set! variable2 (+ variable1, 3)))
\`\`\`

[...](Node2)

# Node4

Nodes that don't end in a link or a choice end the dialogue. They don't have anywhere else to go.
`;

test("Compiles example Dialogue", () => {
  const actual = compile(src);
  const expected: Program = {
    start: 0,
    code: [
      [Opcode.EnterNode, [Type.Symbol, "Node1"]],
      [Opcode.PushString, [Type.String, `Markdown headers separate the dialogue into blocks (or nodes) that can be targets for links. The header name is the destination name (or "url" for links and choices).`]],
      [Opcode.ShowLine],
      [Opcode.PushString, [Type.String, `This is paragraph is interpreted as a single line of dialogue - a bit of text transmitted to the client as a single unit. There must be a blank row separating each line. Newlines are interpreted as spaces.`]],
      [Opcode.ShowLine],
      [Opcode.PushString, [Type.String, `Lines can also have some limited formatting, though this is just passed through as-is to the client to decide how to format them. This includes `]],
      [Opcode.PushString, [Type.String, `<b>`]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, `bold`]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, `</b>`]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, ` and `]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, `<i>`]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, `italicized`]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, `</i>`]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, ` text.`]],
      [Opcode.Concat],
      [Opcode.ShowLine],
      [Opcode.PushString, [Type.String, `Lines can be interspersed with `]],
      [Opcode.LoadVariable, [Type.Symbol, `inlineExpressions`]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, `. These expressions are part of the dialogue expression language. The delimiter is the same as markdown inline code. It can only have an expression that evaluates to a value (string, number, boolean, null).`]],
      [Opcode.Concat],
      [Opcode.ShowLine],
      [Opcode.PushString, [Type.String, `Links are used to transition control to another node. They have the regular Markdown hyperlink format.`]],
      [Opcode.ShowLine],
      [Opcode.PushString, [Type.String, `Example Link`]],
      [Opcode.ShowLine],
      [Opcode.ExitNode, [Type.Symbol, "Node1"]],
      [Opcode.Jump, [Type.Number, 37]],
      [Opcode.ExitNode, [Type.Symbol, "Node1"]],
      [Opcode.EndDialogue],

      [Opcode.EnterNode, [Type.Symbol, "Node2"]],
      [Opcode.PushString, [Type.String, `Choices are like Markdown unordered lists of links.`]],
      [Opcode.ShowLine],
      [Opcode.PushString, [Type.String, `Choice 1: Go to node 1`]],
      [Opcode.PushChoice, [Type.Number, 0]],
      [Opcode.PushString, [Type.String, `Choice 2: Go to node 2`]],
      [Opcode.PushChoice, [Type.Number, 37]],
      [Opcode.PushString, [Type.String, `Choice 3: Go to node 3`]],
      [Opcode.PushChoice, [Type.Number, 51]],
      [Opcode.PushString, [Type.String, `Choice 4: Go to node 4`]],
      [Opcode.PushChoice, [Type.Number, 66]],
      [Opcode.ShowChoice, [Type.Symbol, "Node2"]],
      [Opcode.ExitNode, [Type.Symbol, "Node2"]],
      [Opcode.EndDialogue],

      [Opcode.EnterNode, [Type.Symbol, "Node3"]],
      [Opcode.PushString, [Type.String, `Actions are blocks of code to be executed in the Dialog expression language. You can insert an action in a node by making a fenced code block. The following is dialogue expression language.`]],
      [Opcode.ShowLine],
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.StoreVariable, [Type.Symbol, "variable1"]],
      [Opcode.LoadVariable, [Type.Symbol, "variable1"]],
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.Add],
      [Opcode.StoreVariable, [Type.Symbol, "variable2"]],
      [Opcode.PushString, [Type.String, `...`]],
      [Opcode.ShowLine],
      [Opcode.ExitNode, [Type.Symbol, "Node3"]],
      [Opcode.Jump, [Type.Number, 37]],
      [Opcode.ExitNode, [Type.Symbol, "Node3"]],
      [Opcode.EndDialogue],

      [Opcode.EnterNode, [Type.Symbol, "Node4"]],
      [Opcode.PushString, [Type.String, `Nodes that don't end in a link or a choice end the dialogue. They don't have anywhere else to go.`]],
      [Opcode.ShowLine],
      [Opcode.ExitNode, [Type.Symbol, "Node4"]],
      [Opcode.EndDialogue],
    ],
  };
  expect(actual).toEqual(expected);
});

const testCases: [string, Context, Instruction[]][] = [
  [
    `abc123`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [[Opcode.LoadVariable, [Type.Symbol, "abc123"]]],
  ],
  [
    `"abc123"`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [[Opcode.PushString, [Type.String, "abc123"]]],
  ],
  [
    `123`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [[Opcode.PushNumber, [Type.Number, 123]]],
  ],
  [
    `true`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [[Opcode.PushBool, [Type.Boolean, true]]],
  ],
  [
    `false`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [[Opcode.PushBool, [Type.Boolean, false]]],
  ],
  [
    `nil`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [[Opcode.PushNull]],
  ],
  [
    `(+ 3 4)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Add],
    ]
  ],
  [
    `(+ 3 4 5)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Add],
      [Opcode.PushNumber, [Type.Number, 5]],
      [Opcode.Add],
    ]
  ],
  [
    `(- 3 4)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Subtract],
    ],
  ],
  [
    `(- 3 4 5)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Subtract],
      [Opcode.PushNumber, [Type.Number, 5]],
      [Opcode.Subtract],
    ]
  ],
  [
    `(* 3 4)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Multiply],
    ]
  ],
  [
    `(* 3 4 5)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Multiply],
      [Opcode.PushNumber, [Type.Number, 5]],
      [Opcode.Multiply],
    ]
  ],
  [
    `(/ 3 4)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Divide],
    ]
  ],
  [
    `(/ 3 4 5)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Divide],
      [Opcode.PushNumber, [Type.Number, 5]],
      [Opcode.Divide],
    ]
  ],
  [
    `(gt 3 4)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.GreaterThan],
    ]
  ],
  [
    `(lt 3 4)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Lessthan],
    ]
  ],
  [
    `(inc 3)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.Increment],
    ]
  ],
  [
    `(dec 3)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.Decrement],
    ]
  ],
  [
    `(concat "3" "4")`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushString, [Type.String, "3"]],
      [Opcode.PushString, [Type.String, "4"]],
      [Opcode.Concat],
    ]
  ],
  [
    `(concat "3" "4" "5")`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushString, [Type.String, "3"]],
      [Opcode.PushString, [Type.String, "4"]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, "5"]],
      [Opcode.Concat],
    ]
  ],
  [
    `(and true false)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.And],
    ]
  ],
  [
    `(or true false)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.Or],
    ]
  ],
  [
    `(not true)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.Not],
    ]
  ],
  [
    `(eq true false)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.Equal],
    ]
  ],
  [
    `(set! abc123 "string")`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushString, [Type.String, "string"]],
      [Opcode.StoreVariable, [Type.Symbol, "abc123"]],
    ]
  ],
  [
    `(set! abc123 (concat "str" "ing"))`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushString, [Type.String, "str"]],
      [Opcode.PushString, [Type.String, "ing"]],
      [Opcode.Concat],
      [Opcode.StoreVariable, [Type.Symbol, "abc123"]],
    ]
  ],
  [
    `(while (lt var 3) (set! var (inc var)))`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.LoadVariable, [Type.Symbol, "var"]],
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.Lessthan],
      [Opcode.JumpIfFalse, [Type.Number, 8]],
      [Opcode.LoadVariable, [Type.Symbol, "var"]],
      [Opcode.Increment],
      [Opcode.StoreVariable, [Type.Symbol, "var"]],
      [Opcode.Jump, [Type.Number, 0]],
    ]
  ],
  [
    `(if (lt var 3)
    (set! var (inc var))
    (set! var (dec var)))`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.LoadVariable, [Type.Symbol, "var"]],
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.Lessthan],
      [Opcode.JumpIfFalse, [Type.Number, 8]],
      [Opcode.LoadVariable, [Type.Symbol, "var"]],
      [Opcode.Increment],
      [Opcode.StoreVariable, [Type.Symbol, "var"]],
      [Opcode.Jump, [Type.Number, 11]],
      [Opcode.LoadVariable, [Type.Symbol, "var"]],
      [Opcode.Decrement],
      [Opcode.StoreVariable, [Type.Symbol, "var"]],
    ]
  ],
  [
    `(do
      (set! var (inc var))
      (set! var (dec var)))`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.LoadVariable, [Type.Symbol, "var"]],
      [Opcode.Increment],
      [Opcode.StoreVariable, [Type.Symbol, "var"]],
      [Opcode.LoadVariable, [Type.Symbol, "var"]],
      [Opcode.Decrement],
      [Opcode.StoreVariable, [Type.Symbol, "var"]],
    ]
  ],
  [
    `(print (concat "you have " numItems " items"))`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushString, [Type.String, "you have "]],
      [Opcode.LoadVariable, [Type.Symbol, "numItems"]],
      [Opcode.Concat],
      [Opcode.PushString, [Type.String, " items"]],
      [Opcode.Concat],
      [Opcode.ShowLine],
    ]
  ],
  [
    `(choose
      ("Option1" Node1)
      ("Option2" Node2)
      ("Option3" Node3))`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: "null" },
    [
      [Opcode.PushString, [Type.String, "Option1"]],
      [Opcode.PushChoice, [Type.Number, 0]],
      [Opcode.PushString, [Type.String, "Option2"]],
      [Opcode.PushChoice, [Type.Number, 0]],
      [Opcode.PushString, [Type.String, "Option3"]],
      [Opcode.PushChoice, [Type.Number, 0]],
      [Opcode.ShowChoice, [Type.Symbol, "null"]]
    ]
  ],
  [
    `(abc 1 2 3)`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushNumber, [Type.Number, 1]],
      [Opcode.PushNumber, [Type.Number, 2]],
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.Call, [Type.Symbol, "abc"]]
    ]
  ],
  [
    `(asm 
      (PushString "abc")
      (PushNumber 5)
      (PushBool true)
      (PushNull)
      (PopValue)
      (Jump dest)
      (JumpIfFalse dest)
      (Concat)
      (And)
      (Or)
      (Not)
      (Equal)
      (GreaterThan)
      (Lessthan)
      (Add)
      (Subtract)
      (Multiply)
      (Divide)
      (Increment)
      (Decrement)
      (LoadVariable, abc)
      (StoreVariable, abc)
      (ShowLine)
      (PushChoice dest),
      (ShowChoice abc)
      (EnterNode abc)
      (ExitNode abc)
      (Call abc)
      (EndDialogue))`,
    { code: [], pc: 0, symbolTable: {}, backreferenceTable: [], parseTree: [], currentNode: null },
    [
      [Opcode.PushString, [Type.String, "abc"]],
      [Opcode.PushNumber, [Type.Number, 5]],
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushNull],
      [Opcode.PopValue],
      [Opcode.Jump, [Type.Number, 0]],
      [Opcode.JumpIfFalse, [Type.Number, 0]],
      [Opcode.Concat],
      [Opcode.And],
      [Opcode.Or],
      [Opcode.Not],
      [Opcode.Equal],
      [Opcode.GreaterThan],
      [Opcode.Lessthan],
      [Opcode.Add],
      [Opcode.Subtract],
      [Opcode.Multiply],
      [Opcode.Divide],
      [Opcode.Increment],
      [Opcode.Decrement],
      [Opcode.LoadVariable, [Type.Symbol, "abc"]],
      [Opcode.StoreVariable, [Type.Symbol, "abc"]],
      [Opcode.ShowLine],
      [Opcode.PushChoice, [Type.Number, 0]],
      [Opcode.ShowChoice, [Type.Symbol, "abc"]],
      [Opcode.EnterNode, [Type.Symbol, "abc"]],
      [Opcode.ExitNode, [Type.Symbol, "abc"]],
      [Opcode.Call, [Type.Symbol, "abc"]],
      [Opcode.EndDialogue],
    ]
  ],
];

test.each(testCases)("%j", (input: any, ctx: Context, expected: Instruction[]) => {
  const sexpr = parse(input)
  compileSExpr(ctx, sexpr);
  let actual = ctx.code;
  expect(actual).toEqual(expected);
});
