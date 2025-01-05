+++
title = "Building a Rust-Powered Event Store from Scratch: Meet Eventus"
description = "An introduction to Eventus, a custom Rust-based event store designed for high-performance and simplicity. Learn how segmented files, global indices, and stream indices work together to offer a streamlined alternative to conventional databases."
date = 2025-01-04
draft = false
template = "blog/page.html"

[extra]
lead = "An introduction to Eventus, a custom Rust-based event store designed for high-performance and simplicity."
+++

## Introduction: Why Build a Custom Event Store?
Event sourcing revolves around capturing changes to an application’s state as a sequence of immutable events. While it’s possible to use off-the-shelf databases like Postgres or traditional event stores for this, they aren’t naturally optimized for an append-only flow. That’s where Eventus comes in. By designing a store specifically for event sourcing, we can optimize for writes and simplify the process of retrieving events in sequence.

The core challenge with conventional databases is that they’re built for more general CRUD-like operations, where records are added, updated, or removed frequently. In event sourcing, data is never actually overwritten; events are recorded in the order they occur. This is inherently sequential, so a specialized database can take advantage of predictable I/O patterns to deliver more consistent performance, even when data volumes grow large.

## Eventus at a Glance: Inspiration and Core Goals
Eventus was built from a desire to have a lean, high-performance event store that exploits the sequential and immutable nature of event sourcing. Many existing solutions rely on general-purpose databases or are tightly coupled to languages like C# or Java. Eventus takes a more minimalistic approach:

- It stores and indexes events as they come in, without the overhead of features not needed in an event-sourcing model.  
- It aims for constant-time writes (O(1)) by appending data in segmented files.  
- It maintains simpler, more direct indexing for retrieving events by global ID or stream ID.

By focusing on event sourcing rather than broader use cases, Eventus avoids the complexity found in traditional relational databases or fully-fledged event store products that may include extra functionalities you don’t necessarily need.

## Why Rust? Performance and Safety Benefits
Rust provides a set of features that make it uniquely suitable for building databases. First, it offers memory safety without a garbage collector, which helps avoid many concurrency pitfalls and performance penalties. Rust’s zero-cost abstractions let you write low-level, high-performance code while maintaining a clean, maintainable architecture. This is crucial when dealing with large-scale read and write operations, where even small inefficiencies can add up quickly.

Moreover, Rust’s ecosystem includes libraries for serialization (like MessagePack), concurrency, and networking (for the optional gRPC layer), making it an excellent toolchain for building a modern database from the ground up.

## Core Architecture: Segmented Files, Global Index, and Stream Index
Eventus’s architecture is guided by a very straightforward principle: store events sequentially and track them with lightweight indexes. Here’s how it works:

- **Segmented Files**
  <img alt="Events Table" src="/events-table.png" style="margin: 0.2rem 0 0.5rem 0">
  Each file, or “segment,” can contain up to 256,000 events. When one segment fills up, Eventus rolls over to a new segment. This segmentation keeps file sizes predictable and simplifies certain maintenance tasks (like re-indexing).  

- **Global Index** 
  <img alt="Index Table" src="/index-table.png" style="margin: 0.2rem 0 0.5rem 0">
  Alongside each segment is a global index file. It contains pairs of `(offset, position)` for every event in that segment. This lets you quickly jump to the event data in the segment file without scanning through each record.

- **Stream Index**
  <img alt="Stream Index Table" src="/stream-index-table.png" style="margin: 0.2rem 0 0.5rem 0">
  Each segment also has a stream index, which uses a fixed-size hashmap on disk to associate stream IDs with a list of event IDs. This allows efficient retrieval of all events belonging to a given stream, again without needing a full scan.

By separating the data layer (the .events file) from the indexing layers, Eventus can be more resilient if an index becomes corrupted or needs to be rebuilt. The segmented approach also means writes remain constant-time, as each new event is appended at the end.

## Data Format and Serialization Details
Every event is written in a compact binary format:

| Bytes | Encoding          | Field         |
| ----- | ----------------- | ------------- |
| 0-7   | Little Endian u64 | Offset        |
| 8-11  | Little Endian u32 | Payload Size  |
| 12-15 | Little Endian u32 | CRC32C        |
| 16-17 | Little Endian u16 | Record Type   |
| 18-25 | Little Endian u64 | TransactionID |
| 26+   | Bytes             | Payload       |

Inside the `Payload` section, Eventus uses MessagePack to serialize an `Event` struct that includes fields like event ID, stream ID, event name, and metadata. This structure keeps the core data needed for event sourcing small and quickly readable.

## Reliability: Rehydration, CRC Checks, and Single-Writer Approach

One of the biggest concerns for any database is ensuring data integrity. In Eventus, CRC32C checks are used to verify the integrity of each event on disk. If a file becomes corrupted, the software can detect it as soon as it attempts to read the affected event.

### First-Class Transactions

Eventus treats transactions as first-class citizens, ensuring that every event or group of events is part of a transaction. Each event message is associated with a `transaction_id` (a `u64`), which uniquely identifies the transaction it belongs to. Here's how transactions are managed:

- **Transaction Association**: Every event is tagged with a `transaction_id`. This allows Eventus to group related events together, ensuring they are processed atomically.
  
- **Commit Markers**: After a transaction is committed, a special commit message with the same `transaction_id` but no payload is written to the event store. This commit marker signifies that all events associated with that transaction are finalized and should be considered valid.
  
- **Handling Uncommitted Events**: Any events that are read which are not committed (events not followed by a commit message with that transaction) will simply be ignored and considered uncommitted. In practice however, uncommited events would never typically be even written to in the first place.

### Rehydration and Single-Writer Approach

Eventus uses rehydration at startup to rebuild its index files if they’re missing or out of date. This is possible because the underlying `.events` file is the single source of truth—its immutable sequence of events can always be scanned.

Additionally, Eventus adopts a single-writer approach for appending new events. This design simplifies concurrency control, removes the need for complex locking, and guarantees events remain in the correct order as they arrive.

By integrating transactions directly into the event handling process, Eventus ensures that the event store remains consistent and reliable, even in the face of failures or unexpected interruptions.

## Performance: O(1) Writes and Scalable Reads
By writing events in an append-only fashion, Eventus ensures that each new event is appended to the tail of the current segment. The index files are updated accordingly right after the event is written. This mechanism allows writes to remain O(1)—they don’t slow down as data grows, because no large-scale rearranging or row locks are required.

Read operations benefit from the streamlined indexes:  
- The global index points you directly to an event offset.  
- The stream index quickly returns all event IDs for any given stream.  

In systems where reads can be further optimized with caching or partial in-memory indexes, this approach provides enough flexibility to scale while keeping the core logic simple.

## Current State and Real-World Use Cases
Although Eventus hasn’t officially launched yet, it’s already powering a startup I’ve been building, serving as the backbone for a high-throughput event-sourced application. Because it focuses on essential event-store features—fast writes, sequential storage, and efficient indexing—Eventus fits nicely into any system where append-only data is key. Teams that prioritize Rust’s performance, or those seeking an alternative to C#/Java-based solutions, may find Eventus especially compelling.

## Roadmap: Horizontal Scaling, Monitoring, and More
Eventus is still growing, with exciting plans for the future:

- **Horizontal Scalability**  
  Distributing writes across multiple nodes is a challenging undertaking, but it would open up new levels of throughput and fault tolerance.

- **Monitoring and Queryability**  
  Building a foreign data wrapper or integration with tools like Supabase could make it easier to query events directly and monitor database health in real time.

- **Backup and Archival Strategies**  
  As more features are added, handling older segments through compression or off-site storage will become a priority.

For now, the focus remains on strong single-node performance and reliability.

## Conclusion: Next Steps and Final Thoughts

Eventus was born out of a need for a specialized, Rust-powered event store that embraces immutability and sequential data. By focusing on the essentials—segmented storage, efficient indexing, and O(1) writes—Eventus offers a lean alternative to more bloated or general-purpose databases. Its Rust foundation delivers both performance and reliability, making it an attractive option for developers prioritizing these aspects.

Currently, Eventus is available on [GitHub](https://github.com/tqwewe/eventus). While it’s a robust and stable solution, it comes with **pretty much zero documentation**. This is something I'd love to improve given free time, and I welcome any feedback or contributions from the community to help build out comprehensive guides and examples.

With future improvements like horizontal scaling on the horizon, there’s plenty of potential for expansion. If you’re building event-sourced systems and want a performance-oriented approach with a Rust backbone, Eventus might be worth keeping on your radar. Stay tuned for more updates, and feel free to check out the repository to get involved early!
