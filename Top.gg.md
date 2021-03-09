<style>
:root {
	--new-accent: #1abc9c;
}

/* Sets different colors for themes */
html[data-theme=light] {
    --code-color: #11806a;
}
html[data-theme=dark] {
    --code-color: #23dfb6;
}

.site-nav {
    background: var(--new-accent);
}

.entity-header__button-icon {
   background: var(--new-accent);
}

code {
	color: var(--code-color);
}

.content h1:not(:first-child) {
    margin-top: .6em;
}

.content h2:not(:first-child) {
    /* margin-top: 1.1428em; */
    margin-top: 0;
}
</style>

<img src="https://i.imgur.com/AH8iOGL.png" style="text-align: center;display: block;margin: 0 auto;/*! padding: 21px; */padding-bottom: 10px;">
<p style="
    text-align: center;
    font-size: 3em;
    margin: .25em .25em .25em .25em;
    color: var(--text);
    font-weight: 600;
    line-height: 1.125;"
>PollBotPlus</p>
<p style="text-align: center">Create polls on Discord quickly, easily, and beautifully.</p>
<br />

<!-- SimplePoll8990 -->
<img style="display: block; margin-left: auto; margin-right: auto;" src=https://i.imgur.com/3g5hsCp.gif alt="Example GIF of a simple poll; Do you like pancakes?">
<br />
<br />
<br />
<!-- EmbedPollSlightShortTallCropped -->
<!-- <img style="float: right; padding: 0 0 32px 32px" src=https://i.imgur.com/YxrQN0e.gif alt="Example GIF of an embed poll; Best Doki? A: Monika, B: Just Monika"> -->
<img style="float: right; padding: 0 0 32px 32px" src=https://i.imgur.com/oJanGbF.gif alt="Example GIF of an embed poll; Best Doki? A: Monika, B: Just Monika">

## Features

-   Clean visual design language
-   Simple when you start, powerful when you need it
    -   Custom options and reactions 🐱 🐶 <!-- -   Anonymous and timed polls -->
    -   Single-vote polls
    -   ...or just keep it simple!
-   Use `poll:` as a trigger — great for Poll Bot users wanting to upgrade.

## Getting Started

[To get started, invite PollBotPlus to your Discord server.](https://top.gg/bot/804245390642642965/invite)

The bot will send a message, telling you how to use it. You can show this help message again by typing `.help`. You'll get a Quick Start there, containing the following commands:

-   `.poll Do you like pancakes?`
-   `.poll Best Doki? "Monika" "Just Monika"`
-   `.poll single "ANIME'S REAL, RIGHT?" "Real" "Not Real"`

Try copying and pasting them, and start playing around them with them!

## Changing the Prefix

To change this bot's prefix, use `.prefix`. If you ever forget what this bot's prefix is, or what you've changed it to, you can always use `@PollBotPlus prefix` to find and change it. `@PollBotPlus` will _always_ be a valid prefix for commands from this bot, no matter what server its in.

<!-- Copied from top.gg -->
<div class="pbp-flex-box" style="display: flex">
    <div class="pbp-flex-container" style="margin: 0 auto; padding: 10px">
        <a class="entity-button--primary entity-header__button hoverable" target="_blank" onclick="trackInvite('804245390642642965', '')" href="/bot/804245390642642965/invite" style="margin-top: 0">
        <span class="entity-header__button-icon"><i class="user plus icon"></i></span>
        <span class="entity-header__button-text">Invite PollBotPlus to your Discord Server</span>
        </a>
    </div>
</div>
