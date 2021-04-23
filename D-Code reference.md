# D-Code Reference

| Instruction   | Arg Type | Stack                           | Other                                                                             |
| -----------   | -------- | --------------------------------| --------------------------------------------------------------------------------- |
| PushString    | string   | [] -> [string]                  | Pushes a string onto the stack                                                    |
| PushNumber    | number   | [] -> [string]                  | Pushes a number onto the stack                                                    |
| PushBoolean   | boolean  | [] -> [string]                  | Pushes a boolean onto the stack                                                   |
| PushNull      |          | [] -> [null]                    | Pushes null onto the stack                                                        |
| PopValue      |          | [value] -> []                   | Pops a value from the stack                                                       |
| Jump          | number   | [] -> []                        | Transfers execution to a different point in the code                              |
| JumpIfFalse   | number   | [boolean] -> []                 | Transfers execution to a different point in the code if the popped value is false |
| Concat        |          | [value, value] -> [string]      | Converts two popped values into strings and concatenates them                     |
| And           |          | [boolean, boolean] -> [boolean] | Pushes the logical and of the top two values on the stack                         |
| Or            |          | [boolean, boolean] -> [boolean] | Pushes the logical or of the top two values on the stack                          |
| Not           |          | [boolean] -> [boolean]          | Pushes the logical not of the top value on the stack                              |
| Equal         |          | [value, value] -> [boolean]     | Pushes whether two top values on the stack are equal                              |
| GreaterThan   |          | [number, number] -> [boolean]   | Pushes whether two top values on the stack have a > relationship                  |
| LessThan      |          | [number, number] -> [boolean]   | Pushes whether two top values on the stack have a < relationship                  |
| Add           |          | [number, number] -> [boolean]   | Pushes sum of two top values on the stack                                         |
| Subtract      |          | [number, number] -> [boolean]   | Pushes difference of two top values on the stack                                  |
| Multiply      |          | [number, number] -> [boolean]   | Pushes product of two top values on the stack                                     |
| Divide        |          | [number, number] -> [boolean]   | Pushes quotient of two top values on the stack                                    |
| Increment     |          | [number] -> [number]            | Pushes the increment of the top stack value                                       |
| Decrement     |          | [number] -> [number]            | Pushes the decrement of the top stack value                                       |
| LoadVariable  | symbol   | [] -> [value]                   | Push the value at the given variable name or null if none exists                  |
| StoreVariable | symbol   | [value] -> []                   | Push the value at the top of the stack to the given variable name or null if none |
| ShowLine      |          | [string] -> []                  | Invokes the handleShowLine callback with the top value on the stack               |
| PushChoice    |          | [string, number] -> []          | Queues of an option for the next time a choice is presented                       |
| ShowChoice    |          | [] => []                        | Invokes the handleShowChoice callback with the previously pushed choices          |
| EnterNode     | symbol   | [] => []                        | Invokes the handleEnterNode callabck with the supplied node name                  |
| ExitNode      | symbol   | [] => []                        | Invokes the handleExitNode  callabck with the supplied node name                  |
| EndDialogue   |          | [] => []                        | Invokes the handleEndDialogue callback and halts execution                        |
| Call          | symbol   | varies                          | Invokes a user-supplied function                                                  |
