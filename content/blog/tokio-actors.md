+++
title = "Tokio Actors with Traits in Rust"
description = "Learn how to create tokio actors using simple traits in Rust."
date = 2024-03-30
updated = 2024-04-03
draft = false
template = "blog/page.html"

[extra]
lead = "Learn how to write actors with tokio in Rust."
+++

In this blog, we'll explore a concise approach at implementing the actor model in Rust,
using Tokio and a smart application of traits. The actor model revolutionizes concurrent programming by
introducing self-contained units that communicate via asynchronous messages, avoiding shared state's pitfalls.
This shift simplifies development, boosts scalability, and enhances system resilience.

### Quickstart Guide to Actors in Rust

Actors encapsulate computation and communication, functioning independently to process messages sequentially.
This design inherently simplifies concurrency, negating locks and traditional synchronization,
leading to more predictable and robust systems.

For Rustaceans, combining Tokio with traits to craft actors not only capitalizes on Rust's type safety and
concurrency controls but also facilitates the development of high-performing, fault-tolerant applications.

#### Building an Actor with Tokio

Creating an actor in Rust involves two primary steps:

**1. Spawning a Tokio Task:** Each actor lives in its [tokio task], allowing concurrent execution across
available system threads.

**2. Handling Messages Through a Channel:** Actors receive messages via a
[mpsc] (multi-producer, single-consumer) channel, processing each in turn.

Here's a quick look at what setting up an actor might involve:

```rust
struct CounterActor {
    count: i32,
}

impl CounterActor {
    fn start(self) -> mpsc::Sender<i32> {
        let (tx, mut rx) = mpsc::unbounded_channel();
        tokio::spawn(async move {
            while let Some(amount) = rx.recv().await {
                self.count += amount;
            }
        });

        tx
    }
}
```

To interact with this actor, you'd send messages using the [mpsc::Sender] returned by `CounterActor::start`.

Wondering about receiving replies? Enter the [oneshot] channel, perfect for single message exchanges.
By pairing each message with a new oneshot channel, actors can easily send responses back.

```rust
async fn send(tx: &mpsc::Sender<(i32, oneshot::Sender<i32>)>, msg: i32) -> Result<i32, RecvError> {
    let (reply_tx, reply_rx) = oneshot::channel();
    tx.send((msg, reply_tx)).await?;
    reply_rx.await
}

// ... tokio::spawn ...
while let Some((amount, reply)) = rx.recv().await {
    self.count += amount;
    reply.send(self.count);
}
```

This setup not only facilitates efficient message passing but also ensures our actors can reply directly,
making our systems more interactive and responsive.

#### Upgrading to Handle Diverse Message Types

Initially, our actor setup could only deal with `i32` messages. While using an enum for different message
types seems like an obvious solution, it introduces limitations, especially when involving oneshot
channels for responses. This method hampers the developer experience and restricts message reuse across actors.

Rust offers a more elegant solution through trait objects, enabling any type to serve as a message.
This approach enhances flexibility and reuse without compromising on type safety.

```rust
trait Message<T> {
    type Reply;
    fn handle(&mut self, msg: T) -> Self::Reply;
}
```

Implementing this trait allows any struct to become a message:

```rust
struct Inc { amount: i32 }

impl Message<Inc> for CounterActor {
    type Reply = i32;
    fn handle(&mut self, msg: Inc) -> Self::Reply {
        self.count += msg.amount;
        self.count
    }
}
```

Transitioning to `Box<dyn Message<Inc>>` in our channel simplifies message handling but introduces
a challenge with Rust’s trait object restrictions regarding the `Reply` type. Rust wont let us use `dyn Message<A>`
without specifying the `Reply` type in the trait with `dyn Message<A, Reply = ...>`. Additionally, the first generic
stores the message type, when we need the actor type instead.

We circumvent this by introducing a `DynMessage` trait, converting replies into a `Box<dyn Any>`,
sidestepping the issue:

```rust
pub(crate) trait DynMessage<A> {
    fn handle_dyn(self: Box<Self>, state: &mut A) -> Box<dyn Any>;
}

impl<A: Message<T>, T> DynMessage<A> for M {
    fn handle_dyn(self: Box<Self>, state: &mut A) -> Box<dyn Any> {
        Box::new(state.handle(*self))
    }
}
```

With this setup, our actor can now process messages as `Box<dyn DynMessage>` and return replies as `Box<dyn Any>`,
which we can downcast to the expected type:

```rust
async fn send<A, M>(
    tx: &mpsc::Sender<(
        Box<dyn DynMessage<A>>,
        oneshot::Sender<Box<dyn Any>>
    )>,
    msg: M
) -> Result<M::Reply, RecvError> {
    let (reply_tx, reply_rx) = oneshot::channel();
    tx.send((Box::new(msg), reply_tx)).await?;
    let any_reply: Box<dyn Any> = reply_rx.await?;
    Ok(*any_reply.downcast().unwrap()) 
}

// ... tokio::spawn ...
while let Some((msg, reply)) = rx.recv().await {
    let value: Box<dyn Any> = msg.handle_dyn(&mut self);
    reply.send(value);
}
```

This method enhances our actor model's versatility, allowing for a dynamic range of message types without
sacrificing Rust's type safety and performance benefits.


### Introducing Kameo: Elevating Actors in Rust

Building upon the versatility and robustness of the actor model we've explored,
Kameo is our advanced Rust library designed to implement actors with an eye towards simplicity and efficiency.
Kameo encapsulates the principles discussed, extending them with a suite of polished features that cater
to real-world application needs:

- **Async Support:** Async code with async traits.
- **Lifecycle Hooks:** Callbacks for managing the lifecycle of an actor.
- **Links Between Actors:** Create links between actors, stopping one if another is killed.
- **Concurrent Queries:** Query the actor concurrently without waiting for other queries to process.
- **Panic Safety:** Actor panics are contained and managed, maintaining system stability.

What sets Kameo apart is its commitment to Rust's type safety and performance, all while offering an API that
feels native to Rust developers.
There's no reliance on complex macros or obscure type gymnastics; just pure, idiomatic Rust.

Kameo's message definition and handling mirror the simplicity and power of the actor model discussed earlier.
Here’s a sneak peek at how effortlessly you can define and interact with actors in Kameo:

```rust
// Define the actor state
struct Counter {
  count: i64,
}

impl Actor for Counter {}

// Define messages
struct Inc(u32);

impl Message<Inc> for Counter {
    type Reply = i64;

    async fn handle(&mut self, msg: Inc) -> Self::Reply {
        self.count += msg.0 as i64;
        Ok(self.count)
    }
}

#[tokio::main]
async fn main() -> Result<(), SendError> {
    let counter_ref = Counter { count: 0 }.start();

    let count = counter_ref.send(Inc(10)).await?;
    assert_eq!(count, 10);

    Ok(())
}
```

Check kameo out on Github <https://github.com/tqwewe/kameo>, and drop a star if you've enjoyed this blog post!

Feel free to reach out with any thoughts or feedback about this approach.

[tokio task]: https://docs.rs/tokio/latest/tokio/task/index.html
[mpsc]: https://docs.rs/tokio/latest/tokio/sync/mpsc/index.html
[mpsc::Sender]: https://docs.rs/tokio/latest/tokio/sync/mpsc/struct.Sender.html
[oneshot]: https://docs.rs/tokio/latest/tokio/sync/oneshot/index.html
