//! Server-side search SDK. Provider calls require explicitly supplied credentials.
//! Normalized search, native operations, and application gateway v1 are separate APIs.
#![forbid(unsafe_code)]
pub mod error;
pub mod gateway;
pub mod native;
pub mod normalized;
pub mod transport;
pub mod types;
pub use error::{Error, ErrorCode, Result};
pub use gateway::Gateway;
pub use normalized::{Provider, ProviderId, SearchClient};
pub use transport::{CallOptions, CancellationToken, ClientConfig, RetryPolicy};
pub use types::*;
