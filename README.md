# IdleReps

A workout plan and tracker for Claude Code. It builds a plan around the equipment you have, and while
your agent works on something long it hands you one set at a time. Press `1` to log it and get back to
work. No gear needed, and nothing leaves your machine.

## Install

Requires Claude Code 2.1.287 or later. From your shell:

```sh
claude plugin marketplace add boringops-dan/idlereps
claude plugin install idlereps@idlereps
```

Or inside Claude Code:

```
/plugin marketplace add boringops-dan/idlereps
/plugin install idlereps@idlereps
```

Then start a new session. Swolomon walks on just above the prompt (a toast points the way), introduces
himself, and asks how you want to train:

- **Quick start** (`1`): where do you train (a desk, home with no gear, or with weights), and your first
  set is offered right there. Two presses. The next set comes while your agent works on something long.
- **Just remind me** (`2`): no plan. While your agent works, Swolomon says do a set, anything (with a few
  ideas), and one tap logs what it worked: upper, lower, cardio or other. It counts like any set.
- **Build my own** (`3`): **Build it with me** (your gear, days and goal) or **I have my own** (paste it
  after `/workout plan`, in any format, or write the plan file by hand).

The safety note rides on the first set offered, one row, until you start one. Not now? Later sessions open
quietly; while your agent works on something long, Swolomon asks once that day, five times at most.
`/workout dontask` ends it; `/workout setup`, `/workout remind` or `/workout swolomon` start it any time.

Already have a plan (written by hand, or brought over from the prototype)? Swolomon still introduces
himself, once, with **Keep my plan** in place of Quick start. Until then, `/workout` brings him up rather
than going straight into a workout.

Update: `claude plugin marketplace update idlereps` (or `/plugin marketplace update idlereps`).

## What it does

1. You send a prompt and your agent gets to work.
2. When it looks like a long one, a band above the prompt asks if you have time for a set, and names it:
   `First up: Squats, 12 reps · about 45 s.` IdleReps reads the hints your agent gives: a test run or a
   build, a helper agent, a long command timeout, a to-do list, a background job it's watching, lots of
   tool calls, or just a minute going by. When the agent schedules its own wake-up, Swolomon says how long
   it's away: "Your agent's back in about 5 min."
3. Say yes and you get one set: `Squats: 12 reps (1/2)`. Do it, press `1`, and get back to work.
4. The next set comes after a gap (15 minutes by default), never more often, and never while you're typing.
   In Just remind me the ideas fit the wait: a quick one when your turns usually run short, a set for a
   few minutes, a walk when a long build or a helper agent is under way ("Ideas for about 8 min: a lap of
   the block · …").
5. Your plan progresses: hit the top of the rep range and it moves you on to more reps, more weight, or a
   harder variant.

## Showing up beats doing nothing

Any exercise is better than none, so IdleReps never makes it all or nothing:

- **Just half.** Every offer has `4: Just half` (or `/workout half`): each exercise's sets halved. It counts
  for your week and your streak; it just doesn't raise your targets.
- **Low days count.** After a week away, or the day after a workout you rated Tough, Swolomon suggests
  half. No catching up, ever.
- **Good days push.** Rate a workout Easy and you get one bonus set at your new target.
- **No streak shame.** Miss a day and the Workout pane says how many days you showed up this month, not
  "Streak 0".
- **It backs off.** Three Laters in a row and IdleReps waits twice as long for the rest of the day. Say
  Not today on the same weekday three weeks running and Swolomon offers to move that day.
- **Rest days.** A long turn on a day off offers one desk stretch instead of a set.
- **A target that follows you.** In Just remind me the footer counts today's moves against a target taken
  from your usual active day (`💪 2/3 today`), a little lower in a rough week. Never a debt.
- **Stand up.** Two hours of your agent working with nothing moved, and Swolomon asks you to stand up
  with him, once a day. One tap, and it counts as moving.
- **The punch card.** A stamp for each day you move, in a row or not. Ten stamps and he drinks a free
  protein shake for you, slowly, while you watch.

## Getting stronger, where you can see it

- Every logged set says how it compares: `· new best`, or `· ↑2 on last time`, or `· heavier than last
  time`.
- A finished workout names what you did on target every set; once you rate it, a toast says what goes up
  next time: `Stronger already. Next time: Squats 13 reps.`
- The Workout pane's **Since day 1** row shows how far you've come: `Squats 12 → 18 reps · Incline push-ups →
  Push-ups`.
- The pane counts the time you've moved: `Moved 12 min this week while your agent worked · 1 h 4 min since
  day 1`, and once an exercise has three days of history its row draws the trend: `▁▃▅█`.
- Finish a week of a plan and Swolomon celebrates: the pane and the rating band show the week's finish
  line, `Week 1: 2 of 3 workouts ●●○`.
- A turn you trained through ends with what you did meanwhile: `Baked for 6m 12s · 2 sets while you
  waited 💪`, and if your agent's tests passed (or didn't), or it committed or opened a PR, Swolomon has a
  word about that too. While today's workout is under way the spinner lifts too.

## Controls

The band looks like this in the terminal (with Swolomon's head beside it when there's room):

```
While your agent works · Week 1 · Full body A   ●●○○○○  set 3 of 6
Push-ups: 8 reps  (1/2)   last: 8 reps
↳ knees down is fine
1: Done   2: Edit   3: Skip   4: Later
```

The dots are the workout's sets: done, this one, and the ones to come.

Every button has a number, and the number always works. Ways to press a button:

| Way | How | Notes |
|---|---|---|
| **Number** | With the prompt **empty**, press the button's number. | Works everywhere. A digit typed into a prompt that has text is just text. |
| Keyboard focus | `ctrl+x` then `tab` moves focus to the band; arrows or Tab move between buttons; Enter presses; Esc goes back to the prompt. | Numbers also work while the band has focus. |
| Click | Click the button. | Works in the desktop app. In a terminal, clicks often don't reach Claude Code: they need the fullscreen layout and a terminal that reports mouse clicks (Apple Terminal: View → Allow Mouse Reporting). |
| Command | `/workout <button>`, for example `/workout done`, `/workout skip`, `/workout later`, `/workout undo`. | Always works, on every surface. Use this if nothing else responds. |

What each band's numbers do:

| Band | Buttons |
|---|---|
| First run | `1` Quick start (or Keep my plan) · `2` Just remind me · `3` Build my own · `4` Not now |
| Build my own | `1` Quick start · `2` Build it with me · `3` I have my own · `b` Back |
| Where do you train? (Quick start) | `1` At a desk · `2` At home, no gear · `3` With weights |
| Do a set (Just remind me) | `1` Upper · `2` Lower · `3` Cardio · `4` Other · `l` Later · `0` Not today |
| New move unlocked | `1` Nice · `2` Again · `0` Undo |
| Rest-day stretch | `1` Done · `2` Not now |
| Ready for a workout? | `1` Start · `2` Later · `3` Not today · `4` Just half |
| Bonus set (after an Easy workout) | `1` One more · `2` Done for today |
| A set | `1` Done · `2` Edit · `3` Skip · `4` Later · `5` Timer (timed sets) |
| Hold timer | `1` Done · `2` Stop timer; each side: `1` Start side 2 |
| Move a training day? | `1` Move to (day) · `2` Keep (day) |
| Edit a set | `1` Save · `2` fewer reps · `3` more reps · `4` lighter · `5` heavier |
| Logged | `0` Undo |
| How did it feel? | `1` Easy · `2` Good · `3` Tough · `0` Undo |
| Rank up | `1` Let's go · `0` Undo |
| Swolomon's introduction, or a flex | `1` Let's go, or `1` Nice |
| How's IdleReps going? (once) | `1` Love it · `2` It's fine · `3` Not for me · `4` Tell us more |

- **Done** logs the set as shown, in one key.
- **Edit** is for a set that went differently: step the reps (or seconds) and the weight, then Save.
  Typed: `/workout done 8` (8 reps) or `/workout done 8 14` (8 reps at 14 kg).
- **Skip** logs the set as skipped. **Later** hides it without logging anything.
- **Undo** puts back exactly what the last set changed, and shows the set again. `/workout undo` works
  even after the Logged line has gone.
- **Timer** counts a timed set down (Swolomon counts the last three) and beeps once at zero (**Beep
  when a timed hold ends** in `/config`). Done mid-hold logs the seconds you held.
- **Not today** means nothing more today, in any session.
- **Warm-up:** the first set of a day's workout comes after a one-minute warm-up (`1` Done · `2` Skip).
  Turn it off with **Warm up first** in `/config`.
- **The end of a plan** shows what it came to, with `1` Next block · `2` Change plan · `3` Later.

**In VS Code**, which has no band above the prompt, a set opens in its own IdleReps panel with the same
buttons. In the desktop app and VS Code, Swolomon's portrait is drawn as a picture.

## Meet Swolomon

Swolomon is your coach: a good-natured gym regular with a gold laurel and a big grin, thrilled by every
set, who has never heard of coding. Swolomon hears "your agent" and pictures a secret agent, a travel
agent or a sports agent, and is impressed by all of them. Each day brings one theory, and it escalates.

In a wide terminal Swolomon's pixel portrait sits beside the band and talks while the line types out; in a
narrower one, a small head; anywhere else, the name. The first time you meet, Swolomon is just passing
through, and then notices you. Swolomon speaks only at the moments that matter (the
first set of the day, a new best, a finished workout) and keeps it to one line, so the band stays small
while you work. Turn the animation off in `/config` (Animate Swolomon). `/workout swolomon` replays the
introduction.

**Swolomon's moves.** Swolomon has more than 30 moves, all in the same pixel style. Open `/workout` and
he demonstrates your next exercise: squats, push-ups, planks, curls, pull-ups, bridges, lunges and the
rest, so you know what's coming. On a rest day he naps. He lifts a trophy for a new rank, does a victory
jump when you finish a week, and tosses his laurel when you finish a program.

**Collect his moves.** You start with three. Every set you do brings the next one closer: the first at
3 sets, then one more set each time. When one unlocks, he performs it for you (`2` plays it again).
`/workout flex` shows off the ones you have; `/workout moves` lists them.

**He lives in his square.** While a band or the pane is up, he blinks, glances around, now and then
stares straight out of the screen at you, deadpan, and winks. Where his portrait is drawn full size (the
introduction and the `/workout` pane), he also turns side to side, strolls out of his square and back, and
knocks out a few reps of the moves you've collected. On a win, his sparkles twinkle.

**He gets impatient.** Leave a band waiting on a choice and now and then he pipes up, for a moment, after
a `/` in its own colour: under the title where the band has one, else after his line. "So... we doing
this or what?" Then "Hello?", then boredom. After five he leaves it. Never during a set.

**He's training too.** Your second set enters him in Regionals, and every set you do is a set of his prep.
When the bar fills (30 sets) he competes before your next session and comes back with gold, or now and
then a silver he takes very well. Then Nationals, Worlds, and on. His medals are in the pane.

**He knows you.** Back after a couple of days, he missed you; after a week, your spot is still warm; the
day after, how yesterday went for you and your agent both. Now and then, on a turn with nothing due, he
asks you something: morning person or night owl, dogs or cats, what you lift to. Weeks later he brings it
up. He counts the days you showed up, is groggy before eight and puzzled to see you after eleven (in the
pane at night he's asleep), and notices when you open a project he hasn't seen you in: a new gym.

**Spot him.** Every few days he's the one stuck on his last rep. `1: You got this!` and he gets it up.

**High five.** After a logged set, press `h`.

**Shiny.** About one band in a hundred, he shows up in gold. Screenshots welcome.

**Beside every set**, a tiny Swolomon does the exercise with you, a few reps, then holds still.

**What your agent is up to.** Swolomon has never heard of coding, so he reads everything your agent does
as gym talk. A push is push-ups, a curl is curls, a build is building muscle, and tests are a fitness
test. While a command runs, the spinner says what he thinks it is ("Doing push-ups…"). His lines that
turn use it, and when the turn ends he tells you what he made of it. See the same thing a few times and he
asks around, and gets a little closer. Never right.

**Ranks.** Every set you do counts toward a rank, from New Face through Regular, Rack Regular, Iron
Disciple, Demigod and Olympian to Greek God at 2,500 sets. Skipped sets don't count, and nothing about
your body ever does. `/workout` shows your rank and how far the next one is.

## Set up

`/workout setup` opens the setup pane. Pick a ready-made Push / Pull / Legs split, have a plan designed
for you, or bring your own. The questions: your goal, your equipment (dumbbells, a pull-up bar,
resistance bands, or nothing), home or office (an office plan is standing-only and quiet), your level,
days a week and which days, workout size, program length, how often to give you a set, and whether to
remind you when you haven't trained.

## Settings

All in `/config`, under IdleReps:

| Setting | Options | Default | What it does |
|---|---|---|---|
| Minutes between sets | 10, 15, 30, 60 | 15 | After any answer, no new set for this long. |
| Only on turns longer than (seconds) | 30, 60, 120 | 60 | With no sign of a long task, a turn must run this long before a set shows. |
| Remind me when idle (minutes) | off, 60, 120 | 60 | While no turn runs, on a training day with sets left: a reminder at most this often. |
| Quiet hours | off, 22-07, 21-08, 23-06 | off | Nothing shows inside these hours (local time). |
| Show today's sets under the prompt | on, off | on | `💪 3/9` at the right of the prompt footer, then `💪 done`. Nothing on rest days. |
| Beep when a timed hold ends | on, off | on | The hold timer beeps once at zero. |
| Warm up first | on, off | on | A one-minute warm-up before the first set of a workout, once a day. |
| Animate Swolomon | on, off | on | Swolomon walks on, and the line types out while the portrait talks. Off shows it whole. |
| Swolomon's sound | off, blips, voice | off | Soft blips while Swolomon talks, or the lines read aloud in your system voice. |
| Share anonymous usage | on, off | off | Anonymous counts (sets done, workouts rated) to help improve IdleReps. Not live yet: it sends nothing today. See [Privacy](#privacy). |

## Status

- `/workout` opens the Workout pane: Swolomon's take on your day, today's workout as a table (every
  exercise, its sets as dots, the amount and your best), this week, your streak, your rank with a bar to
  the next one, and your bests.
- `/workout status` prints the same in one line.
- The prompt footer shows today's sets: `💪 3/9`.

Other commands:

| Command | What it does |
|---|---|
| `/workout start` | Start today's workout. |
| `/workout now` | A set right now, even on a rest day or inside the gap (never a second workout on a day you finished one). |
| `/workout today` | Make today a training day, once. |
| `/workout no` | Not today. |
| `/workout pause` · `/workout resume` | Stop all sets and reminders until you resume. |
| `/workout reset` | Back to workout 1. Your history is kept. |
| `/workout setup` | Make a new plan. |
| `/workout plan <text>` | Turn a plan described in plain words into your plan. |
| `/workout remind` | Just remind me: no plan, a set of your choosing while your agent works. |
| `/workout log` | Just remind me: log a set now. |
| `/workout moves` | Swolomon's moves you've unlocked, and when the next one comes. |
| `/workout dontask` | Stop the first-run nudges. |
| `/workout half` | The half version of today's workout: each exercise's sets halved. |
| `/workout next-block` | Once the plan is done: the same plan again from workout 1, weights and reps kept. |
| `/workout share` | Copy one line about your week to post anywhere (see Share your week). |
| `/workout export` | Write your history to `~/.claude/idlereps/history.csv` and a backup to `backup.json`. |
| `/workout restore` · `/workout erase` | Bring a backup back, or erase everything. Each asks first; your plan file stays. |
| `/workout swolomon` | Replay Swolomon's introduction. |

## Bring your own plan

Describe it in plain words, equipment included:

```
/workout plan 5x5 squats with dumbbells, pull-ups, push-ups, Mon Wed Fri
```

Or write `~/.claude/idlereps/plan.json` yourself. Edits apply from the next set. An example:

```json
{
  "name": "My plan",
  "schedule": { "days": ["mon", "wed", "fri"] },
  "workouts": [
    {
      "name": "Full body",
      "exercises": [
        { "name": "Squats", "reps": "12 reps", "range": [12, 18], "sets": 3 },
        { "name": "Push-ups", "reps": "8 reps", "range": [8, 12], "sets": 3, "note": "knees down is fine" },
        { "name": "Goblet squats", "reps": "10 reps", "range": [10, 15], "sets": 2, "weight": { "start": 10, "step": 2, "unit": "kg" } },
        { "name": "Plank", "reps": "20 s", "range": [20, 40], "sets": 2 }
      ]
    }
  ]
}
```

The fields:

- `schedule`: either `{ "days": [...] }` (`mon` to `sun`) or `{ "everyNDays": 2 }`.
- `workouts`: done in order, one per training day. Missing a day never skips a workout.
- `reps`: a number and a unit: `10 reps`, `8 each leg`, `20 s`, `30 s each side`.
- `range` (optional): the rep range. Reach the top on every set and the next workout adds a rep, or
  weight.
- `weight` (optional): `start`, `step` and `unit` (`kg` or `lb`) for a weighted exercise.
- `band` (optional): `levels` (light to heavy) and `start`, for a resistance band.
- `note` (optional): a short tip shown under the set.

The setup pane's **Copy example** button copies this example.

## How plans are built

Designed plans follow two public sources (named as attribution, not endorsement):

- The **ACSM 2026 resistance training position stand** (Medicine & Science in Sports & Exercise, April
  2026): each major muscle group at least twice a week, 2 to 3 sets per exercise, stopping 2 to 3 reps
  short of failure, with any equipment.
- The **r/bodyweightfitness Recommended Routine**: progressions from an easier to a harder variant of each
  movement, and the rule "hit the top of the range on every set, then move to the harder variant and start
  at the bottom of the range".

The exercises and templates were written for IdleReps. They are a conservative starting point, not a
coach's program.

## Safety

IdleReps suggests exercises; it is not medical advice. Stop any exercise that causes pain, dizziness or shortness of breath. If you have an injury, a heart or joint condition, are pregnant, or a doctor has told you to limit exercise, check with a professional before starting.

## Privacy

Everything stays on your machine: your plan is in `~/.claude/idlereps/plan.json`, and your progress and
history are in Claude Code's plugin storage. IdleReps sends something only when you choose to:
`/workout plan <text>` sends your description to the model to turn it into a plan; `/workout feedback` and
the one-time check-in send what you wrote or answered to idlereps.app. Anonymous usage counts are off
unless you turn them on, and not live yet. Swolomon's notes on you (your answers to his questions, the
names of the project folders you work in, so he notices a new one) stay on your machine with the rest. Every field sent is listed on
[idlereps.app/privacy](https://idlereps.app/privacy.html).

Progress is per machine. To move it, `/workout export` on the old machine, copy
`~/.claude/idlereps/backup.json` across, and `/workout restore` on the new one. `/workout erase` removes
everything IdleReps stored (it asks first; your plan file stays).

### Share your week

`/workout share` (or **Share week** in the Workout pane) copies one line, for example `This week my agent
worked 6 h 12 m while I did 84 sets. Rank: Rack Regular. idlereps.app`. It names no exercise, plan or
project; you see it before you post it, and IdleReps never posts anything itself.

## Feedback

`/workout feedback <your thoughts>` sends them straight to us, as written. After your third workout, a
one-time check-in asks how it's going (`1` Love it · `2` It's fine · `3` Not for me · `4` Tell us more).
Ideas, questions and plans to share: [Discussions](https://github.com/boringops-dan/idlereps/discussions).
Bugs: [Issues](https://github.com/boringops-dan/idlereps/issues).

## Uninstall

```sh
claude plugin uninstall idlereps@idlereps
```

(or `/plugin uninstall idlereps@idlereps`). Then delete `~/.claude/idlereps/` to remove your plan, and
`/workout erase` first if you want the stored progress gone too.

## Swolomon has more to say

Try `/workout flex` (again and again: a different move each time), `/workout protein` and `/workout wisdom`.
There are others nobody wrote down.

## License

The code is licensed under [Apache-2.0](LICENSE). The names IdleReps and Swolomon, Swolomon's art and
sound are not: they remain all rights reserved (see [NOTICE](NOTICE)).

## For developers

- `plugins/idlereps/`: the plugin. Check it with `claude plugin validate plugins/idlereps` and
  `claude plugin test plugins/idlereps`; type-check with `npx -y -p typescript@5 tsc -p plugins/idlereps`
  once the plugin has loaded once (the engine writes its types).
- `.claude-plugin/marketplace.json`: this repo is the plugin's marketplace.
- `scripts/make-time-wav.mjs`, `scripts/make-blip-wav.mjs`: write the plugin's two sounds.
- `CHANGELOG.md`: what changed in each release.
- Comments cite the internal design spec by section (`§1.11`, `D19`, `Task 17`); the code and tests are
  the reference here.

Ideas and questions: [Discussions](https://github.com/boringops-dan/idlereps/discussions). Bugs:
[Issues](https://github.com/boringops-dan/idlereps/issues).
