import { Instruction, Opcode } from "./instruction-set";
import { Type, Value } from "./values";
import { ExecutionType, run, RunState, vm } from "./vm";

const go = () => ExecutionType.Continue;
const pause = () => ExecutionType.Pause;

const NewVMGo = (code: Instruction[]): vm => ({
  runState: RunState.Running,
  code,
  start: 0,
  pc: 0,
  stack: [],
  choices: [],
  variables: {},
  currentNode: null,
  functions: {},
  handleEnterNode: go,
  handleExitNode: go,
  handleShowLine: go,
  handleEndDialogue: go,
  handleShowChoice: go,
});

const stackProcessingCases: [Instruction[], Value[]][] = [
  [
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.EndDialogue],
    ],
    [[Type.Number, 3]]
  ],
  [
    [
      [Opcode.PushString, [Type.String, "3"]],
      [Opcode.EndDialogue],
    ],
    [[Type.String, "3"]]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.EndDialogue],
    ],
    [[Type.Boolean, true]]
  ],
  [
    [
      [Opcode.PushNull],
      [Opcode.EndDialogue],
    ],
    [[Type.Nil, null]]
  ],
  [
    [
      [Opcode.PushNull],
      [Opcode.PopValue],
      [Opcode.EndDialogue],
    ],
    []
  ],
  [
    [
      [Opcode.Jump, [Type.Number, 5]],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.EndDialogue],
    ],
    []
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.JumpIfFalse, [Type.Number, 6]],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.EndDialogue],
    ],
    []
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.JumpIfFalse, [Type.Number, 6]],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.PushNull],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Nil, null],
      [Type.Nil, null],
      [Type.Nil, null],
      [Type.Nil, null],
    ]
  ],
  [
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Add],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Number, 7],
    ]
  ],
  [
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Subtract],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Number, -1],
    ]
  ],
  [
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Multiply],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Number, 3*4],
    ]
  ],
  [
    [
      [Opcode.PushNumber, [Type.Number, 3]],
      [Opcode.PushNumber, [Type.Number, 4]],
      [Opcode.Divide],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Number, 3/4],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.And],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, true],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.And],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, false],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.And],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, false],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.And],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, false],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.Or],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, true],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.Or],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, true],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.Or],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, true],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.Or],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, false],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, false]],
      [Opcode.Not],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, true],
    ]
  ],
  [
    [
      [Opcode.PushBool, [Type.Boolean, true]],
      [Opcode.Not],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Boolean, false],
    ]
  ],
  [
    [
      [Opcode.PushNumber, [Type.Number, 17]],
      [Opcode.Increment],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Number, 18],
    ]
  ],
  [
    [
      [Opcode.PushNumber, [Type.Number, 17]],
      [Opcode.Decrement],
      [Opcode.EndDialogue],
    ],
    [
      [Type.Number, 16],
    ]
  ],
];
test.each(stackProcessingCases)("%j", (input: Instruction[], expected: Value[]) => {
  const vm = NewVMGo(input);
  run(vm);
  const actual = vm.stack;
  expect(actual).toEqual(expected);
});

test("vm handles memory overflow", () => {
  let vm = NewVMGo([]);
  expect(() => { run(vm) }).toThrow();

  vm = NewVMGo([[Opcode.EndDialogue]]);
  expect(() => { run(vm) }).not.toThrow();
});

test("variable table updates", () => {
  let vm = NewVMGo([
    [Opcode.PushNumber, [Type.Number, 17]],
    [Opcode.StoreVariable, [Type.Symbol, "abc"]],
    [Opcode.EndDialogue],
  ]);
  run(vm);
  
  expect(vm.stack).toEqual([]);
  expect(vm.variables).toEqual({ abc: [Type.Number, 17] });

  vm = NewVMGo([
    [Opcode.LoadVariable, [Type.Symbol, "abc"]],
    [Opcode.EndDialogue],
  ])
  vm.variables["abc"] = [Type.Number, 6];
  run(vm);
  expect(vm.stack).toEqual([[Type.Number, 6]]);
});