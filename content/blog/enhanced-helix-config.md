+++
title = "Enhancing Your Helix Editor: A Guide to Optimal Configuration"
description = "Here are some ideas of how to improve your Helix experience using a better configuration."
date = 2023-06-07
updated = 2024-12-02
draft = false
template = "blog/page.html"
+++

I've been daily driving Helix editor for a few months now, and love its simplicity and approach to modal editing.

I'm ashamed to say I was a VSCoder for many years before switching, and had given NeoVim a serious try, but the amount of
configuration to manage is just too much in my opionion.

Despite Helix's awesome defaults, there were a few changes I've made to my configuration,
and wanted to share them in case they may be useful to others.

All the configuration in this blog are not the defaults Helix has as of the time of writing this...
but Helix might update in the future to include some of these configs as defaults.
I'll try my best to update this if that happens.

### Editor Configuration

**Common Editor Configuration**

Add a bufferline, cursorline, relative line numbers, ruler, and true color.

```toml
[editor]
# Show currently open buffers, only when more than one exists.
bufferline = "multiple"
# Highlight all lines with a cursor
cursorline = true
# Use relative line numbers
line-number = "relative"
# Show a ruler at column 120
rulers = [120]
# Force the theme to show colors
true-color = true
```

**Cursor Shape**

Show a bar cursor in insert mode, a block cursor in normal mode, and underline cursor in select mode.

```toml
[editor.cursor-shape]
insert = "bar"
normal = "block"
select = "underline"
```

**Indentation Guides**

Render indentation guides.

```toml
[editor.indent-guides]
character = "╎"
render = true
```

**LSP**

Disable annoying popups and display useful LSP messages in the status line.

```toml
[editor.lsp]
# Disable automatically popups of signature parameter help
auto-signature-help = false
# Show LSP messages in the status line
display-messages = true
```

**Status Line**

Add the git branch to the status line.

```toml
[editor.statusline]
left = ["mode", "spinner", "version-control", "file-name"]
```

### Key Bindings

#### Navigating Buffers with <kbd>Alt</kbd> <kbd>,</kbd> <kbd>.</kbd>

This adds support for navigate between open buffers using <kbd>Alt</kbd> <kbd>,</kbd> and <kbd>Alt</kbd> <kbd>.</kbd>,
as well as closing the current buffer with <kbd>Alt</kbd> <kbd>w</kbd>.

```toml
[keys.normal]
"A-," = "goto_previous_buffer"
"A-." = "goto_next_buffer"
"A-w" = ":buffer-close"
"A-/" = "repeat_last_motion"
```

Helix doesn't have a default keybinding for navigating between buffers.
The only way by default is either using <kbd>Space</kbd> <kbd>b</kbd> to open the buffer picker,
or using the `:bn` and `:bp` commands.

This keybinding has been immensely useful for me to navigate between open buffers.

Unfortunately <kbd>Alt</kbd> <kbd>.</kbd> is already a keybinding which repeats the last motion,
but since I have never found myself using it, I've rebound it to <kbd>Alt</kbd> <kbd>/</kbd> to avoid
conflicting with our new keybind.

#### Shrink a Line Up with <kbd>Shift</kbd> <kbd>x</kbd>

This adds a function to "unselect" the previous line when you've accidentally selected too many lines.

The usual <kbd>x</kbd> extends the selection to the next line, but what if you've selected one line too many?
Normally, you would have to navigate back up and start the selection all over again.
But with this tweak, you can simply press <kbd>Shift</kbd> <kbd>x</kbd> to shrink your selection by one line,
making the process much more efficient.

```toml
[keys.normal]
A-x = "extend_to_line_bounds"
X = "select_line_above"

[keys.select]
A-x = "extend_to_line_bounds"
X = "select_line_above"
```

### Conclusion

In conclusion, Helix is awesome out of the box, but with a few small changes to its configuration it can be improved
significantly with some small tweaks to its config.
