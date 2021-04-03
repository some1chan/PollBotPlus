<style>
/* Sets different code text colors for different themes */
html[data-theme=light] {
    --code-color: #11806a;
}
html[data-theme=dark] {
    --code-color: #23dfb6;
}
code {
	color: var(--code-color);
}

/* Variables */
:root {
	--new-accent: #1abc9c;
    --brand: 26,188,156;
}

/* Sets a new accent color for Top.gg elements */
.site-nav {
    background: var(--new-accent);
}
.entity-header__button-icon {
   background: var(--new-accent);
}
/* Invite button */
.kqdrrU {
   color: #fff;
}
.fhdYEi {
   color: #fff;
}

/* Alignment things */
.content h2:not(:first-child) {
    margin-top: 0;
}
.pbp-container {
    padding: 10px; 
}

/* Example images */
.simple-poll {
    display: block;
}
.simple-poll-smol {
    display: none;
}
.custom-options {
    display: block;
}
.custom-options-900 {
    display: none;
}

#invite-long {
    display: block;
}
#invite-short {
    display: none;
}

.pbp-flex-box {
    display: flex;
}

/* Shows a smaller simple-poll variation */
@media only screen and (max-width: 768px) {
    :root {
        /* Green */
        background: #123333;
    }
    .simple-poll {
        display: none;
    }
    .simple-poll-smol {
        display: block;
    }
    .custom-options {
        display: none;
    }
    .custom-options-900 {
        display: block;
    }
    #invite-long {
        display: none;
    }
    #invite-short {
        display: block;
    }
    .extra-spaces {
        display: none;
    }
}

/* Compress buttons and hide some elements */
@media only screen and (max-width: 450px) {
    :root {
        /* Gray but horrible contrast */
        background: #aaaaaa;
    }
    .pbp-flex-box {
        display: block;
    }
    .pbp-container {
        padding: 2px 10px;
    }
    .pbp-head {
        display: none;
    }
}

/* Shows the image on the bottom */
@media only screen and (min-width: 768px) {
    :root {
        /* Dark */
        background: #15171e;
    }
    .custom-options {
        display: none;
    }
    .custom-options-900 {
        display: block;
    }
}

/* Shows the image to the right */
@media only screen and (min-width: 900px) {
    :root {
        /* Blue */
        background: #123456;
    }
    .custom-options {
        display: block;
    }
    .custom-options-900 {
        display: none;
    }
}
</style>

<div class="pbp-head">
    <!-- Bot Icon -->
    <img src="https://i.imgur.com/AH8iOGL.png" style="text-align: center; display: block; margin: 0 auto; padding-bottom: 10px;">
    <p style="
        text-align: center;
        font-size: 3em;
        margin: .25em .25em .25em .25em;
        color: var(--text);
        font-weight: 600;
        line-height: 1.125;"
    >PollBotPlus</p>
    <p style="text-align: center">Create quick, easy, and beautiful Discord polls.</p>
    <!-- Invite and vote buttons copied from top.gg -->
    <div class="pbp-flex-box">
        <div style="margin: 0 auto 0 auto">
            <div class="pbp-container">
                <a class="entity-button--primary entity-header__button hoverable" href="/bot/804245390642642965/invite" style="margin-top: 0">
                <span class="entity-header__button-icon"><i class="user plus icon"></i></span>
                <span class="entity-header__button-text" id="invite-long">Invite Now</span>
                <span class="entity-header__button-text" id="invite-short">Invite Now</span>
                </a>
            </div>  
        </div>
        <!-- <div style="margin: 0 0 0 auto">
            <div class="pbp-container">
                <a class="entity-button--primary entity-header__button hoverable" href="/bot/804245390642642965/invite" style="margin-top: 0">
                <span class="entity-header__button-icon"><i class="user plus icon"></i></span>
                <span class="entity-header__button-text" id="invite-long">Invite Now</span>
                <span class="entity-header__button-text" id="invite-short">Invite Now</span>
                </a>
            </div>  
        </div> -->
        <!-- <div style="margin: 0 auto 0 0">
            <div class="pbp-container">
                <a style="margin-top: revert;" href="/bot/804245390642642965/vote" class="entity-button--primary entity-header__button hoverable">
                    <span class="entity-header__button-icon" style="background: var(--gray-400)">
                    <i class="trophy icon"></i>
                    </span>
                    <span class="entity-header__button-text">
                    Vote for Me
                    </span>
                </a>
            </div>
        </div> -->
    </div>
</div>

<br />

<picture class="simple-poll" style="text-align: center">
    <source srcset="https://cdn.discordapp.com/attachments/804479283959562300/819140028104966164/SimplePoll.webp" type="image/webp" >
    <source srcset="https://i.imgur.com/3g5hsCp.gif" type="image/gif"> 
    <img src="https://i.imgur.com/3g5hsCp.gif" alt="Example of a simple poll">
</picture>

<picture class="simple-poll-smol" style="text-align: center">
    <source srcset="https://cdn.discordapp.com/attachments/804479283959562300/819148165622136862/SimplePollMini.webp" type="image/webp" >
    <source srcset="https://i.imgur.com/yYB0YKB.gif" type="image/gif"> 
    <img src=https://i.imgur.com/yYB0YKB.gif alt="Example of a simple poll">
</picture>

<!-- Adds some distance -->
<br /><br />
<!-- <div class="extra-spaces">
    <br /><br />
</div> -->

<!-- Custom options on the right-hand side, if applicable -->
<picture class="custom-options" style="float: right; padding: 0 0 32px 32px">
    <source srcset="https://cdn.discordapp.com/attachments/804479283959562300/819150717108617226/EmbedPoll.webp" type="image/webp">
    <source srcset="https://i.imgur.com/oJanGbF.gif" type="image/gif">
    <img src=https://i.imgur.com/oJanGbF.gif alt="Example poll with custom options">
</picture>

## Features

-   Clean visual design language
-   Simple when you start, powerful when you need it
    -   Custom options and reactions 🐱 🐶 <!-- -   Anonymous and timed polls -->
    -   Single-vote polls
    -   ...or just keep it simple!
-   Use `poll:` as a trigger — great for [Poll Bot](https://top.gg/bot/pollbot) users wanting to upgrade.

## Getting Started

[To get started, invite PollBotPlus to your Discord server.](https://top.gg/bot/804245390642642965/invite)

The bot will send a message, telling you how to use it. You can show this help message again by typing `.help`. You'll get a Quick Start there, containing the following commands:

-   `.poll Do you like pancakes?`
-   `.poll Best Doki? "Monika" "Just Monika"`
-   `.poll single "ANIME'S REAL, RIGHT?" "Real" "Not Real"`

Try copying and pasting them, and start playing around them with them!

<!-- Custom options example at the bottom -->
<picture class="custom-options-900" style="padding: 32px 0; text-align: center; margin: 0 auto;">
    <source srcset="https://cdn.discordapp.com/attachments/804479283959562300/819150412991954965/EmbedPollCropped.webp" type="image/webp">
    <source srcset="https://i.imgur.com/WedkfLn.gif" type="image/gif">
    <img src=https://i.imgur.com/WedkfLn.gif alt="Example poll with custom options">
</picture>

## Changing the Prefix

To change this bot's prefix, use `.prefix`. If you ever forget what this bot's prefix is, or what you've changed it to, you can always use `@PollBotPlus prefix` to find and change it. `@PollBotPlus` will _always_ be a valid prefix for commands from this bot, no matter what server its in.
