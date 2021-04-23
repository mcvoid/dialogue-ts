// The dialogue source parser
import { parseEDNString as parse } from 'edn-data'
import MarkdownIT from "markdown-it";

import { Instruction, Opcode, Program } from "./instruction-set";
import { Type } from "./values";

export const compile = (src: string): Program => {
  const md = MarkdownIT();
  const parseTree: unknown[] = md.enable([
    "link",
    "image",
    "code",
    "heading",
    "paragraph",
    "list",
    "emphasis",
    "blockquote",
  ]).parse(src, {});

  const ctx: Context = {
    code: [],
    pc: 0,
    symbolTable: {},
    backreferenceTable: [],
    parseTree,
    currentNode: null,
  };

  while (parseTree.length > 0) {
    const parseItem = ctx.parseTree.shift();
    const itemType = parseItem["type"];

    switch (itemType) {
      case "heading_open": {
        if (parseItem["tag"] != "h1") {
          throw "invalid header"
        }
        processNodeHeader(ctx);

        // shift off </h1>
        ctx.parseTree.shift();
        break;
      }
      case "paragraph_open": {
        processParagraph(ctx);

        // shift off </p>
        ctx.parseTree.shift();
        break;
      }
      case "ordered_list_open": {
        processOrderedList(ctx);
        break;
      }
      case "fence": {
        const sExpr = parse(parseItem["content"]);
        compileSExpr(ctx, sExpr);
        break;
      }
      default: {
        throw `unsupported Markdown element: ${parseItem["tag"]}`;
      }
    }
  }

  // The last node is always left open, so close it.
  if (ctx.currentNode) {
    ctx.code[ctx.pc++] = [Opcode.ExitNode, [Type.Symbol, ctx.currentNode]];
    ctx.code[ctx.pc++] = [Opcode.EndDialogue];
  }

  // Now that we know where all the nodes are in code, fill the correct addresses into the jumps.
  ctx.backreferenceTable.forEach(([node, addr]) => {
    switch (ctx.code[addr][0]) {
      case Opcode.Jump:
      case Opcode.JumpIfFalse:
      case Opcode.PushChoice:
        ctx.code[addr][1] = [Type.Number, ctx.symbolTable[node]];
        break;
      default:
        throw `invalid backreference`;
    }
  });

  return {
    start: 0,
    code: ctx.code,
  };
};

export interface Context {
  code: Instruction[];
  pc: number;
  symbolTable: {[s: string]: number};
  backreferenceTable: [string, number][];
  parseTree: unknown[];
  currentNode: string | null;
};

export const processNodeHeader = (ctx: Context) => {
  const contentNode = ctx.parseTree.shift();
  const nodeName = contentNode["content"];

  // ensure that we dan't already have an entry with this node's symbol
  if (ctx.symbolTable[nodeName] != undefined) {
    throw `duplicate symbol: ${nodeName}`;
  }

  // close out previous node, exiting if necessary
  if (ctx.currentNode) {
    ctx.code[ctx.pc++] = [Opcode.ExitNode, [Type.Symbol, ctx.currentNode]];
    ctx.code[ctx.pc++] = [Opcode.EndDialogue];
  }
  ctx.currentNode = nodeName;
  ctx.symbolTable[ctx.currentNode] = ctx.pc;
  ctx.code[ctx.pc++] = [Opcode.EnterNode, [Type.Symbol, ctx.currentNode]];
};

export const processParagraph = (ctx: Context) => {
  const contentNode = ctx.parseTree.shift();
  switch (contentNode["children"][0]["type"]) {
    case "text": {
      contentNode["children"].forEach((element, i) => {
        switch (element["type"]) {
          case "text": {
            ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, element["content"]]];
            break;
          }
          case "strong_open": {
            ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, "<b>"]];
            break;
          }
          case "strong_close": {
            ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, "</b>"]];
            break;
          }
          case "em_open": {
            ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, "<i>"]];
            break;
          }
          case "em_close": {
            ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, "</i>"]];
            break;
          }
          case "code_inline": {
            const sExpr = parse(element["content"]);
            if (isExpression(sExpr)) {
              compileSExpr(ctx, sExpr);
              break;
            }
            throw `non-expressions cannot be inlined: ${sExpr}`;
          }
        }
        if (i > 0) {
          ctx.code[ctx.pc++] = [Opcode.Concat];
        }
      });
      ctx.code[ctx.pc++] = [Opcode.ShowLine];
      break;
    }
    case "link_open": {
      const linkDest = contentNode["children"][0]["attrs"][0][1];
      const linkText = contentNode["children"][1]["content"];
  
      ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, linkText]];
      ctx.code[ctx.pc++] = [Opcode.ShowLine];
      ctx.code[ctx.pc++] = [Opcode.ExitNode, [Type.Symbol, ctx.currentNode]];
      ctx.code[ctx.pc++] = [Opcode.Jump, [Type.Number, 0]];

      // Since we don't know the link destination's address yet,
      // Mark the jump instruction's address in the reference table
      // and it will get filled in after the code generation pass.

      ctx.backreferenceTable.push([linkDest, ctx.pc-1]);
      break;
    }
    default: {
      throw JSON.stringify(contentNode, null, "  ");
    }
  }
};

export const processOrderedList = (ctx: Context) => {
  let contentNode = ctx.parseTree.shift();
  while (contentNode["type"] != "ordered_list_close") {
    if (contentNode["type"] == "list_item_open") {
      // shift the <p>
      ctx.parseTree.shift();

      const linkNode = ctx.parseTree.shift();
      processLink(ctx, linkNode["children"]);

      // shift the </p>
      ctx.parseTree.shift();
      // shift the </li>
      ctx.parseTree.shift();
      // get the next <li> or </ul>
      contentNode = ctx.parseTree.shift();
      continue;
    }
    throw `Unexpected tag ${JSON.stringify(contentNode)}`;
  }
  ctx.code[ctx.pc++] = [Opcode.ShowChoice, [Type.Symbol, ctx.currentNode]];
};

export const processLink = (ctx: Context, nodes) => {
  const linkDest = nodes[0]["attrs"][0][1];
  const linkText = nodes[1]["content"];
  ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, linkText]];
  ctx.code[ctx.pc++] = [Opcode.PushChoice, [Type.Number, 0]];

  // Since we don't know the link destination's address yet,
  // Mark the jump instruction's address in the reference table
  // and it will get filled in after the code generation pass.
  ctx.backreferenceTable.push([linkDest, ctx.pc-1]);
};

export const compileSExpr = (ctx: Context, sExpr) => {
  if (sExpr == null) {
    ctx.code[ctx.pc++] = [Opcode.PushNull];
    return;
  }
  if (isList(sExpr)) {
    compileSpecialForms(ctx, sExpr["list"]);
    return;
  }
  if (isSymbol(sExpr)) {
    ctx.code[ctx.pc++] = [Opcode.LoadVariable, [Type.Symbol, sExpr["sym"]]];
    return;
  }
  if (typeof sExpr == "number") {
    ctx.code[ctx.pc++] = [Opcode.PushNumber, [Type.Number, sExpr]];
    return;
  }
  if (typeof sExpr == "boolean") {
    ctx.code[ctx.pc++] = [Opcode.PushBool, [Type.Boolean, sExpr]];
    return;
  }
  if (typeof sExpr == "string") {
    ctx.code[ctx.pc++] = [Opcode.PushString, [Type.String, sExpr]];
    return;
  }
  throw `Unknown parse element: ${sExpr}`;
}

export enum Operator {
  GreaterThan = "gt",
  Lessthan = "lt",
  EqualTo = "eq",
  Not = "not",
  And = "and",
  Or = "or",
  Add = "+",
  Subtract = "-",
  Multiply = "*",
  Divide = "/",
  Increment = "inc",
  Decrement = "dec",
  Concat = "concat",
  Assign = "set!",
  While = "while",
  If = "if",
  Do = "do",
  DCode = "asm",
  ShowLine = "print",
  ShowChoice = "choose",
};

// Marks which forms leave a single value on the stack to be consumed, thereby being an "expression",
// as in they produce a value.
const expressionOperators: {[operator in Operator]: boolean} = {
  "gt": true,
  "lt": true,
  "eq": true,
  "not": true,
  "and": true,
  "or": true,
  "inc": true,
  "dec": true,
  "+": true,
  "-": true,
  "*": true,
  "/": true,
  "concat": true,
  "set!": false,
  "while": false,
  "if": true,
  "do": false,
  "asm": false,
  "print": false,
  "choose": false,
}

export const compileSpecialForms = (ctx: Context, sExpr) => {
  const requireExpression = (e) => {
    if (!isExpression(e)) {
      throw `not an expression: ${e}`;
    }
  }
  const first = sExpr[0];
  if (!isSymbol(first)) {
    throw `not an expression: ${sExpr}`;
  }
  switch (first["sym"]) {
    case Operator.GreaterThan: {
      if (sExpr.length !== 3) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      requireExpression(sExpr[2]);
      compileSExpr(ctx, sExpr[2]);
      ctx.code[ctx.pc++] = [Opcode.GreaterThan];
      break;
    }
    case Operator.Lessthan: {
      if (sExpr.length !== 3) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      requireExpression(sExpr[2]);
      compileSExpr(ctx, sExpr[2]);
      ctx.code[ctx.pc++] = [Opcode.Lessthan];
      break;
    }
    case Operator.EqualTo: {
      if (sExpr.length !== 3) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      requireExpression(sExpr[2]);
      compileSExpr(ctx, sExpr[2]);
      ctx.code[ctx.pc++] = [Opcode.Equal];
      break;
    }
    case Operator.Not: {
      if (sExpr.length !== 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      ctx.code[ctx.pc++] = [Opcode.Not];
      break;
    }
    case Operator.And: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      sExpr.slice(2).forEach(element => {
        requireExpression(element);
        compileSExpr(ctx, element);
        ctx.code[ctx.pc++] = [Opcode.And];
      });
      break;
    }
    case Operator.Or: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      sExpr.slice(2).forEach(element => {
        requireExpression(element);
        compileSExpr(ctx, element);
        ctx.code[ctx.pc++] = [Opcode.Or];
      });
      break;
    }
    case Operator.Add: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      sExpr.slice(2).forEach(element => {
        requireExpression(element);
        compileSExpr(ctx, element);
        ctx.code[ctx.pc++] = [Opcode.Add];
      });
      break;
    }
    case Operator.Subtract: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      sExpr.slice(2).forEach(element => {
        requireExpression(element);
        compileSExpr(ctx, element);
        ctx.code[ctx.pc++] = [Opcode.Subtract];
      });
      break;
    }
    case Operator.Multiply: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      sExpr.slice(2).forEach(element => {
        requireExpression(element);
        compileSExpr(ctx, element);
        ctx.code[ctx.pc++] = [Opcode.Multiply];
      });
      break;
    }
    case Operator.Divide: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      sExpr.slice(2).forEach(element => {
        requireExpression(element);
        compileSExpr(ctx, element);
        ctx.code[ctx.pc++] = [Opcode.Divide];
      });
      break;
    }
    case Operator.Concat: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      sExpr.slice(2).forEach(element => {
        requireExpression(element);
        compileSExpr(ctx, element);
        ctx.code[ctx.pc++] = [Opcode.Concat];
      });
      break;
    }
    case Operator.Increment: {
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      ctx.code[ctx.pc++] = [Opcode.Increment];
      break;
    }
    case Operator.Decrement: {
      if (sExpr.length !== 2) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);
      compileSExpr(ctx, sExpr[1]);
      ctx.code[ctx.pc++] = [Opcode.Decrement];
      break;
    }
    case Operator.Assign: {
      if (sExpr.length !== 3) {
        throw `invalid form ${sExpr}`;
      }
      if (!isSymbol(sExpr[1])) {
        throw `assignment target must be a symbol, got ${sExpr[1]}`
      }
      requireExpression(sExpr[2]);
      compileSExpr(ctx, sExpr[2]);
      ctx.code[ctx.pc++] = [Opcode.StoreVariable, [Type.Symbol, sExpr[1]["sym"]]];
      break;
    }
    case Operator.While: {
      if (sExpr.length !== 3) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);

      // while structure:
      //
      // (while <expr> <loopbody>)

      // while asm:
      //
      // jumpTarget:
      //    <expr>
      //    jumpIfFalse loopEnd
      //    <loopBody>
      //    jump jumpTarget
      // loopEnd:

      // top of loop
      const jumpTarget = ctx.pc;
      compileSExpr(ctx, sExpr[1]);
      const jumpIfFalseAddr = ctx.pc;
      ctx.code[ctx.pc++] = [Opcode.JumpIfFalse, [Type.Number, 0]];
      compileSExpr(ctx, sExpr[2]);
      ctx.code[ctx.pc++] = [Opcode.Jump, [Type.Number, jumpTarget]];
      // we're at loopEnd so update the jumpIfFalse to point here
      ctx.code[jumpIfFalseAddr][1] = [Type.Number, ctx.pc];
      break;
    }
    case Operator.If: {
      if (sExpr.length !== 4) {
        throw `invalid form ${sExpr}`;
      }
      requireExpression(sExpr[1]);

      // if structure:
      //
      // (if <expr> <consequence> <alternative>)

      // if asm:
      //
      //    <expr>
      //    jumpIfFalse altStart
      //    <consequence>
      //    jump ifEnd
      // altStart:
      //    <alternative>
      // ifEnd:

      // condition expression
      compileSExpr(ctx, sExpr[1]);
      const jumpIfFalseAddr = ctx.pc;
      ctx.code[ctx.pc++] = [Opcode.JumpIfFalse, [Type.Number, 0]];
      // consequence
      compileSExpr(ctx, sExpr[2]);
      const jumpAddr = ctx.pc;
      ctx.code[ctx.pc++] = [Opcode.Jump, [Type.Number, 0]];
      // update the jumpIfFalse since we're at that address
      ctx.code[jumpIfFalseAddr][1] = [Type.Number, ctx.pc];
      // alternative
      compileSExpr(ctx, sExpr[3]);
      // update the jump since we're at the end of the if block
      ctx.code[jumpAddr][1] = [Type.Number, ctx.pc];
      break;
    }
    case Operator.Do: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      sExpr.slice(1).forEach(element => {
        compileSExpr(ctx, element);
      });
      break;
    }
    case Operator.ShowLine: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      compileSExpr(ctx, sExpr[1]);
      ctx.code[ctx.pc++] = [Opcode.ShowLine];
      break;
    }
    case Operator.ShowChoice: {
      if (sExpr.length < 2) {
        throw `invalid form ${sExpr}`;
      }
      const options = sExpr.slice(1);
      options.forEach(option => {
        // (str dest)
        if (!isList(option) || !isSymbol(option["list"][1])) {
          throw `invalid form ${sExpr}`;
        }
        requireExpression(option["list"][0]);
        compileSExpr(ctx, option["list"][0]);

        ctx.backreferenceTable.push([option["list"][1], ctx.pc]);
        ctx.code[ctx.pc++] = [Opcode.PushChoice, [Type.Number, 0]]
      });;
      ctx.code[ctx.pc++] = [Opcode.ShowChoice, [Type.Symbol, ctx.currentNode]];
      break;
    }
    case Operator.DCode: {
      processDCode(ctx, sExpr);
      break;
    }
    default:
      // function call;
      sExpr.slice(1).forEach(element => {
        compileSExpr(ctx, element);
      });
      ctx.code[ctx.pc++] = [Opcode.Call, [Type.Symbol, first["sym"]]];
      break;
  }
}

export const isExpression = (sExpr): boolean => {
  if (isSymbol(sExpr)) { return true; }
  if (sExpr == null) { return true; }
  if (typeof sExpr == "number") { return true; }
  if (typeof sExpr == "string") { return true; }
  if (typeof sExpr == "boolean") { return true; }
  if (!isList(sExpr)) { throw `not a valid form ${sExpr}` }

  const list = sExpr["list"];
  const first = list[0];
  if (!isSymbol(first)) { throw `not a valid form ${sExpr}` }
  if (!expressionOperators[first["sym"]]) { return false; }
  return list.slice(1).map(isExpression).reduce((a, b) => a && b);
};

const isStatement = (sExpr): boolean => {
  if (sExpr === undefined) { throw `not a valid form ${sExpr}` }
  if (isSymbol(sExpr)) { return false; }
  if (sExpr == null) { return false; }
  if (typeof sExpr == "number") { return false; }
  if (typeof sExpr == "string") { return false; }
  if (typeof sExpr == "boolean") { return false; }
  if (!isList(sExpr)) { throw `not a valid form ${sExpr}` }

  const list = sExpr["list"];
  const first = list[0];
  if (!isSymbol(first)) { throw `not a valid form ${sExpr}` }
  if (expressionOperators[first["sym"]]) {
    return false;
  }
  if (first["sym"] == Operator.While) {
    return isExpression(list[1]) && list.slice(2).map(isStatement).reduce((a, b) => a && b);
  }
  if (first["sym"] == Operator.If) {
    return isExpression(list[1]) && list.slice(2).map(isStatement).reduce((a, b) => a && b);
  }
  if (first["sym"] == Operator.Do) {
    return list.slice(1).map(isStatement).reduce((a, b) => a && b);
  }
  if (first["sym"] == Operator.DCode) {
    return true;
  }
};

const processDCode = (ctx: Context, sExpr) => {
  sExpr.slice(1).forEach(element => {
    if (!isList(element) || !isSymbol(element["list"][0])) {
      throw `invalid asm: ${element}`;
    }
    const form = element["list"];
    switch (form[0]["sym"]) {
      case "Label": {
        if (!isSymbol(form[1])) {
          throw `invalid asm: ${form}`;
        }
        const label = form[1]["sym"];
        if (ctx.symbolTable[label] != undefined) {
          throw `duplicate symbol: ${label}`;
        }
        ctx.symbolTable[form[1]["sym"]] = ctx.pc;
        break;
      }
      case Opcode.Jump:
      case Opcode.JumpIfFalse:
      case Opcode.PushChoice:
      {
        if (!isSymbol(form[1])) {
          throw `invalid asm: ${form}`;
        }
        ctx.backreferenceTable.push([form[1]["sym"], ctx.pc]);
        ctx.code[ctx.pc++] = [form[0]["sym"], [Type.Number, 0]];
        break;
      }
      case Opcode.PushString: {
        if (!(typeof form[1] == "string")) {
          throw `invalid asm: ${form}`;
        }
        ctx.code[ctx.pc++] = [form[0]["sym"], [Type.String, form[1]]];
        break;
      }
      case Opcode.PushBool: {
        if (!(typeof form[1] == "boolean")) {
          throw `invalid asm: ${form}`;
        }
        ctx.code[ctx.pc++] = [form[0]["sym"], [Type.Boolean, form[1]]];
        break;
      }
      case Opcode.PushNumber: {
        if (!(typeof form[1] == "number")) {
          throw `invalid asm: ${form}`;
        }
        ctx.code[ctx.pc++] = [form[0]["sym"], [Type.Number, form[1]]];
        break;
      }
      case Opcode.LoadVariable:
      case Opcode.StoreVariable:
      case Opcode.ShowChoice:
      case Opcode.EnterNode:
      case Opcode.ExitNode:
      case Opcode.Call:
      {
        if (!isSymbol(form[1])) {
          throw `invalid asm: ${form}`;
        }
        ctx.code[ctx.pc++] = [form[0]["sym"], [Type.Symbol, form[1]["sym"]]];
        break;
      }
      case Opcode.PushNull:
      case Opcode.PopValue:
      case Opcode.Concat:
      case Opcode.And:
      case Opcode.Or:
      case Opcode.Not:
      case Opcode.GreaterThan:
      case Opcode.Lessthan:
      case Opcode.Equal:
      case Opcode.Add:
      case Opcode.Subtract:
      case Opcode.Multiply:
      case Opcode.Divide:
      case Opcode.Increment:
      case Opcode.Decrement:
      case Opcode.ShowLine:
      case Opcode.EndDialogue:
      {
        ctx.code[ctx.pc++] = [form[0]["sym"]];
        break;
      } 
    }
  });
}

const isList = (sExpr): boolean => {
  if (sExpr == null) {
    return false;
  }
  if (typeof sExpr !== "object") {
    return false;
  }
  return Object.keys(sExpr).includes("list");
}

const isSymbol = (sExpr): boolean => {
  if (sExpr == null) {
    return false;
  }
  if (typeof sExpr !== "object") {
    return false;
  }
  return Object.keys(sExpr).includes("sym");
}
