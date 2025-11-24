+++
title = "Building an Event-Sourcing Application in Rust with SierraDB"
description = "A practical guide to event sourcing in Rust, from defining aggregates to persisting events and rebuilding state with SierraDB."
date = 2025-11-20
draft = false
template = "blog/page.html"
+++

## Introduction

In this guide, we'll learn how to build a collaborative task board using event-sourcing with Rust and [SierraDB]. We'll keep things as simple as possible, and build our app using a single `Task` aggregate with three basic events: `TaskCreated`, `TaskAssigned`, `TaskCompleted`.

This guide assumes a basic understanding of Rust, and event sourcing, and is focused on showing how to use SierraDB as an event store.

[SierraDB]: https://sierradb.io

## Initializing SierraDB

SierraDB can be ran locally with docker:

```bash
docker run -p 9090:9090 tqwewe/sierradb
```

SierraDB uses the Redis RESP3 protocol, which means you can use standard Redis clients to interact with it. This makes integration straightforward, as you'll see shortly.

## Project Setup

Let's start by creating a new Rust project. We'll build this in three progressive steps, each adding more functionality. For our first step, create a new project:

```bash
cargo new task-app
cd task-app
```

Add the initial dependency to `Cargo.toml`:

```toml
[dependencies]
anyhow = "1.0"
```

As we progress through the tutorial, we'll add more dependencies for async operations and SierraDB integration.

## Part 1: Defining the Aggregate

In event sourcing, an **aggregate** is an entity that maintains its state by applying events. The aggregate ensures consistency and encapsulates business logic. Let's define our `Task` aggregate.

### The Task Struct

Our `Task` aggregate tracks the state of a single task:

```rust
#[derive(Default)]
pub struct Task {
    pub id: u32,

    // State
    pub created: bool,
    pub title: String,
    pub assigned_to: Option<String>,
    pub completed: bool,
}

impl Task {
    pub fn new(id: u32) -> Self {
        Task {
            id,
            ..Default::default()
        }
    }
}
```

The aggregate holds the current state of the task - whether it's been created, who it's assigned to, and whether it's completed.

### Defining Events

Events represent things that have happened to the task. Each event is immutable and describes a state change:

```rust
pub enum TaskEvent {
    TaskCreated { title: String },
    TaskAssigned { assignee: String },
    TaskCompleted {},
}
```

### Commands and Validation

Commands validate the current state and generate events. They enforce business rules without directly mutating state:

```rust
impl Task {
    pub fn create(&self, title: String) -> Result<TaskEvent> {
        if self.created {
            bail!("task already created");
        }

        Ok(TaskEvent::TaskCreated { title })
    }

    pub fn assign(&self, assignee: String) -> Result<TaskEvent> {
        if self.assigned_to.as_ref() == Some(&assignee) {
            bail!("task already assigned to {assignee}");
        }

        Ok(TaskEvent::TaskAssigned { assignee })
    }

    pub fn complete(&self) -> Result<TaskEvent> {
        if self.completed {
            bail!("task already completed");
        }

        Ok(TaskEvent::TaskCompleted {})
    }
}
```

Each command checks if the operation is valid given the current state. If valid, it returns an event; otherwise, it returns an error.

### Applying Events

The `apply` method is where state mutations happen. It takes an event and updates the aggregate's state accordingly:

```rust
impl Task {
    pub fn apply(&mut self, event: TaskEvent) {
        use TaskEvent::*;

        match event {
            TaskCreated { title } => {
                self.created = true;
                self.title = title;
            }
            TaskAssigned { assignee } => {
                self.assigned_to = Some(assignee);
            }
            TaskCompleted {} => {
                self.completed = true;
            }
        }
    }
}
```

This separation between commands (which validate) and apply (which mutates) is a key pattern in event sourcing. Commands can fail, but applying events never does - events represent facts that have already occurred.

### Testing the Pattern

Here's how you use the aggregate:

```rust
fn main() -> Result<()> {
    let mut task = Task::new(0);

    // Create the task
    let event = task.create("My Board".to_string())?;
    task.apply(event);

    // Assign the task
    let event = task.assign("tqwewe".to_string())?;
    task.apply(event);

    // Mark task as completed
    let event = task.complete()?;
    task.apply(event);

    Ok(())
}
```

At this point, our events are only stored in memory. Let's fix that by persisting them to SierraDB.

## Part 2: Persisting Events

Now we'll extend our aggregate to persist events to SierraDB. This involves connecting to the database and using the `EAPPEND` command to append events to a stream.

### Adding Dependencies

Update your `Cargo.toml` to include async and database dependencies:

```toml
[dependencies]
anyhow = "1.0"
redis = "0.32"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
sierradb-client = "0.1"
tokio = { version = "1.48", features = ["full"] }
```

### Versioning and Optimistic Locking

In a distributed system, multiple processes might try to modify the same aggregate concurrently. SierraDB uses **optimistic locking** with version numbers to handle this. We add a `version` field to track the aggregate's current version:

```rust
use sierradb_client::CurrentVersion;

#[derive(Default)]
pub struct Task {
    pub id: u32,
    pub version: CurrentVersion, // Added for concurrency control

    // State (unchanged)
    pub created: bool,
    // ... rest of fields
}
```

`CurrentVersion` is an enum from the SierraDB client that represents either an initial state or a specific version number. It provides methods like `next()` to calculate the expected version for the next event.

### Updating the Apply Method

We modify `apply` to track versions and ensure events are applied sequentially:

```rust
pub fn apply(&mut self, event: TaskEvent, version: u64) {
    use TaskEvent::*;

    assert_eq!(
        self.version.next(),
        version,
        "versions should be sequential"
    );
    self.version = CurrentVersion::Current(version);

    // Match statement unchanged
    match event {
        // ... same as before
    }
}
```

This ensures that events are applied in the correct order and prevents version conflicts.

### Serializing Events

Events need to be serialized for storage. We add `Serialize` to `TaskEvent` and create a method to extract event names:

```rust
use serde::Serialize;

#[derive(Serialize)]
pub enum TaskEvent {
    TaskCreated { /* ... */ },
    TaskAssigned { /* ... */ },
    TaskCompleted {},
}

impl TaskEvent {
    pub fn name(&self) -> &'static str {
        use TaskEvent::*;
        match self {
            TaskCreated { .. } => "TaskCreated",
            TaskAssigned { .. } => "TaskAssigned",
            TaskCompleted { .. } => "TaskCompleted",
        }
    }
}
```

SierraDB stores the event name separately from the payload, which allows for efficient querying and filtering by event type.

### The Append Method

Here's where we actually persist events to SierraDB:

```rust
use redis::aio::MultiplexedConnection;
use sierradb_client::{AppendInfo, AsyncTypedCommands, EAppendOptions};

impl Task {
    pub fn stream_id(&self) -> String {
        format!("task-{}", self.id)
    }

    pub async fn append(&self, conn: &mut MultiplexedConnection, event: &TaskEvent) -> Result<AppendInfo> {
        let payload = serde_json::to_vec(event)?;
        let opts = EAppendOptions::new()
            .expected_version(self.version.as_expected_version())
            .payload(payload);
        let append = conn.eappend(self.stream_id(), event.name(), opts).await?;

        Ok(append)
    }
}
```

Let's break this down:

- **Stream ID**: Each aggregate gets its own event stream. We use `task-{id}` as the stream identifier
- **EAPPEND**: The SierraDB command for appending events. It takes the stream ID, event name, and options
- **Expected Version**: This is the key to optimistic locking. We tell SierraDB what version we expect the stream to be at. If another process has modified the stream, our append will fail
- **Payload**: The serialized event data in JSON format

### Connecting and Using the Database

Now we can connect to SierraDB and persist events:

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let client = redis::Client::open("redis://127.0.0.1:9090?protocol=resp3")?;
    let mut conn = client.get_multiplexed_async_connection().await?;

    let mut task = Task::new(0);

    // Create the task
    let event = task.create("My Board".to_string())?;
    let append = task.append(&mut conn, &event).await?; // Persist to SierraDB
    task.apply(event, append.stream_version);           // Update in-memory state

    // Assign the task
    let event = task.assign("tqwewe".to_string())?;
    let append = task.append(&mut conn, &event).await?;
    task.apply(event, append.stream_version);

    // Mark task as completed
    let event = task.complete()?;
    let append = task.append(&mut conn, &event).await?;
    task.apply(event, append.stream_version);

    Ok(())
}
```

Note the workflow: **validate → append → apply**. We first validate and create the event, then persist it, then apply it to our in-memory state. The version numbers (0, 1, 2) represent the stream version for each event.

### Inspecting Events

You can use `redis-cli` to inspect the events stored in SierraDB:

```bash
redis-cli -p 9090
127.0.0.1:9090> ESCAN task-0 - +
```

This shows all events with their metadata, including transaction IDs, timestamps, stream versions, and payloads. The `-` means "start from the beginning" and `+` means "to the end".

Alternatively, you can use [sierradb-inspector] to view events through the Web UI.

```bash
docker run -p 3001:3001 --network host -e SIERRADB_URL=redis://127.0.0.1:9090 tqwewe/sierradb-inspector
```

And visit <a href="http://localhost:3001/streams?streamId=task-0" target="_blank">http://localhost:3001/streams?streamId=task-0</a> in your browser.

![Task 0 Stream Events](/sierradb-inspector-task-0-stream.png)

[sierradb-inspector]: https://github.com/sierra-db/sierradb-inspector

## Part 3: Loading Aggregate State

The real power of event sourcing is that you can rebuild an aggregate's state by replaying its events. Let's implement a `load` method to reconstruct a task from its event stream.

### Adding Deserialization

First, add `Deserialize` to `TaskEvent`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub enum TaskEvent {
    // ... unchanged
}
```

### The Load Method

Here's how we load and rebuild an aggregate:

```rust
impl Task {
    pub async fn load(&mut self, conn: &mut MultiplexedConnection) -> Result<()> {
        let stream_id = self.stream_id();

        loop {
            // Load events in batches of 100
            let batch = conn
                .escan(&stream_id, self.version.next(), None, Some(100))
                .await?;

            // Apply the events to the Task aggregate
            for event in batch.events {
                let task_event = serde_json::from_slice(&event.payload)?;
                self.apply(task_event, event.stream_version);
            }

            // If there's no more events, break
            if !batch.has_more {
                break;
            }
        }

        Ok(())
    }
}
```

This method:

1. Uses `ESCAN` to read events from SierraDB in batches
2. Deserializes each event from JSON
3. Applies each event in order, rebuilding the state
4. Continues until all events have been processed

The batching is important for performance with large event streams. SierraDB's `has_more` flag tells us when we've read all events.

### Complete Event Sourcing Cycle

Now we can demonstrate the full cycle - persist events, then load them back:

```rust
#[tokio::main]
async fn main() -> Result<()> {
    let client = redis::Client::open("redis://127.0.0.1:9090?protocol=resp3")?;
    let mut conn = client.get_multiplexed_async_connection().await?;

    let mut task = Task::new(0);
    task.load(&mut conn).await?;

    // Create and persist events
    let event = task.create("My Board".to_string())?;
    task.append(&mut conn, &event).await?;
    task.apply(event, 0);

    let event = task.assign("tqwewe".to_string())?;
    task.append(&mut conn, &event).await?;
    task.apply(event, 1);

    let event = task.complete()?;
    task.append(&mut conn, &event).await?;
    task.apply(event, 2);

    // Load the task again from events
    let mut task2 = Task::new(0);
    task2.load(&mut conn).await?;
    assert_eq!(
        task2.version,
        CurrentVersion::Current(2),
        "Loaded task should have the correct version"
    );

    Ok(())
}
```

The assertion verifies that the loaded task has the correct version, proving that all events were successfully replayed.

## Conclusion

We've built a working event-sourcing application in Rust with SierraDB! Let's recap what we covered:

1. **Defined an aggregate** with clear separation between commands (validation) and apply (mutation)
2. **Persisted events** to SierraDB using the `EAPPEND` command with optimistic locking
3. **Loaded aggregate state** by replaying events from the event store using `ESCAN`

This foundation gives you everything you need to build event-sourced applications. Some next steps you might explore:

- **Subscriptions**: Listen to event streams in real-time as new events are appended
- **Projections**: Build read models by subscribing to events and maintaining denormalized views
- **Snapshots**: Optimize loading by creating periodic snapshots of aggregate state
- **Sagas**: Coordinate multiple aggregates with long-running business processes

For more information about SierraDB's features and API, check out the documentation at [sierradb.io](https://sierradb.io).

Happy event sourcing!
