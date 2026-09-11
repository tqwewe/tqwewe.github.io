+++
title = "How I Solved Event Sourcing"
description = "tephra, heklang and hekla: an event-sourcing stack over the Dynamic Consistency Boundary, written in a language small enough that the usual mistakes do not parse."
date = 2026-09-11
draft = false
template = "blog/page.html"

[extra]
lead = "I rebuilt the same application four times in four years. This is the version I stopped rewriting."
+++

<figure class="wide">
  <img src="/how-i-solved-event-sourcing-banner-transparent.png" alt="banner">
</figure>

I've rebuilt the same application four times in four years.

Not the same product: the same shape. A log of facts, some code that decides what's allowed into
it, some code that turns it into tables you can query, and some code that talks to the outside
world when something lands. Each rebuild kept the shape and swapped the technology underneath,
because each time some piece of it turned out to answer a question I hadn't asked properly. The
last one was: what happens to an id when the handler that minted it gets retried?

This is the first version where I can't see the next rewrite coming, and it's not that I finally
picked good libraries. It's that most of what I built this time is stuff I took away.

Three pieces, all Rust, all written this year, all named after the same Icelandic volcano and the
ash it throws:

- **[tephra]** is the event log. Immutable, globally ordered, tag-indexed, built so that a query
  and the append condition that guards it are the same object.
- **[heklang]** is a small, total language for event-sourced application logic. Five kinds of
  declaration, no `while`, no recursion, no null, no randomness.
- **[hekla]** is the runtime. Point it at a directory of `.hk` files and it serves the HTTP API,
  builds the read models, runs the durable side effects, and gives you a console to watch it.

hekla is the binary you run, heklang is what you write, and tephra is what hekla writes to.

[tephra]: https://tephra.tqwewe.com
[heklang]: https://hekla.tqwewe.com/heklang/
[hekla]: https://hekla.tqwewe.com

## The part nobody warns you about

Event sourcing has exactly one rule. Events are the source of truth. Everything past that rule is
a decision you have to make yourself, and the ecosystem is unusually unhelpful about making any of
them for you. Choosing a web framework isn't like this; the first reasonable option you find is
usually fine. In event sourcing the first reasonable option you find is usually fine for about
eight months.

Here's the decision table, with the answers this stack settles on:

| Decision | Some common options | The answer here |
| --- | --- | --- |
| Language / runtime | TypeScript, Rust, Go, Java, C#, Python, WASM | heklang, and only heklang |
| Event store | PostgreSQL, EventStoreDB, Kafka, DynamoDB, SQLite | tephra, embedded as a library |
| Consistency model | Aggregate streams, optimistic concurrency, single-writer actors, global ordering, dynamic consistency boundaries | Global ordering with DCB |
| Projection strategy | Synchronous, async workers, stream processors, on-demand replay | Sequential asynchronous projections |
| Read model storage | SQLite, PostgreSQL, Redis, Elasticsearch, in-memory views | SQLite, one database per projector |
| Side effects | Inline, outbox, sagas, scheduled jobs, retryable handlers | Journaled handlers with durable replay |
| Personal data | Encrypt the column, encrypt the row, tombstone, rewrite history | Per-field crypto-shredding |
| Framework | None, an internal library, Marten, Axon, Eventuous | hekla |

None of those cells is hard on its own. What makes event sourcing expensive is that they aren't
independent. Your consistency model constrains your event store, your side-effect strategy
constrains your consistency model, and your choice of language decides whether a replay is safe at
all. Pick a general-purpose language and a general-purpose database and you'll discover those
constraints one at a time, in production, as bugs.

The two decisions that matter most are the consistency model and the language. The rest mostly
falls out of them.

## Aggregates are a guess you make before you know the answer

An aggregate is a box you draw around some events and declare to be the unit of consistency.
Everything inside is transactional. Everything outside is somebody else's problem, usually a
saga's.

I've worked plenty with aggregates, and building systems with them feels like carving a statue in
the dark. You spend so much time planning your consistency boundaries and second guessing
yourself, and praying after launch that you've made the right decisions. The trouble is that the
box has to be drawn before you know every rule the application will need, and business rules don't
respect boxes.

Take the canonical example. A student subscribes to a course, and five things must be true at the
instant the subscription is recorded:

1. The course exists.
2. The student is registered.
3. The student doesn't already hold that course.
4. The course has a seat left.
5. The student holds fewer than ten courses.

Two of those belong to the course and two to the student. The third belongs to neither. It's a
fact about the pair, and it lives in the log rather than in either box. Whichever entity you make
the aggregate, the rest of the decision sits outside its transaction, so it's either read stale or
coordinated afterwards by a compensating transaction that undoes a decision which should never
have been made. That compensation is more code, and it's the code most likely to be wrong. While
it's in flight the system sits in a state nobody modelled.

The usual escape is to grow the aggregate until it covers the rule. That works until the next rule
spans a different pair, and it ends with one aggregate the whole application serialises on.

A [Dynamic Consistency Boundary] derives the boundary per decision, from a query, at the moment of
the decision. Every event carries a type and a set of tags. A query selects exactly the events the
decision depends on, whichever entity they belong to, and that same query guards the append that
records it. With an aggregate you version the box. With DCB you version the query.

<figure class="wide">
  <img class="on-light" loading="lazy" decoding="async" src="/aggregates-vs-dcb.png" alt="Aggregates versus DCB: three per-entity streams on the left, one global tag-indexed stream on the right">
  <img class="on-dark" loading="lazy" decoding="async" src="/aggregates-vs-dcb-dark.png" alt="Aggregates versus DCB: three per-entity streams on the left, one global tag-indexed stream on the right">
  <figcaption>Aggregates fix the boundary per entity, up front. DCB derives it per decision, from the tags a query names.</figcaption>
</figure>

The idea is [Sara Pellegrini's], and [dcb.events] is the best place to read about it on its own
terms. What I've built is one way of writing it down.

There seems to be a real divide in the event sourcing and DDD communities between aggregate lovers
and DCB enthusiasts, which I find strange, because I just care about the technology and the
problems it solves. I'd like to say aggregates still have their place, but after the joy of
working with DCB in production I honestly can't see a reason to go back.

[Dynamic Consistency Boundary]: https://hekla.tqwewe.com/dcb/
[Sara Pellegrini's]: https://sara.event-thinking.io/2023/04/kill-aggregate-chapter-1-I-am-here-to-kill-the-aggregate.html
[dcb.events]: https://dcb.events

## The store has to agree

A conditional append is only useful if the store can check the condition atomically against the
whole log. Most event stores can't, because their whole model is stream-per-aggregate plus an
optimistic version number per stream, which is precisely the shape DCB is trying to escape.

So tephra came first. One writer assigns every event a dense, monotonic position, which makes the
log a single global order. Every event carries a type and a set of tags. An append condition is a
query plus the position the client read to, and it's checked against that global order before the
batch commits.

The internals fall out of two principles a general-purpose database can't adopt. The log is the
source of truth and everything else is derived, so the indexes need no write-ahead log, no
crash-consistent transactional update, and no fsync on the write path; they can be rebuilt by
replaying. And data is written once, never updated, never deleted, which removes the entire reason
B-trees and LSM trees exist. Both are machinery for reconciling mutation against sorted order, and
there's no mutation here. Segments cover contiguous, non-overlapping position ranges, so an
`after: p` restriction prunes whole segments by comparing headers, and reading a term across
segments is ordered concatenation rather than a k-way merge.

tephra runs as a server with [Rust], [Go] and [JavaScript] clients, and it can also be embedded.
hekla embeds it, which means the append condition is checked in-process, with no network hop and no
protobuf round-trip on the write path.

[Rust]: https://crates.io/crates/tephra-client
[Go]: https://git.tqwewe.com/tephra/tephra-go
[JavaScript]: https://www.npmjs.com/package/@tephradb/client

## The rewrite I did not plan

hekla was originally written against [Starlark], the small Python dialect from Bazel. On paper it's
exactly right for this: deterministic, sandboxed, embeddable, no I/O unless you hand it some.

It supplied all of that. What it couldn't supply was the second half. The rules of this domain
aren't expressible in a general-purpose language, so they had to be enforced by a validation pass
instead. That pass grew to sixteen checks over four thousand lines of hand-built globals, value
types and marshalling, and it could only ever be as good as its own approximations. The most
visible of those: to work out a command's consistency boundary, it evaluated the boundary against a
stubbed input, which means it saw one branch of it.

Then the stupider stuff. Starlark collects garbage only when executing a statement at the root of a
module, and a fold loop never executes one, so nothing a fold allocated was released until its heap
was dropped. Every event struct, every string, every superseded state survived to the end of the
fold. Once the working set outgrew the cache, a linear fold started looking quadratic. My answer
was a chunked fold that froze and thawed its state every megabyte, with four tuning constants and
an environment variable to go with it.

So I wrote a language instead. Not because writing a language is fun, though it is, but because
every one of those problems was the same problem: I was trying to police at run time a property
that should have been a fact about the grammar.

When the port landed, the chunked fold went, along with its four constants and its environment
variable. The four thousand lines of glue went. The import graph and its resolver and its cycle
check went, and with them the entire class of error where a file was valid but unreachable. The
four constructs a command's boundary used to need collapsed into one. Sixteen validation rules
became three lints plus what a directory means.

[Starlark]: https://github.com/bazelbuild/starlark

## What each kind of code is allowed to do

Five kinds of declaration do the work. A `command` decides and appends, a `projector` builds a read
model, an `effect` reaches the outside world, a `guard` is a named proposition about the log that
several commands can share, and a `refusal` is a named no. Each gets a different set of
capabilities, and the difference is grammatical: a projector that tried to call out wouldn't parse,
because `invoke` isn't a thing you can write inside one.

| Call | command | projector | effect arm | effect-local `fn` | module `fn` | fold arm |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| `now()`, read a clock | yes | no | yes | no | no | no |
| `http.*`, reach the network | no | no | yes | yes | no | no |
| `invoke`, run a command | no | no | yes | yes | no | no |
| `log`, `fail` | no | no | yes | yes | no | no |
| `reveal`, `erase`, decrypt and shred | no | no | yes | **no** | no | no |
| `emit`, append an event | yes | no | no | no | no | no |

("Arm" is the word for one handler inside a declaration: an effect's `on @order.placed { ... }`
block is an arm, and so is one `on ... => ...` line inside a fold.)

The bolded cell is the one worth staring at. A helper declared inside an effect may reach the
network, because that is what a helper in an effect is for. It may not decrypt, because the seal is
tracked on a value and a helper is where that trail would go cold. So every `reveal` happens at the
arm's own level, where you can see it.

Most systems make this table a convention and ask a reviewer to police it. Moving it into the
grammar is what lets a projector rebuild from position zero and reproduce exactly the rows it had
before, rather than usually reproducing them.

Two more restrictions surprise people, so they're worth stating on their own.

**Every program terminates.** There's no `while`. Recursion is rejected statically and the error
prints the cycle as a path. A `for` runs once per element of a finite container, and every path
must return. A smart contract language buys that same guarantee at run time, with gas metering.
Here it isn't expressible in the first place.

**Nothing is ever minted.** There's no `random()` and no `uuid4()` anywhere in the language, and
that's enforced below the grammar too: heklang's own `uuid` dependency is compiled without its v4
feature, so the interpreter has no way to make one. Identity comes from `Uuid.derive(seed, name)`,
a pure function of both arguments, so a retry and a replay produce the same id. "Never mint a
random id inside a handler" isn't a rule anyone has to remember, because it can't be written.

That second one is the question from the top of this post. A command retry and an effect replay
both re-run the code that mints the id. A fresh id per attempt turns one intent into several
entities, and it's the kind of bug you find three weeks later in a reconciliation report.

## A fold is not a variable

This is the piece I'm most pleased with, and it's one keyword: `fold`.

A fold is a DCB query written as a reduction. It names a slice of the log, an event type plus the
filters that narrow it, and the reduction to run over it. It looks like a local binding and it
isn't one. The slices a command folded are the condition its append is checked against.

```hek
refusal SoldOut "this shop's launch allocation is gone"

command PlaceOrder(
  order_id: Uuid,
  customer_id: Int,
  shop_id: Int,
  email: String?,
  shipping_address: String?,
  order_total: Money(2),
  notes: String,
) {
  // Narrow: this one order. A caller retrying the same order_id is a no-op
  // rather than a second order.
  fold placed: Bool = false
    on @order.placed(order_id) => true

  // Wide on purpose: an allocation is a rule about every order in the shop, so
  // every order in a shop conflicts with every other. That is what a hard cap
  // costs, and the retry loop is what absorbs it.
  fold sold: Int = 0
    on @order.placed(shop_id) => sold + 1

  if placed {
    return
  }
  if sold >= LAUNCH_ALLOCATION {
    return reject SoldOut
  }

  emit @order.placed {
    order_id,
    customer_id,
    shop_id,
    email,
    shipping_address,
    order_total,
    notes,
  }
}
```

A refusal's declared name in snake_case is what the caller gets back, so this command answers
`sold_out` with a 422, and the message is settled once at the declaration rather than at every site
that answers with it.

Those two folds are one pass over the log, and they're also the append condition.

<figure class="wide">
  <img class="on-light" loading="lazy" decoding="async" src="/hekla-append-condition.png" alt="Two folds in a command becoming the two slices of an append condition, and a concurrent write landing inside one of them">
  <img class="on-dark" loading="lazy" decoding="async" src="/hekla-append-condition-dark.png" alt="Two folds in a command becoming the two slices of an append condition, and a concurrent write landing inside one of them">
  <figcaption>The two folds are the append condition. A writer landing in either slice after the read refuses the append, and the command decides again.</figcaption>
</figure>

Nothing above configures a boundary. The command reads what it needs, and the boundary is what it
read. That's why the keyword isn't `let`: naming both `let` would leave the thing that decides
whether concurrent appends conflict looking exactly like the thing that shortens an expression. A
declared boundary that can drift from the actual reads is a class of bug that doesn't exist here,
because they're the same object.

Here's the course example from earlier, whole:

```hek
const MAX_COURSES: Int = 10

command Subscribe(course_id: Uuid, student_id: Uuid) {
  // Five folds, one pass over the log. Together they are this command's
  // consistency boundary, and the append is conditioned on exactly them.
  // The braces on the first arm bind a field off the matched event.
  fold capacity: Int = 0
    on @course.defined(course_id) { capacity } => capacity
  fold taken: Int = 0
    on @student.subscribed(course_id) => taken + 1
    on @student.unsubscribed(course_id) => taken - 1
  fold registered: Bool = false
    on @student.registered(student_id) => true
  fold subscribed: Bool = false
    on @student.subscribed(course_id, student_id) => true
    on @student.unsubscribed(course_id, student_id) => false
  fold held: Int = 0
    on @student.subscribed(student_id) => held + 1
    on @student.unsubscribed(student_id) => held - 1

  if capacity == 0 {
    return reject NoSuchCourse
  }
  if !registered {
    return reject NoSuchStudent
  }
  if subscribed {
    return reject AlreadySubscribed
  }
  if taken >= capacity {
    return reject CourseIsFull
  }
  if held >= MAX_COURSES {
    return reject TooManyCourses
  }

  emit @student.subscribed { course_id, student_id }
}
```

Five small propositions spanning two entities and the pair they form, none of which is an
aggregate. No saga. No version column to pick and no lock to scope. Two students subscribing to
different courses touch disjoint slices and never conflict; two students racing for the last seat
in the same course touch the same slice, and exactly one wins.

The cost is worth stating plainly. A boundary that spans entities is a boundary you can't shard,
because partitioning the log by tag would break exactly the cross-entity conditions the model
exists to check. A bounded context is one logical writer, and you scale by running more contexts.

## Three kinds of code, and a directory

A hekla project is a directory of `.hk` files. There's no build step, because there's nothing to
compile. Deploy is restart.

<figure class="wide">
  <img class="on-light" loading="lazy" decoding="async" src="/hekla-architecture.png" alt="A command folding and emitting against an embedded tephra log, which feeds a projector into SQLite and an effect out to the network">
  <img class="on-dark" loading="lazy" decoding="async" src="/hekla-architecture-dark.png" alt="A command folding and emitting against an embedded tephra log, which feeds a projector into SQLite and an effect out to the network">
  <figcaption>The whole runtime. tephra is linked in rather than run beside, so the append condition is checked in-process.</figcaption>
</figure>

Events are the vocabulary:

```hek
event @order.placed {
  order_id: Uuid,
  customer_id: Int,
  shop_id: Int,
  email: String? @subject(customer_id) @max(200),
  shipping_address: String? @subject(customer_id) @max(200),
  order_total: Money(2) @subject(shop_id),
  notes: String @no_index @max(500),
}
```

Every field is indexed and becomes a store tag unless it opts out, so there's no second list to
keep in step with the declaration. The old design had a `tags = [...]` list beside the fields, and
its failure mode was ugly: a field forgotten from the list was unqueryable forever, and adding it
later didn't fix the events already written.

Projectors are pure folds from events into rows:

```hek
projector CustomerOrders {
  entity Order {
    order_id: Uuid @key,
    customer_id: Int @index,
    email: String? @max(200),
    shipping_address: String? @max(200),
  }

  on @order.placed { order_id, customer_id, email, shipping_address } {
    put Order { order_id, customer_id, email, shipping_address }
  }
}
```

A projector has no clock, no network, no failure channel, and no general read of its own rows. That
last one is the interesting restriction. The old version had `get(entity, key)`, and a projector
that can read anything can read something a rebuild hasn't written yet. The only reads left are the
ones `patch` and `update` do of the row they were already about to write.

Each projector gets its own SQLite database, holding both its tables and its checkpoint, so state
and position commit in one transaction. A rebuild builds a fresh database from position zero, seals
it, and renames it in, so a reader never sees a torn one.

All of that becomes an API without anybody writing a route. Some of what this project gets:

```
POST /commands/PlaceOrder
GET  /read/CustomerOrders/Order/{order_id}
GET  /read/CustomerOrders/Order?customer_id=7
POST /projectors/CustomerOrders/replay
     /docs   /admin   /metrics   /openapi.json
```

The route is the declared name, not the file name. A request parameter the command didn't declare
is a 400 that names it, because an unrecognised key is a typo far more often than it's spare data.
Read filters work on the key and declared indexes only; anything else is a 400 telling you to
declare the index, never a silent table scan.

## Effects that survive the crash

In one of my deployments, a single oversized order event stalled a warranty-recording effect for
every merchant on the platform for eight hours. Not a crash, not an outage anyone's dashboard
noticed. One event that couldn't be processed, one sequential cursor that wouldn't move past it,
and a queue behind it that belonged to everybody.

Effects are the only declarations that reach outside, and they're where event sourcing usually goes
wrong. The handler sends an email, the process dies, the handler runs again, the customer gets two
emails. The usual answers are an outbox table, a workflow engine, or a lot of hand-written
idempotency keys.

hekla gives effects a Temporal-style durable execution model, and the total language is what makes
it cheap. Every impure call looks itself up in a journal before it runs, and journal rows commit
call by call rather than once per invocation. After a crash the arm re-runs from the top, replays
journaled calls until it passes the end of the journal, and then resumes making live calls.

<figure class="wide">
  <img class="on-light" loading="lazy" decoding="async" src="/hekla-effect-journal.png" alt="An effect arm crashing after a journaled HTTP POST, then re-running from the top and answering that POST from the journal">
  <img class="on-dark" loading="lazy" decoding="async" src="/hekla-effect-journal-dark.png" alt="An effect arm crashing after a journaled HTTP POST, then re-running from the top and answering that POST from the journal">
  <figcaption>The second attempt runs the same code from the same event. The POST it already made is answered out of the journal rather than sent again.</figcaption>
</figure>

There are no step functions and no yielding. Blocking a thread keeps evaluation state on that
thread's stack, and crashes are handled by replay. You can only do that when the code is guaranteed
to terminate and guaranteed to be deterministic, which is the whole argument for the language in
one sentence.

```hek
secret CONFIRM_URL

effect NotifyCustomer {
  on @order.placed { order_id, @key customer_id, email } {
    // Inclusive of the triggering event, so a customer's first order
    // leaves this at 1.
    fold orders: Int = 0
      on @order.placed(customer_id) => orders + 1

    if email.is_none() {
      log("order {order_id} has no address to confirm to")
      return
    }

    let response = http.post(
      CONFIRM_URL,
      { "to": reveal(email), "order_id": order_id, "first_order": orders == 1 },
    )
    if response.status >= 400 {
      log("confirmation rejected with status {response.status}")
    }
  }
}
```

**The partition key is mandatory.** `@key customer_id` names the lane. One customer's orders are
confirmed in log order, and one lane's backlog does not order another's, so my eight-hour stall
would have been one merchant's problem instead of everybody's. There's no opt-out, because an
implicit default of "no key" is a default of one global lane and maximum blast radius.

**The fold, rather than a read of a projector.** An earlier design gave effects a journaled
`read(projector, entity, key)`. It forced a choice between replay determinism and fresh data and
resolved it badly. A read that missed because a projector was lagging journaled `null`, and every
retry then replayed that null, so a transient lag became a permanent wedge that only an operator
could clear. An effect's fold is bounded at its own trigger position, inclusive, which makes it a
function of the log prefix and that position. It can't race a projector, it's identical on every
attempt and every replay, and it needs no journal entry at all, because there's nothing to record
that re-folding wouldn't reproduce.

**Retryable statuses never arrive.** Transport failures and every status that clears on its own,
408, 425, 429 and any 5xx, are absorbed by the runtime with backoff before the arm sees them. That
split has to happen below the handler, because every response that reaches one is journaled. An
effect that failed on a 429 would replay the recorded 429 on every attempt, never re-send, and
wedge forever. So a 4xx that reaches your code is a real rejection to decide on.

`secret CONFIRM_URL` is a deployment credential: declared by the program, supplied by the
deployment, and guaranteed by the language to reach a URL, a header value or a request body and
nothing observable. Not a log line, not an event, not a read model, not a fold. Every surface
renders it as `{SECRET:CONFIRM_URL}` instead of a value, including the journal key, which is why
rotating it moves no hash and orphans no journal entry.

The journal key is the call itself, the verb and the URL and the body, hashed, plus an ordinal to
separate identical repeated calls. Deliberately not a sequence number, so editing or reordering an
arm doesn't corrupt replay: the failure mode of editing during a deploy is "a different path was
taken", never "a side effect fired twice". Journals are swept on a retention window, which is the
one number you have to pick.

And the honest edge, since exactly-once claims deserve scrutiny. `invoke` really is exactly-once,
because it derives an idempotency key from the journal identity of the call, tags every emitted
event with it, and guards the append against that tag, so exactly-once is a property of the log
rather than of a reservation table. That covers the append; whether the whole target command is
exactly-once still depends on it being idempotent under replay. A raw `http.post` is at-least-once:
a crash landing between the send and the journal write re-sends. That is inherent, not a todo.

## Would this deploy still do the same thing?

An event log is append-only, so a bad deploy isn't something you undo. This is the part of event
sourcing that has scared me most, and it's the part I had the least tooling for.

heklang computes a digest per declaration: a deterministic rendering of what a declaration *does*,
hashed. Local names become numbered slots. Comments, layout, file boundaries and declaration order
are nothing. Reformatting a file doesn't move a hash, and a corrected handler body does.

`hekla plan` compares the project you're about to ship against the one that's running:

```sh
$ hekla plan . --data-dir /srv/hekla/data
compared 6 declaration(s) against what is deployed
  behaviour command DoA (commands/a.hk)
  behaviour command DoB (commands/b.hk)
  contract  projector UserStats (projectors/user-stats.hk)
  projector UserStats rebuilds from zero, redoing 12481 position(s)
  because `guard ShopIsConnected` changed: DoA, DoB
0 added, 0 removed, 3 changed; 1 projector(s) would rebuild
```

`behaviour` means a declaration does something different behind a contract that didn't move, so
nothing outside the program can tell. `contract` means what's visible outside changed. That split
is possible because a declaration with an external contract carries a second hash over only the
visible part of it. Without `--replay`, plan opens no event log at all and takes no lock, so it
runs against a directory a live server has open.

That diff can tell you an effect changed. It can't tell you whether the change matters, and "would
this now send a different HTTP request" is what the deploy actually turns on. So:

```sh
$ hekla plan . --data-dir /srv/hekla/data --replay
  effect NotifyCustomer @ 4812: it reached a call the recorded run never made (http.post #0)
replayed 312 invocation(s) across 2 affected effect(s); 310 reproduce, 2 diverge
this project retains 7 day(s) of journals; anything older was reclaimed before the replay could see it
0 added, 0 removed, 1 changed; 0 projector(s) would rebuild, 2 recorded invocation(s) would diverge
```

Recorded invocations of every affected effect are re-run against the candidate code and the journal
the original run left behind. Nothing is mocked, and that's the point. The journal holds the
responses that run actually received, so a candidate that branches differently on a response body
reaches a call the journal has no entry for, and that miss is the finding. Nothing is sent,
appended or erased, because the replay runs against a sealed host that refuses all three. It reads
the log through a follower that takes no lock and creates nothing, so it runs against production
while production is serving.

"Affected" is a transitive closure. A module `fn` the effect calls, an event it handles or folds
over, a record or enum either of those carries. Each of those is a declaration of its own, so
editing the helper that builds a URL leaves the effect's own hash exactly where it was, and a check
that looked only at that hash would miss it.

What the replay can't see gets counted and named. An invocation whose subject was erased, one an
operator skipped, one that journaled no call at all, one reclaimed by retention while the replay
was reading it. None is counted as a pass. The coverage is bounded too: a thousand invocations per
effect by default, and an effect that `reveal`s is skipped whole if this machine has no usable
master key, which is what lets CI plan against production without holding the production key.

The one hole it can't count is the interesting one. An invocation whose retention was reclaimed
before the replay started has lost its row and its journal together, so it's invisible rather than
skipped. Nothing can count what's gone, so the tool prints the retention window instead and lets
you do the subtraction. That's the line in the transcript above about seven days of journals.

In the JSON output, `divergences` and `coverage` are both `null` when no replay ran, because an
empty divergence list would be a clean result and nothing should read one off a run that never
opened the log.

There's also `hekla verify`, which checks the properties the design rests on against whatever state
a deployment actually reached: that every projector rebuilt from position zero matches the live one
row for row, and that every recorded effect invocation still replays without performing anything.

## Erasure is a type

Right to erasure is the requirement that makes people give up on immutable logs. An append-only
store and "delete everything about this person" look like a contradiction, and the usual answers
are to rewrite history, which destroys the one property you built the log for, or to bolt on an
encryption scheme by hand and hope every read path respects it.

One annotation on an event field does it:

```hek
email: String? @subject(customer_id) @max(200),
```

That makes the field `Opt(Sealed(String, customer_id))`, a type you can't write yourself; the
annotation is the only way to produce one. The value is encrypted under a key scoped to that
customer, in the payload, in the tag index, and in every read-model column, before it reaches
storage. The seal rides on the value, so it survives a
binding, a fold, and being written into a projector column. A projector can store
personal data it is structurally incapable of reading.

There are exactly three things you can do with sealed content: move it into another position sealed
under the same subject, ask whether it's present, or `reveal` it inside an effect arm. Everything
else is a compile error, including the ones you'd want to get away with:

| Written | Why it's refused |
| --- | --- |
| `http.post(url, { "email": email })` | It can't be sent in a request body without `reveal`. |
| `log("the address is {email}")` | It can't be interpolated into a string. |
| `if email == "ada@example.com"` | Equality over two ciphertexts leaks whether they hold the same value. |
| `email.trim()` | A method that reads the content is reading the content. |
| `email.unwrap_or("")` | A plaintext default and sealed content can't share one slot. |

Look at the third row. The Starlark version had a `unique = True` feature that enforced one order
per email address across customers, using a tag minted under a never-erased global key. That rule
can't be written in heklang, so I deleted the feature rather than grandfathering it, and rewrote
the example around a different rule. A cross-account uniqueness check on personal data is a
permanent match that survives erasure, which is not a feature.

Erasing is deleting one key. Here it is against the same running server I took the screenshots
from:

```sh
$ curl -s "localhost:8080/read/CustomerOrders/Order?customer_id=3&limit=1" | jq -c .items
[{"customer_id":3,"email":"margaret@example.com",
  "order_id":"69f97505-9368-4977-a4d7-0077b96a7a88",
  "shipping_address":"12 Orchard Lane"}]

$ hekla erase customer_id 3 --data-dir ./data
erased subject `customer_id` = `3`

$ curl -s "localhost:8080/read/CustomerOrders/Order?customer_id=3&limit=1" | jq -c .items
[{"customer_id":3,"order_id":"69f97505-9368-4977-a4d7-0077b96a7a88"}]
```

No rewrite, no compaction, no index rebuild, and no lock, so it works against a server that's
serving traffic. The order still exists, because the shop still needs its order. What's gone is the
part that was about a person.

Subjects are per field rather than per event, which is what the annotation is really buying. Here's
the same event in the console afterwards:

<figure class="wide">
  <img class="on-light" loading="lazy" decoding="async" src="/hekla-erased-event.png" alt="The hekla console showing one event whose email and shipping address read as erased while its order total is still decrypted">
  <img class="on-dark" loading="lazy" decoding="async" src="/hekla-erased-event-dark.png" alt="The hekla console showing one event whose email and shipping address read as erased while its order total is still decrypted">
  <figcaption>One event after <code>hekla erase customer_id 3</code>. Two fields are gone, one is not, and the event on disk never changed.</figcaption>
</figure>

`email` and `shipping_address` are scoped to `customer_id` and now read as erased. `order_total` is
scoped to `shop_id` and is untouched, because the shop's revenue figures aren't the customer's
personal data and there's no reason erasing one should take out the other. The tag index still
holds the ciphertext. The event on disk hasn't changed at all.

A sealed column has to be optional, and hekla refuses to serve a project where it isn't. An erased
subject's column reads back absent, and a type that can't be absent has no way to say so. And no
read path is allowed to create a key, which is less obvious and more important: re-projecting a log
whose subject has been erased would otherwise mint the very key the erasure destroyed and write
readable content under it, undoing a shred by rebuilding a read model.

The limits are written down. You shouldn't have to discover them. The encryption is deterministic,
which is what lets ciphertext work as a matchable tag, and it therefore leaks equality and
frequency, so don't give a status enum a subject. A field appended without a subject can't be
erased at all short of rewriting segments, which nothing here does, and nothing warns you about it,
because which fields are personal is a judgement about meaning rather than about a name. Losing the
master key is total, unrecoverable loss.

## Watching it run

The admin console is served from the same URLs as the JSON API. A request that prefers `text/html`
over `application/json` gets the console, everything else gets the JSON byte for byte unchanged,
and a tie goes to the API. `curl` sends `*/*` and so does a bare `fetch()`, so neither is affected,
and every deep link works in both directions because every view's URL is already a real endpoint.

<figure class="wide">
  <img class="on-light" loading="lazy" decoding="async" src="/hekla-admin-console.png" alt="The hekla admin console overview, showing the log head, projector and effect health, and a list of recent events">
  <img class="on-dark" loading="lazy" decoding="async" src="/hekla-admin-console-dark.png" alt="The hekla admin console overview, showing the log head, projector and effect health, and a list of recent events">
  <figcaption>The console, on the running example project.</figcaption>
</figure>

It's compiled into the binary. Plain ES modules over one vendored 13KB runtime, no npm, no build
step, and no network at all. (`/docs` is the exception: the API reference pulls Scalar from a CDN.)
There's a [live demo] if you want to click around one.

Look at the tag column. Those are real events, and `email:7OsAnToC_A72n0LRv…` is what a
subject-encrypted field looks like in the tag index. That ciphertext is what's on disk; the
encryption isn't a display layer.

[live demo]: https://hekla.tqwewe.com/demo/

## Tests are declarations

There's no test framework to adopt. A test is a declaration like any other, run by the same binary
that checks the program:

```hek
test "an erased attendee skips rather than sending plaintext" {
  given @workshop.opened { workshop_id: RUST, title: "Rust", seats: 2, price: 40.00 }
  given @seat.booked {
    workshop_id: RUST,
    booking_id: BOOKING,
    attendee_id: 7,
    email: "ada@example.com",
    paid: 40.00,
  }

  erased attendee_id "7"

  deliver ConfirmBooking

  expect skipped
}
```

`given` seeds the log, one of `run` / `project` / `deliver` acts, and `expect` asserts on the
events, rows and calls that resulted. Each case runs against a real tephra log in a temporary
directory, real SQLite read models and a real key store, so the slice and the append condition are
genuinely exercised. The only stubbed thing is the network, via `respond`.

The expectation is spelled like the thing it asserts, so `expect reject SkuTaken` sits beside the
`return reject SkuTaken` it's about. And a test can't assert on folded state, on the append
condition, or on retry counts, because everything the runner asserts goes through the same public
API an embedder has. A test can't see anything a program can't.

One convenience I refused: you can't build a fixture by running the command under test. It reads
like an obvious feature until one broken command fails every test that used it as scenery, and the
report names the wrong test.

## Three commands to a running service

```sh
$ curl -fsSL https://hekla.tqwewe.com/install.sh | sh
install: installed hekla v0.4.0 (x86_64-unknown-linux-musl) to /usr/local/bin/hekla

$ hekla check ./orders
checked 3 module(s): 1 command(s), 1 projector(s), 1 effect(s), 1 event(s)
ok: no errors, 0 warning(s)

$ hekla test ./orders
11 passed, 0 failed

$ HEKLA_MASTER_KEY=$(head -c 32 /dev/urandom | base64) hekla serve ./orders
hekla listening on http://127.0.0.1:8080
  admin console   http://127.0.0.1:8080/admin
  api reference   http://127.0.0.1:8080/docs
```

That master key is fine for a throwaway project and nowhere near fine for a real one, where losing
it costs you every encrypted field in the log.

One binary is the whole runtime. tephra is embedded as a library and SQLite is bundled, so there's
no server to stand up beside it and nothing to point it at. `cargo install hekla` builds the same
thing from source. The [getting started guide] walks through writing one from scratch.

Something I didn't plan for: the usual failure modes of generated backend code are a stray clock
read, an id minted on a retry, a call out from a handler that has to replay. None of those three
parse here, so when an agent writes heklang the part left to review is the domain rule instead of
the machinery around it. The repositories ship a Claude skill for this, and the [agents page] walks
through four worked examples of a rule becoming a checked program.

[getting started guide]: https://hekla.tqwewe.com/docs/getting-started/
[agents page]: https://hekla.tqwewe.com/agents/

## What it is not

An engineer who hits one of these after adopting hekla is a worse outcome than one who reads them
here and walks away, so none of it is softened.

**Nothing is authenticated.** Not the command API, not the read API, not `/admin`, not `/metrics`.
A caller who can reach the port can append events and skip an effect's work. The bind address is
the boundary, and it defaults to `127.0.0.1`.

**One node, one writer, one process.** A runtime takes an exclusive lock on its data directory.
There's no replication and no sharding, for the reason in the fold section: partitioning by tag
breaks the cross-entity conditions the whole model exists to check.

**Deploy is restart.** The project loads at startup and there's no hot reload. Reload raises the
same checkpoint and in-flight-invocation questions as deployment, and answering them under a file
watcher is how the mechanism everything depends on gets subtly wrong.

**heklang is the only way in.** There's no Rust, TypeScript or WASM SDK, now or later. One pure
sandboxed authoring language is what makes determinism structural and the effect journal sound, so
multi-language authoring is permanently out of scope. If you need to drop into general-purpose code
inside a handler, this is the wrong tool and no future version will fix that.

**Erasure has edges**, as described above.

**It is early.** The four years at the top of this post are design iteration across five versions.
This implementation is five weeks old: tephra's first commit was in early August, hekla and heklang
are younger still. hekla is 0.4 and heklang is 0.5, both carry breaking changes between minor
versions, and neither has run anything of yours in production yet.

## Why I think this one sticks

The previous version of this stack was [Umari], which expressed the same model as WebAssembly
component modules: commands, projectors and effects as separate WASM components, written in Rust or
TypeScript. I liked it. WASM gives you sandboxing, deterministic execution and portability, three
of the four things this design needs.

The fourth is that the mistakes should be unrepresentable, and a general-purpose language compiled
to WASM can't give you that. You can still read a clock in a fold. You can still mint a UUID on a
retry. You can still call out from a handler that has to replay. WASM stops your code from reaching
the host; it doesn't stop your code from being wrong in the three specific ways this domain
punishes.

So the last rewrite wasn't a better runtime. It was a smaller language, and everything else got
smaller with it. That's the answer I'd been missing for four years, and it isn't a clever thing I
built. It's the list of things to refuse.

If any of this is interesting, [hekla.tqwewe.com] is the place to start, [the DCB page] is the
argument on its own, and the source for all three pieces is on [my git server]. I'd genuinely like
to hear where it breaks for you.

[Umari]: https://github.com/tqwewe/umari
[hekla.tqwewe.com]: https://hekla.tqwewe.com
[the DCB page]: https://hekla.tqwewe.com/dcb/
[my git server]: https://git.tqwewe.com/tephra
