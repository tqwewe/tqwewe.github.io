+++
title = "Comparing Rust Actor Libraries: Actix, Coerce, Kameo, Ractor, and Xtra"
description = "A Comprehensive Performance and Feature Comparison of Five Leading Rust Actor Libraries."
date = 2025-01-17
draft = false
template = "blog/page.html"
+++

## Introduction

Rust’s actor ecosystem is flourishing with multiple libraries offering unique approaches to concurrency and distributed system design. This post shares the results of a benchmarking study comparing the performance and features of five popular Rust actor libraries:

- [**Actix**]
- [**Coerce**]
- [**Kameo**]
- [**Ractor**]
- [**Xtra**]

[**Actix**]: https://github.com/actix/actix
[**Coerce**]: https://github.com/LeonHartley/Coerce-rs
[**Kameo**]: https://github.com/tqwewe/kameo
[**Ractor**]: https://github.com/slawlor/ractor
[**Xtra**]: https://github.com/Restioson/xtra

### Why Benchmark These Libraries?

The primary objective is to evaluate **throughput** and **latency** under realistic workloads. By assessing message passing efficiency and actor creation speed, we can better understand the trade-offs each library makes. Although each library caters to different use cases (e.g., distributed environments, supervision, etc.), this benchmarking study provides a starting point for developers choosing an actor library in Rust.

## Benchmarking Overview

### Libraries Compared

Below are the latest stable releases of the libraries tested:

1. **Actix** – A mature framework that uses its own runtime (“Actix runtime”) which is built on Tokio.
2. **Coerce** – Built atop Tokio, offering distributed actors  
3. **Kameo** – Also uses Tokio, focusing on both local and distributed scenarios  
4. **Ractor** – Relies on Tokio with custom patterns for distribution and fault tolerance  
5. **Xtra** – Supports multiple runtimes (Async Std, Smol, Tokio, Wasm Bindgen)

### Hardware & Software Setup

- **Machine**: MacBook Pro (2.4 GHz 8-Core Intel Core i9, 32 GB memory)  
- **Rust**: 1.84.0  
- **Benchmarking Tool**: [Criterion.rs](https://bheisler.github.io/criterion.rs/book/index.html)

### Goals & Metrics

1. **Messaging Throughput & Latency**  
   - This involves “tell requests” (fire-and-forget) to 100 spawned actors in a round-robin fashion.  
   - Measure how quickly the system processes a specified number of messages.

2. **Actor Creation Speed**  
   - Measure how quickly each library can spawn and initialize a set of actors.

3. **Additional Criteria**  
   - **Runtime Used**: Does the library rely on Tokio, a custom runtime, or another option?  
   - **Fault Tolerance & Distributed Communication**: Not benchmarked, but compared with eachother in the feature comparison table.

### Fairness & Transparency

Despite being the author of kameo, all libraries were benchmarked using their default configurations. No library received special optimizations.
The complete benchmark code is open-sourced at:

> [**GitHub – tqwewe/actor-benchmarks**](https://github.com/tqwewe/actor-benchmarks)

---

## Feature Comparison

Below is a high-level overview of each library’s capabilities, including mailbox configurations, supervision, and distributed actors:

| **Feature**                    | **Actix** | **Coerce** | **Kameo** | **Ractor** | **Xtra**                                |
|--------------------------------|----------:|-----------:|----------:|-----------:|-----------------------------------------:|
| Bounded Mailboxes              |     ✅    |     ❌     |     ✅    |     ❌     |     ✅                                  |
| Unbounded Mailboxes            |     ❌    |     ✅     |     ✅    |     ✅     |     ✅                                  |
| Ask Requests (Message + Reply) |     ✅    |     ✅     |     ✅    |     ✅     |     ✅                                  |
| Tell Requests (Fire and Forget)|     ✅    |     ✅     |     ✅    |     ✅     |     ✅                                  |
| Supervision                    |     ✅    |     ✅     |     ✅    |     ✅     |     ❌                                  |
| Distributed Actors             |     ❌    |     ✅     |     ✅    |     ✅     |     ❌                                  |
| Runtime Used                   |   Actix   |   Tokio    |   Tokio   |   Tokio    | Async Std<br/>Smol<br/>Tokio<br/>Wasm Bindgen |
| Latest Release                 |  Jun, 2024 |  Oct, 2023 |  Jan, 2025 |  Jan, 2025 |  Feb, 2024                              |

---

## Benchmark Scenarios

1. **Message Passing Efficiency**  
   - **Scenario**: Spawn 100 actors, send a round-robin series of “tell requests” (fire-and-forget) to each actor, and measure the time per message.  
   - **Rationale**: This test more realistically simulates real-world concurrency than sending messages to a single actor.

2. **Actor Creation Speed**  
   - **Scenario**: Measure the time to spawn a batch of actors.  
   - **Rationale**: Certain applications may dynamically scale the number of actors based on load, making spawn time a crucial factor.

3. **Fault Tolerance & Distributed Communication**  
   - **Scenario**: Reviewed capabilities and performance, but not graphed.  
   - **Rationale**: Some libraries focus heavily on distribution (Coerce, Kameo, Ractor), while others (Actix, Xtra) prioritize simpler local concurrency or user flexibility with different runtimes.

---

## Benchmark Results

### Messaging Time per Request

![Actor Message Time Comparison Graph](/actor-message-time-comparison.png)

- **Actix**: Provides the fastest messaging speeds, benefiting from its runtime and internal optimizations.  
- **Coerce**, **Kameo**, **Ractor**: Provides very similar performance for messaging.
- **Xtra**: Performance can vary slightly depending on which runtime is chosen (Tokio, Async Std, etc.).
  But for tokio, the results are very similar to the other three libraries.

### Actor Spawn Time

![Actor Spawn Time Comparison Graph](/actor-spawn-time-comparison.png)

- **Actix**: Fastest actor spawning.
- **Coerce**: Highest actor spawning time, possibly due to additional features.
- **Kameo**: Comparable to other Tokio-based libraries, maintaining a good balance of features.
- **Ractor**: Stays close to Kameo’s performance in actor creation.
- **Xtra**: Spawns quickly, though the chosen runtime can affect results. This benchmark uses tokio.

---

## Observations and Trade-Offs

1. **Bounded vs. Unbounded Mailboxes**  
   - Some libraries only support one type of mailbox, while others support both.

2. **Fault Tolerance & Distributed Communication**  
   - **Kameo**, **Coerce**, and **Ractor** include built-in distribution features.  
   - **Actix** can be extended with external crates for distributed capabilities but doesn’t ship them by default.  
   - **Xtra** supports only local concurrency with no distributed capabilities.

3. **Runtime Considerations**  
   - Most libraries rely on **Tokio** for concurrency, except **Actix** which uses a runtime built on tokio, and **Xtra** which has a choice of runtime.
   - If your project is heavily invested in Tokio-based tooling, libraries like **Coerce**, **Kameo**, and **Ractor** may integrate more seamlessly.

4. **Real-World Use Cases**  
   - While these benchmarks provide valuable insights, real-world performance may differ.  
   - Users are encouraged to prototype and measure within their specific application context.

---

## Conclusion

Choosing the right actor library in Rust depends on factors like mailbox type, performance requirements, runtime integration, and whether you need out-of-the-box distribution. Here’s a concise summary:

- **Actix** excels at local concurrency, offering robust documentation and fast actor creation.
  However its async support is an afterthought, and not the smoothest experience when compared to other actor libraries. 
- **Coerce** is specialized for distributed systems on top of Tokio.  
- **Kameo** balances local and distributed needs with solid performance, easy-to-use APIs, and supervision built-in.
- **Ractor** is another viable choice for distributed actor systems with a simpler design.
  However, it is the only library which only supports a single message type per actor, encouraging the use of enum messages, which may not be desirable for some.
- **Xtra** provides flexible runtime options and is well-suited for projects seeking a more minimal actor framework.

Ultimately, the **best** library for your project will depend on your exact requirements.
If you need straightforward concurrency, **Actix** or **Xtra** might suffice. If you need built-in distribution without much extra configuration, **Kameo**, **Coerce**, or **Ractor** may be more appealing.

---

## Access the Full Benchmark Suite

All benchmark code, configurations, and raw results are open-sourced:
  
> **[GitHub – tqwewe/actor-benchmarks](https://github.com/tqwewe/actor-benchmarks)**

Please feel free to clone, run, and submit pull requests. Community contributions are welcome and encouraged.

## Next Steps & Community Feedback

- **Try It Out**: Test each actor library within your own environment or workload.  
- **Contribute**: PRs to enhance the benchmark suite or to optimize any library configurations are very welcome.  
- **Discuss**: Share your findings, experiences, and questions in the Rust community (e.g., [Reddit](https://www.reddit.com/r/rust/), [Discord](https://discord.gg/rust-lang), [GitHub Discussions](https://github.com/rust-lang/rust/discussions)), alternatively feel free to share findings in the comments of this blog.

---

### Final Thoughts

These benchmarks represent a snapshot of the Rust actor ecosystem as of early 2025. Libraries continue to evolve, and performance may improve over time. If you’re seeking a flexible, scalable, and fault-tolerant actor framework, as the author of **Kameo**, I genuienly think is one of the top choices for new apps—particularly if you value built-in distributed functionality and strong integration with Tokio.
However, every library in this comparison has its merits, and the “best” one ultimately depends on your project’s unique needs.

Thank you for reading, and happy building with Rust actors!
