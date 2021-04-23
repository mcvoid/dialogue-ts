# Dialogue Reference

Dialogue is written similarly to Markdown.

example:

````dialogue
# Node1

Markdown headers separate the dialogue into blocks (or nodes) that can be targets for links. The header name is the destination name (or "url" for links and choices).

This is paragraph is interpreted as a single line of dialogue - a bit of text transmitted to the client as a single unit. There must be a blank row separating each line. Newlines are interpreted as spaces.

Lines can also have some limited formatting, though this is just passed through as-is to the client to decide how to format them. This includes **bold** and *italicized* text.

Lines can be interspersed with `inlineExpressions`. These expressions are part of the dialogue expression language. The delimiter is the same as markdown inline code. It can only have an expression that evaluates to a value (string, number, boolean, null).

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

```
(do
  (set! variable1 3)
  (set! variable2 (+ variable1 3))
  (if (< 3 2)
    (set! variable3 nil)
    (set! variable2 5))
  (asm
    (Label asmStart)
    (PushString "Hello")
    (PushString " World")
    (Concat)
    (ShowLine)
    (Jump asmStart))
)
```

[...](Node2)

# Node4

Nodes that don't end in a link or a choice end the dialogue. They don't have anywhere else to go.
````
