// The dialog virtual machine
import { Program, Instruction, Opcode, stackNeeded } from "./instruction-set";
import { Nil, NumberValue, StringValue, Type, Value } from "./values";

export interface NewVMArgs {
  program: Program;
  handleEnterNode?: EnterNodeHandler;
  handleExitNode?: ExitNodeHandler;
  handleShowLine?: ShowLineHandler;
  handleEndDialogue?: EndDialogueHandler;
  handleShowChoice?: ShowChoiceHandler;
  functions?: {[functionName: string]: [Func, Prototype]};
};

export const defaultCallback = () => ExecutionType.Continue;

export const NewVM = (args: NewVMArgs): VM => {
  const { code, start } = args.program;
  return makeVM({
    runState: RunState.Stopped,
    code,
    start,
    pc: 0,
    stack: [],
    variables: {},
    choices: [],
    currentNode: "",
    functions: args.functions || {},
    handleEnterNode: args.handleEnterNode || defaultCallback,
    handleExitNode: args.handleExitNode || defaultCallback,
    handleShowLine: args.handleShowLine || defaultCallback,
    handleEndDialogue: args.handleEndDialogue || defaultCallback,
    handleShowChoice: args.handleShowChoice || defaultCallback,
  });
};

export interface VM {
  run: () => void;
  resume: () => void;
  reset: () => void;
  choose: (choice: number) => void;
}; 

export enum ExecutionType {
  Pause,
  Continue,
}
export type Func = (...args: Value[]) => ExecutionType;
export type Prototype = Type[];

export type EnterNodeHandler = (vm: VM, node: string) => ExecutionType;
export type ExitNodeHandler = (vm: VM, node: string) => ExecutionType;
export type ShowLineHandler = (vm: VM, line: string) => ExecutionType;
export type ShowChoiceHandler = (vm: VM, choices: string[]) => void;
export type EndDialogueHandler = (vm: VM) => void;

export enum RunState {
  Running,
  Suspended,
  WaitingForInput,
  Stopped,
  Error,
}

export interface vm {
  runState: RunState;
  code: Instruction[];
  start: number;
  pc: number;
  stack: Value[];
  choices: [StringValue, NumberValue][];
  variables: { [name: string]: Value };
  currentNode: string;
  functions: {[functionName: string]: [Func, Prototype]};
  handleEnterNode: EnterNodeHandler;
  handleExitNode: ExitNodeHandler;
  handleShowLine: ShowLineHandler;
  handleEndDialogue: EndDialogueHandler;
  handleShowChoice: ShowChoiceHandler;
};

export const makeVM = (vm: vm): VM => ({
  run: () => {
    if (vm.runState != RunState.Stopped) {
      throw "cannot run a VM already running";
    }
    // clean slate in case this is running from reset
    vm.runState = RunState.Running;
    vm.pc = vm.start;
    vm.stack = [];
    vm.variables = {};
    vm.choices = [];

    // go
    run(vm);
  },
  resume: () => {
    if (vm.runState != RunState.Suspended) {
      throw "cannot resume VM that is not suspended";
    }
    vm.runState = RunState.Running;
    run(vm);
  },
  reset: () => {
    vm.runState = RunState.Stopped;
  },
  choose: (choice: number) => {
    if (vm.runState != RunState.WaitingForInput) {
      throw "cannot make choice VM that is not waiting for input";
    }

    const choices = vm.choices.map(([, dest]) => dest[1]);
    if (choice < 0 || choice >= choices.length) {
      throw "choice selection out of range";
    }

    vm.runState = RunState.Running;
    const executionType = vm.handleExitNode(makeVM(vm), vm.currentNode);
    if (executionType == ExecutionType.Pause) {
      vm.runState = RunState.Suspended;
    }
    vm.pc = choices[choice];
    vm.choices = [];
    run(vm);
  },
});

export const run = (vm: vm) => {
  while (vm.runState == RunState.Running) {
    singleStep(vm);
  }
};

export const singleStep = (vm: vm) => {
  const instr = vm.code[vm.pc];
  vm.pc++;

  const size = stackNeeded[instr[0]];
  if (vm.stack.length < size) {
    vm.runState = RunState.Error;
    throw `vm stack underflow`;
  }

  switch (instr[0]) {
    case Opcode.Call: {
      const [,[,funcName]] = instr;
      if (!vm.functions[funcName]) {
        vm.runState = RunState.Error;
        throw `function does not exist: ${funcName}`;
      }
      const [fn, proto] = vm.functions[funcName];
      if (vm.stack.length < proto.length) {
        vm.runState = RunState.Error;
        throw `vm stack underflow`;
      }
      const params: Value[] = [];
      while (params.length) {
        const argType = proto.pop();
        const param = vm.stack.pop();
        if (param[0] != argType) {
          vm.runState = RunState.Error;
          throw `vm stack underflow`;
        }
        params.unshift(param);
      }
      const executionType = fn.apply(null, params);
      if (executionType == ExecutionType.Pause) {
        vm.runState = RunState.Suspended;
      }
      break;
    }
    case Opcode.EndDialogue: {
      vm.handleEndDialogue(makeVM(vm));
      vm.runState = RunState.Stopped;
      break;
    }
    case Opcode.EnterNode: {
      const [,[,node]] = instr;
      vm.currentNode = node;
      const executionType = vm.handleEnterNode(makeVM(vm), node);
      if (executionType == ExecutionType.Pause) {
        vm.runState = RunState.Suspended;
      }
      break;
    }
    case Opcode.ExitNode: {
      const [,[,node]] = instr;
      const executionType = vm.handleExitNode(makeVM(vm), node);
      if (executionType == ExecutionType.Pause) {
        vm.runState = RunState.Suspended;
      }
      break;
    }
    case Opcode.ShowLine: {
      const line = vm.stack.pop();
      if (line[0] != Type.String) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(line)} is not of type string`;
      }
      const executionType = vm.handleShowLine(makeVM(vm), line[1]);
      if (executionType == ExecutionType.Pause) {
        vm.runState = RunState.Suspended;
      }
      break;
    }
    case Opcode.Jump: {
      const [,[,dest]] = instr;
      vm.pc = dest;
      break;
    }
    case Opcode.JumpIfFalse: {
      const [,[,dest]] = instr;
      const val = vm.stack.pop();
      if (val[0] != Type.Boolean) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val)} is not of type boolean`;
      }
      const cond = val[1];
      if (!cond) {
        vm.pc = dest;
      }
      break;
    }
    case Opcode.PushString:
    case Opcode.PushBool: 
    case Opcode.PushNumber:
    {
      const [,val] = instr;
      vm.stack.push(val);
      break;
    }

    case Opcode.PushNull: {
      vm.stack.push(Nil);
      break;
    }

    case Opcode.PopValue: {
      vm.stack.pop();
      break;
    }

    case Opcode.Concat: {
      const [,val1] = vm.stack.pop();
      const [,val2] = vm.stack.pop();
      vm.stack.push([Type.String, `${val1}${val2}`]);
      break;
    }

    case Opcode.Add: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type number`;
      }
      if (val2[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type number`;
      }
      vm.stack.push([Type.Number, val1[1] + val2[1]]);
      break;
    }

    case Opcode.Subtract: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type number`;
      }
      if (val2[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type number`;
      }
      vm.stack.push([Type.Number, val1[1] - val2[1]]);
      break;
    }

    case Opcode.Divide: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type number`;
      }
      if (val2[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type number`;
      }
      vm.stack.push([Type.Number, val1[1] / val2[1]]);
      break;
    }

    case Opcode.Multiply: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type number`;
      }
      if (val2[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type number`;
      }
      vm.stack.push([Type.Number, val1[1] * val2[1]]);
      break;
    }

    case Opcode.GreaterThan: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type number`;
      }
      if (val2[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type number`;
      }
      vm.stack.push([Type.Boolean, val1[1] > val2[1]]);
      break;
    }

    case Opcode.Lessthan: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type number`;
      }
      if (val2[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type number`;
      }
      vm.stack.push([Type.Boolean, val1[1] < val2[1]]);
      break;
    }

    case Opcode.And: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Boolean) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type boolean`;
      }
      if (val2[0] !== Type.Boolean) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type boolean`;
      }
      vm.stack.push([Type.Boolean, val1[1] && val2[1]]);
      break;
    }

    case Opcode.Or: {
      const val2 = vm.stack.pop();
      const val1 = vm.stack.pop();
      if (val1[0] !== Type.Boolean) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val1)} is not of type boolean`;
      }
      if (val2[0] !== Type.Boolean) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val2)} is not of type boolean`;
      }
      vm.stack.push([Type.Boolean, val1[1] || val2[1]]);
      break;
    }

    case Opcode.Not: {
      const val = vm.stack.pop();
      if (val[0] !== Type.Boolean) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val)} is not of type boolean`;
      }
      vm.stack.push([Type.Boolean, !val[1]]);
      break;
    }

    case Opcode.Increment: {
      const val = vm.stack.pop();
      if (val[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val)} is not of type number`;
      }
      vm.stack.push([Type.Number, val[1]+1]);
      break;
    }

    case Opcode.Decrement: {
      const val = vm.stack.pop();
      if (val[0] !== Type.Number) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(val)} is not of type number`;
      }
      vm.stack.push([Type.Number, val[1]-1]);
      break;
    }

    case Opcode.LoadVariable: {
      const [,[,name]] = instr;
      let val = vm.variables[name];
      if (!val) {
        val = Nil;
      }
      vm.stack.push(val);
      break;
    }

    case Opcode.StoreVariable: {
      const [,[,name]] = instr;
      const val = vm.stack.pop();
      vm.variables[name] = val;
      break;
    }

    case Opcode.PushChoice: {
      const [,dest] = instr;

      const str = vm.stack.pop();
      if (str[0] !== Type.String) {
        vm.runState = RunState.Error;
        throw `value ${JSON.stringify(str)} is not of type string`;
      }
      vm.choices.push([str, dest]);
      break;
    }

    case Opcode.ShowChoice: {
      const choiceOptions = vm.choices.map(([str,]) => str[1]);
      vm.runState = RunState.WaitingForInput;
      vm.handleShowChoice(makeVM(vm), choiceOptions);
      break;
    }

    default:
      vm.runState = RunState.Error;
      throw `invalid instruction: ${JSON.stringify(instr)}`;
  }
};
